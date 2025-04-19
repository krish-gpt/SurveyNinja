import { Request, Response, NextFunction } from "express";
import { storage } from "../storage";
import { verifySubscriptionStatus } from "../stripe";

/**
 * Middleware to check if user is on a paid plan
 * If not, prevents access to premium features
 */
export const requirePaidPlan = async (req: Request, res: Response, next: NextFunction) => {
  if (!req.isAuthenticated()) {
    return res.status(401).json({ message: "You must be logged in" });
  }

  const user = req.user;
  
  try {
    // If the user has a subscription ID, verify it's still active
    if (user.stripeSubscriptionId) {
      const verifiedPlan = await verifySubscriptionStatus(
        user.id,
        user.stripeSubscriptionId,
        user.plan
      );
      
      // If plan verification changed the status, refresh the user object
      if (verifiedPlan !== user.plan) {
        const updatedUser = await storage.getUser(user.id);
        if (updatedUser) {
          req.user = updatedUser;
        }
      }
    }
    
    // After verification, check if user is on paid plan
    if (req.user.plan !== "paid") {
      return res.status(403).json({
        message: "This feature requires a paid subscription",
        upgradeRequired: true
      });
    }
    
    next();
  } catch (error) {
    console.error("Error in subscription guard:", error);
    return res.status(500).json({ message: "Error checking subscription status" });
  }
};

/**
 * Middleware to check form and response limits based on plan
 */
export const checkPlanLimits = async (req: Request, res: Response, next: NextFunction) => {
  if (!req.isAuthenticated()) {
    return res.status(401).json({ message: "You must be logged in" });
  }

  const user = req.user;
  const path = req.path;
  
  try {
    // Form creation limit check
    if (path === '/api/forms' && req.method === 'POST') {
      const formCount = await storage.getFormsCount(user.id);
      
      // Limit free users to 10 forms
      if (user.plan !== 'paid' && formCount >= 10) {
        return res.status(403).json({
          message: "You've reached the maximum number of forms allowed on the free plan",
          upgradeRequired: true
        });
      }
    }
    
    // Response creation limit check
    if (path.includes('/api/forms') && path.includes('/responses') && req.method === 'POST') {
      const formId = parseInt(path.split('/')[3], 10);
      
      if (!isNaN(formId)) {
        const form = await storage.getForm(formId);
        
        if (form) {
          const responseCount = await storage.getResponsesCount(form.id);
          
          // Limit free users to 10 responses per form
          if (user.plan !== 'paid' && responseCount >= 10) {
            return res.status(403).json({
              message: "You've reached the maximum number of responses allowed per form on the free plan",
              upgradeRequired: true
            });
          }
        }
      }
    }
    
    next();
  } catch (error) {
    console.error("Error in plan limits check:", error);
    return res.status(500).json({ message: "Error checking plan limits" });
  }
};