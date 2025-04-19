import { Request, Response, NextFunction } from 'express';
import { storage } from '../storage';
import { verifySubscriptionStatus } from '../stripe';

/**
 * Middleware to check if user is on a paid plan
 * If not, prevents access to premium features
 */
export const requirePaidPlan = async (req: Request, res: Response, next: NextFunction) => {
  try {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "Authentication required" });
    }

    const user = req.user;
    
    // If user has subscription ID, verify status is current with Stripe
    if (user.stripeSubscriptionId) {
      const verifiedPlan = await verifySubscriptionStatus(
        user.id, 
        user.stripeSubscriptionId, 
        user.plan
      );
      
      // Use the verified plan status for authorization
      if (verifiedPlan !== 'paid') {
        return res.status(403).json({ 
          message: "This feature requires a Pro plan subscription",
          plan: verifiedPlan
        });
      }
    } else if (user.plan !== 'paid') {
      // No subscription ID and not on paid plan
      return res.status(403).json({ 
        message: "This feature requires a Pro plan subscription",
        plan: user.plan
      });
    }

    next();
  } catch (error) {
    console.error("Error in subscription guard:", error);
    res.status(500).json({ message: "Error verifying subscription status" });
  }
};

/**
 * Middleware to check form and response limits based on plan
 */
export const checkPlanLimits = async (req: Request, res: Response, next: NextFunction) => {
  try {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "Authentication required" });
    }

    const user = req.user;
    const action = req.body.action || 'view';
    
    // Free plan limits
    const FREE_PLAN_FORM_LIMIT = 10;
    const FREE_PLAN_RESPONSE_LIMIT = 10;
    
    // Only check limits for free plan users
    if (user.plan === 'free') {
      // Creating a new form
      if (action === 'create_form') {
        const formsCount = await storage.getFormsCount(user.id);
        if (formsCount >= FREE_PLAN_FORM_LIMIT) {
          return res.status(403).json({
            message: `Free plan is limited to ${FREE_PLAN_FORM_LIMIT} forms. Upgrade to Pro for unlimited forms.`,
            limit: FREE_PLAN_FORM_LIMIT,
            count: formsCount
          });
        }
      }
      
      // Creating a new response
      if (action === 'create_response' && req.params.formId) {
        const formId = parseInt(req.params.formId, 10);
        const responsesCount = await storage.getResponsesCount(formId);
        if (responsesCount >= FREE_PLAN_RESPONSE_LIMIT) {
          return res.status(403).json({
            message: `Free plan is limited to ${FREE_PLAN_RESPONSE_LIMIT} responses per form. Upgrade to Pro for more.`,
            limit: FREE_PLAN_RESPONSE_LIMIT,
            count: responsesCount
          });
        }
      }
    }
    
    next();
  } catch (error) {
    console.error("Error checking plan limits:", error);
    res.status(500).json({ message: "Error checking usage limits" });
  }
};