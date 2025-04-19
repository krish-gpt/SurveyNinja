import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { setupAuth } from "./auth";
import { setupStripe, verifySubscriptionStatus } from "./stripe";
import { insertFormSchema, insertResponseSchema } from "@shared/schema";

export async function registerRoutes(app: Express): Promise<Server> {
  // Set up authentication routes
  setupAuth(app);
  
  // Set up Stripe subscription routes
  setupStripe(app);

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
  
  app.post("/api/forms", async (req, res) => {
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
      
      // Check if user has reached form limit based on plan
      const formCount = await storage.getFormsCount(userId);
      const maxForms = req.user.plan === "paid" ? 1000 : 10;
      
      if (formCount >= maxForms) {
        return res.status(403).json({ 
          message: `You have reached the maximum number of forms (${maxForms}) for your plan`
        });
      }
      
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
      
      // Check if form has reached response limit
      const responseCount = await storage.getResponsesCount(formId);
      const user = await storage.getUser(form.userId);
      
      if (!user) {
        return res.status(404).json({ message: "Form owner not found" });
      }
      
      const maxResponses = user.plan === "paid" ? 2000 : 10;
      
      if (responseCount >= maxResponses) {
        return res.status(403).json({ 
          message: `This form has reached the maximum number of responses (${maxResponses})`
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

  const httpServer = createServer(app);

  return httpServer;
}
