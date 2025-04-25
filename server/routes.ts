import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { setupAuth, hashPassword, comparePasswords } from "./auth";
import { setupStripe, verifySubscriptionStatus } from "./stripe";
import { insertFormSchema, insertResponseSchema, insertSupportEnquirySchema, FormElement } from "@shared/schema";
import { requirePaidPlan, checkPlanLimits } from "./middleware/subscription-guard";

// Utility functions for premium features
function groupResponsesByDate(responses: any[]) {
  const grouped: Record<string, number> = {};
  
  responses.forEach(response => {
    const date = new Date(response.createdAt).toISOString().split('T')[0];
    grouped[date] = (grouped[date] || 0) + 1;
  });
  
  return Object.entries(grouped).map(([date, count]) => ({ date, count }));
}

function calculateCompletionRate(responses: any[], form: any) {
  // Calculate what percentage of responses filled out all fields
  if (!responses.length) return 0;
  
  const formElements = form.elements || [];
  const totalFields = formElements.length;
  
  if (totalFields === 0) return 100; // No fields to complete
  
  let completeResponses = 0;
  
  responses.forEach(response => {
    const responseData = response.data || {};
    const filledFields = Object.keys(responseData).length;
    
    if (filledFields === totalFields) {
      completeResponses++;
    }
  });
  
  return Math.round((completeResponses / responses.length) * 100);
}

function calculateAverageCompletionTime(responses: any[]) {
  // This is a placeholder since we don't track completion time
  // In a real implementation, this would use actual timing data
  return "3m 24s";
}

function generateFieldAnalytics(responses: any[], form: any) {
  const formElements = form.elements || [];
  const fieldAnalytics: Record<string, any> = {};
  
  formElements.forEach((element: FormElement) => {
    const fieldId = element.id;
    const fieldType = element.type;
    
    if (!fieldId) return;
    
    // Count how many responses filled this field
    let filledCount = 0;
    const values: any[] = [];
    
    responses.forEach(response => {
      const responseData = response.data || {};
      if (responseData[fieldId] !== undefined) {
        filledCount++;
        values.push(responseData[fieldId]);
      }
    });
    
    const completionRate = responses.length 
      ? Math.round((filledCount / responses.length) * 100) 
      : 0;
    
    fieldAnalytics[fieldId] = {
      type: fieldType,
      label: element.label || fieldId,
      completionRate,
      responseCount: filledCount,
      // Add field-specific analytics based on type
      ...(fieldType === 'select' || fieldType === 'radio' 
        ? { valueDistribution: calculateValueDistribution(values) }
        : {})
    };
  });
  
  return fieldAnalytics;
}

function calculateValueDistribution(values: any[]) {
  const distribution: Record<string, number> = {};
  
  values.forEach(value => {
    const key = String(value);
    distribution[key] = (distribution[key] || 0) + 1;
  });
  
  return Object.entries(distribution).map(([value, count]) => ({ 
    value, 
    count,
    percentage: Math.round((count / values.length) * 100)
  }));
}

function generateCSV(responses: any[], form: any) {
  const formElements = form.elements || [];
  
  // Create header row with column names
  const headers = ['Response ID', 'Date', 'Time', ...formElements.map(
    (el: FormElement) => el.label || el.id || 'Unnamed Field'
  )];
  
  // Create rows for each response
  const rows = responses.map(response => {
    const responseData = response.data || {};
    const date = new Date(response.createdAt);
    const dateStr = date.toLocaleDateString();
    const timeStr = date.toLocaleTimeString();
    
    const rowData = [
      response.id,
      dateStr,
      timeStr,
      ...formElements.map((el: FormElement) => {
        const fieldId = el.id;
        if (!fieldId) return '';
        return responseData[fieldId] !== undefined ? String(responseData[fieldId]) : '';
      })
    ];
    
    return rowData.join(',');
  });
  
  // Combine header and rows
  return [headers.join(','), ...rows].join('\n');
}

export async function registerRoutes(app: Express): Promise<Server> {
  // Set up authentication routes
  setupAuth(app);
  
  // Set up Stripe subscription routes
  setupStripe(app);

  // Profile update route
  app.put("/api/profile", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "You must be logged in" });
    }
    
    try {
      const userId = req.user.id;
      const { name, email, username, organizationName, industry, currentPassword, newPassword } = req.body;
      
      // Create update object with basic fields
      const updateData: any = {};
      
      // Only add fields that are provided
      if (name !== undefined) updateData.name = name;
      if (organizationName !== undefined) updateData.organizationName = organizationName;
      if (industry !== undefined) updateData.industry = industry;
      
      // For username and email, we need to check if they're unique
      if (username !== undefined && username !== req.user.username) {
        const existingUser = await storage.getUserByUsername(username);
        if (existingUser && existingUser.id !== userId) {
          return res.status(400).json({ message: "Username already taken" });
        }
        updateData.username = username;
      }
      
      if (email !== undefined && email !== req.user.email) {
        const existingUser = await storage.getUserByEmail(email);
        if (existingUser && existingUser.id !== userId) {
          return res.status(400).json({ message: "Email already in use" });
        }
        updateData.email = email;
      }
      
      // Handle password update if provided
      if (newPassword && currentPassword) {
        // Verify current password
        const passwordMatch = await comparePasswords(currentPassword, req.user.password);
        if (!passwordMatch) {
          return res.status(400).json({ message: "Current password is incorrect" });
        }
        
        // Hash the new password
        updateData.password = await hashPassword(newPassword);
      } else if ((newPassword && !currentPassword) || (!newPassword && currentPassword)) {
        return res.status(400).json({ message: "Both current and new password are required to update password" });
      }
      
      // Update user in database
      const updatedUser = await storage.updateUser(userId, updateData);
      
      // Remove sensitive information before returning
      const { password, ...userWithoutPassword } = updatedUser;
      
      res.json(userWithoutPassword);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Apply plan limits check to all routes
  app.use(['/api/forms'], checkPlanLimits);

  // Form CRUD operations
  app.get("/api/forms", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "You must be logged in" });
    }
    
    try {
      const userId = req.user.id;
      const forms = await storage.getForms(userId);
      
      // Add response count to each form
      const formsWithCounts = await Promise.all(
        forms.map(async (form) => {
          const responseCount = await storage.getResponsesCount(form.id);
          return { ...form, responseCount };
        })
      );
      
      res.json(formsWithCounts);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });
  
  app.post("/api/forms", checkPlanLimits, async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "You must be logged in" });
    }
    
    try {
      const userId = req.user.id;
      const formData = { ...req.body, userId };
      
      // Validate form data
      const parsed = insertFormSchema.safeParse(formData);
      if (!parsed.success) {
        return res.status(400).json({ error: parsed.error.format() });
      }
      
      // Set create_form action for the checkPlanLimits middleware
      req.body.action = 'create_form';
      
      const form = await storage.createForm(formData);
      res.status(201).json(form);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });
  
  app.get("/api/forms/:id", async (req, res) => {
    try {
      const formId = parseInt(req.params.id);
      
      if (isNaN(formId)) {
        return res.status(400).json({ message: "Invalid form ID" });
      }
      
      const form = await storage.getForm(formId);
      
      if (!form) {
        return res.status(404).json({ message: "Form not found" });
      }
      
      // Check if user owns the form if authenticated
      if (req.isAuthenticated()) {
        if (form.userId !== req.user.id) {
          return res.status(403).json({ message: "You do not have access to this form" });
        }
        
        // Include response count for the owner
        const responseCount = await storage.getResponsesCount(formId);
        return res.json({ ...form, responseCount });
      }
      
      // Public access only includes form data, not responses
      res.json(form);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });
  
  app.put("/api/forms/:id", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "You must be logged in" });
    }
    
    try {
      const formId = parseInt(req.params.id);
      
      if (isNaN(formId)) {
        return res.status(400).json({ message: "Invalid form ID" });
      }
      
      // Check if user owns the form
      const form = await storage.getForm(formId);
      
      if (!form) {
        return res.status(404).json({ message: "Form not found" });
      }
      
      if (form.userId !== req.user.id) {
        return res.status(403).json({ message: "You do not have access to this form" });
      }
      
      // Update form
      const updatedForm = await storage.updateForm(formId, req.body);
      res.json(updatedForm);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });
  
  app.patch("/api/forms/:id", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "You must be logged in" });
    }
    
    try {
      const formId = parseInt(req.params.id);
      
      if (isNaN(formId)) {
        return res.status(400).json({ message: "Invalid form ID" });
      }
      
      // Check if user owns the form
      const form = await storage.getForm(formId);
      
      if (!form) {
        return res.status(404).json({ message: "Form not found" });
      }
      
      if (form.userId !== req.user.id) {
        return res.status(403).json({ message: "You do not have access to this form" });
      }
      
      // Only allow status changes for PATCH requests
      if (!req.body.status) {
        return res.status(400).json({ message: "Status is required for PATCH requests" });
      }
      
      if (req.body.status !== "draft" && req.body.status !== "published") {
        return res.status(400).json({ message: "Status must be either 'draft' or 'published'" });
      }
      
      // Update form status
      const updatedForm = await storage.updateForm(formId, { status: req.body.status });
      res.json(updatedForm);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.delete("/api/forms/:id", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "You must be logged in" });
    }
    
    try {
      const formId = parseInt(req.params.id);
      
      if (isNaN(formId)) {
        return res.status(400).json({ message: "Invalid form ID" });
      }
      
      // Check if user owns the form
      const form = await storage.getForm(formId);
      
      if (!form) {
        return res.status(404).json({ message: "Form not found" });
      }
      
      if (form.userId !== req.user.id) {
        return res.status(403).json({ message: "You do not have access to this form" });
      }
      
      // Delete form
      await storage.deleteForm(formId);
      res.status(204).end();
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });
  
  // Form response operations
  app.get("/api/forms/:id/responses", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "You must be logged in" });
    }
    
    try {
      const formId = parseInt(req.params.id);
      
      if (isNaN(formId)) {
        return res.status(400).json({ message: "Invalid form ID" });
      }
      
      // Check if user owns the form
      const form = await storage.getForm(formId);
      
      if (!form) {
        return res.status(404).json({ message: "Form not found" });
      }
      
      if (form.userId !== req.user.id) {
        return res.status(403).json({ message: "You do not have access to this form" });
      }
      
      // Get responses with limit based on plan
      const limit = req.user.plan === "paid" ? undefined : 10;
      const responses = await storage.getResponses(formId, limit);
      
      // Include total count for pagination
      const totalCount = await storage.getResponsesCount(formId);
      
      res.json({ 
        responses,
        total: totalCount,
        limit: limit || totalCount
      });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });
  
  app.post("/api/forms/:id/responses", async (req, res) => {
    try {
      const formId = parseInt(req.params.id);
      
      if (isNaN(formId)) {
        return res.status(400).json({ message: "Invalid form ID" });
      }
      
      // Check if form exists
      const form = await storage.getForm(formId);
      
      if (!form) {
        return res.status(404).json({ message: "Form not found" });
      }
      
      // Check if form is published
      if (form.status !== "published") {
        return res.status(403).json({ 
          message: "This form is not accepting responses because it is not published"
        });
      }
      
      // Set action for the form owner's response limit check
      req.body.action = 'create_response';
      
      // Get form owner
      const user = await storage.getUser(form.userId);
      
      if (!user) {
        return res.status(404).json({ message: "Form owner not found" });
      }
      
      // Check response limits based on form owner's plan
      const responseCount = await storage.getResponsesCount(formId);
      const maxResponses = user.plan === "paid" ? 2000 : 10;
      
      if (responseCount >= maxResponses) {
        return res.status(403).json({ 
          message: `This form has reached the maximum number of responses (${maxResponses})`,
          limit: maxResponses,
          count: responseCount
        });
      }
      
      // Validate response data
      const responseData = { 
        formId,
        data: req.body 
      };
      
      const parsed = insertResponseSchema.safeParse(responseData);
      if (!parsed.success) {
        return res.status(400).json({ error: parsed.error.format() });
      }
      
      // Create response
      const response = await storage.createResponse(responseData);
      res.status(201).json(response);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });
  
  app.get("/api/forms/:formId/responses/:id", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "You must be logged in" });
    }
    
    try {
      const formId = parseInt(req.params.formId);
      const responseId = parseInt(req.params.id);
      
      if (isNaN(formId) || isNaN(responseId)) {
        return res.status(400).json({ message: "Invalid ID" });
      }
      
      // Check if user owns the form
      const form = await storage.getForm(formId);
      
      if (!form) {
        return res.status(404).json({ message: "Form not found" });
      }
      
      if (form.userId !== req.user.id) {
        return res.status(403).json({ message: "You do not have access to this form" });
      }
      
      // Get response
      const response = await storage.getResponse(responseId);
      
      if (!response) {
        return res.status(404).json({ message: "Response not found" });
      }
      
      if (response.formId !== formId) {
        return res.status(400).json({ message: "Response does not belong to the specified form" });
      }
      
      res.json(response);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Advanced analytics - premium feature
  app.get("/api/forms/:id/analytics", requirePaidPlan, async (req, res) => {
    try {
      const formId = parseInt(req.params.id);
      
      if (isNaN(formId)) {
        return res.status(400).json({ message: "Invalid form ID" });
      }
      
      // Check if user owns the form
      const form = await storage.getForm(formId);
      
      if (!form) {
        return res.status(404).json({ message: "Form not found" });
      }
      
      if (form.userId !== req.user.id) {
        return res.status(403).json({ message: "You do not have access to this form" });
      }
      
      // Get all responses for analytics
      const responses = await storage.getResponses(formId);
      
      // Generate advanced analytics (pro feature)
      const analytics = {
        totalResponses: responses.length,
        responsesByDate: groupResponsesByDate(responses),
        completionRate: calculateCompletionRate(responses, form),
        averageCompletionTime: calculateAverageCompletionTime(responses),
        fieldAnalytics: generateFieldAnalytics(responses, form)
      };
      
      res.json(analytics);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });
  
  // Export responses to CSV - premium feature
  app.get("/api/forms/:id/export", requirePaidPlan, async (req, res) => {
    try {
      const formId = parseInt(req.params.id);
      
      if (isNaN(formId)) {
        return res.status(400).json({ message: "Invalid form ID" });
      }
      
      // Check if user owns the form
      const form = await storage.getForm(formId);
      
      if (!form) {
        return res.status(404).json({ message: "Form not found" });
      }
      
      if (form.userId !== req.user.id) {
        return res.status(403).json({ message: "You do not have access to this form" });
      }
      
      // Get all responses for export
      const responses = await storage.getResponses(formId);
      
      // Generate CSV data (pro feature)
      const csvData = generateCSV(responses, form);
      
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename="form-${formId}-responses.csv"`);
      res.send(csvData);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Stats endpoint for dashboard
  app.get("/api/stats", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "You must be logged in" });
    }
    
    try {
      const userId = req.user.id;
      
      // Get forms
      const forms = await storage.getForms(userId);
      const formCount = forms.length;
      
      // Get total responses across all forms
      let totalResponses = 0;
      for (const form of forms) {
        totalResponses += await storage.getResponsesCount(form.id);
      }
      
      // Get limits based on plan
      const maxForms = req.user.plan === "paid" ? 1000 : 10;
      const maxResponses = req.user.plan === "paid" ? 2000 : 10;
      
      res.json({
        formCount,
        totalResponses,
        maxForms,
        maxResponses,
        plan: req.user.plan
      });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });
  
  // Test endpoint for subscription verification
  app.post("/api/test-subscription-verification", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "You must be logged in" });
    }
    
    try {
      const user = req.user;
      const result: any = { 
        before: { plan: user.plan },
        action: "verification" 
      };
      
      if (user.stripeSubscriptionId) {
        // Test subscription verification
        const verifiedPlan = await verifySubscriptionStatus(
          user.id,
          user.stripeSubscriptionId,
          user.plan
        );
        
        // Get the updated user information
        const updatedUser = await storage.getUser(user.id);
        result.after = { 
          plan: updatedUser?.plan || user.plan
        };
        result.verified = true;
        result.planChanged = user.plan !== verifiedPlan;
      } else {
        result.verified = false;
        result.after = { plan: user.plan };
        result.message = "No subscription ID found for user";
      }
      
      res.json(result);
    } catch (error: any) {
      res.status(500).json({ 
        error: error.message,
        stack: process.env.NODE_ENV === "development" ? error.stack : undefined
      });
    }
  });

  // Support enquiry routes
  app.post("/api/support", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "You must be logged in" });
    }
    
    try {
      const userId = req.user.id;
      const { email, subject, message } = req.body;
      
      // Create support enquiry data
      const enquiryData = { 
        userId, 
        email, 
        subject, 
        message 
      };
      
      // Validate enquiry data
      const parsed = insertSupportEnquirySchema.safeParse(enquiryData);
      if (!parsed.success) {
        return res.status(400).json({ error: parsed.error.format() });
      }
      
      // Create support enquiry
      const enquiry = await storage.createSupportEnquiry(enquiryData);
      res.status(201).json(enquiry);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });
  
  // Get user's support enquiries
  app.get("/api/support", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "You must be logged in" });
    }
    
    try {
      const userId = req.user.id;
      const enquiries = await storage.getSupportEnquiries(userId);
      res.json(enquiries);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  const httpServer = createServer(app);

  return httpServer;
}
