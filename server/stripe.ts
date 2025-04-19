import Stripe from "stripe";
import { Express } from "express";
import { storage } from "./storage";

if (!process.env.STRIPE_SECRET_KEY) {
  console.warn("STRIPE_SECRET_KEY not set, Stripe functionality will be disabled");
}

const stripe = process.env.STRIPE_SECRET_KEY 
  ? new Stripe(process.env.STRIPE_SECRET_KEY, { apiVersion: "2023-10-16" })
  : null;

const SUBSCRIPTION_PRICE_ID = process.env.STRIPE_PRICE_ID || "price_placeholder";

export function setupStripe(app: Express) {
  // Endpoint to create a subscription session
  app.post("/api/create-subscription", async (req, res) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ message: "You must be logged in" });
      }

      if (!stripe) {
        return res.status(503).json({ message: "Stripe is not configured" });
      }

      const user = req.user;

      // If user already has a subscription
      if (user.stripeSubscriptionId) {
        const subscription = await stripe.subscriptions.retrieve(user.stripeSubscriptionId);
        
        return res.json({
          subscriptionId: subscription.id,
          clientSecret: subscription.latest_invoice?.payment_intent?.client_secret,
        });
      }
      
      // Create a new customer if one doesn't exist
      let customerId = user.stripeCustomerId;
      
      if (!customerId) {
        const customer = await stripe.customers.create({
          email: user.email,
          name: user.username,
          metadata: {
            userId: user.id.toString(),
          },
        });
        customerId = customer.id;
      }

      // Create the subscription
      const subscription = await stripe.subscriptions.create({
        customer: customerId,
        items: [{ price: SUBSCRIPTION_PRICE_ID }],
        payment_behavior: 'default_incomplete',
        payment_settings: { save_default_payment_method: 'on_subscription' },
        expand: ['latest_invoice.payment_intent'],
      });

      // Update user with Stripe info
      await storage.updateUserStripeInfo(user.id, {
        customerId,
        subscriptionId: subscription.id,
      });

      // Return the client secret
      res.json({
        subscriptionId: subscription.id,
        clientSecret: subscription.latest_invoice?.payment_intent?.client_secret,
      });
    } catch (error: any) {
      console.error("Stripe error:", error);
      res.status(400).json({ message: error.message });
    }
  });

  // Webhook endpoint for Stripe events
  app.post('/api/stripe-webhook', async (req, res) => {
    if (!stripe) {
      return res.status(503).json({ message: "Stripe is not configured" });
    }

    const payload = req.body;
    const sig = req.headers['stripe-signature'] as string;
    const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET;
    
    let event;

    try {
      if (endpointSecret) {
        // Verify webhook signature
        event = stripe.webhooks.constructEvent(payload, sig, endpointSecret);
      } else {
        // If no webhook secret, just use the payload directly
        // (not recommended for production)
        event = payload;
      }
    } catch (err: any) {
      console.error(`Webhook signature verification failed: ${err.message}`);
      return res.status(400).send(`Webhook Error: ${err.message}`);
    }

    // Handle the event
    switch (event.type) {
      case 'customer.subscription.created':
      case 'customer.subscription.updated':
        const subscription = event.data.object;
        const customerId = subscription.customer;
        
        // Find user by Stripe customer ID
        const users = Array.from((storage as any).users.values());
        const user = users.find(u => u.stripeCustomerId === customerId);
        
        if (user) {
          if (subscription.status === 'active' || subscription.status === 'trialing') {
            await storage.updateUserPlan(user.id, 'paid');
          } else if (subscription.status === 'canceled' || subscription.status === 'unpaid') {
            await storage.updateUserPlan(user.id, 'free');
          }
        }
        break;
        
      case 'customer.subscription.deleted':
        const canceledSubscription = event.data.object;
        const canceledCustomerId = canceledSubscription.customer;
        
        // Find user by Stripe customer ID
        const allUsers = Array.from((storage as any).users.values());
        const subscribedUser = allUsers.find(u => u.stripeCustomerId === canceledCustomerId);
        
        if (subscribedUser) {
          await storage.updateUserPlan(subscribedUser.id, 'free');
        }
        break;
    }

    res.status(200).json({ received: true });
  });

  // Get subscription status
  app.get('/api/subscription', async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "You must be logged in" });
    }

    const user = req.user;
    
    res.json({
      plan: user.plan,
      subscriptionId: user.stripeSubscriptionId,
      customerId: user.stripeCustomerId,
    });
  });

  // Cancel subscription
  app.post('/api/cancel-subscription', async (req, res) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ message: "You must be logged in" });
      }

      if (!stripe) {
        return res.status(503).json({ message: "Stripe is not configured" });
      }

      const user = req.user;

      if (!user.stripeSubscriptionId) {
        return res.status(400).json({ message: "No active subscription" });
      }

      // Cancel the subscription
      await stripe.subscriptions.del(user.stripeSubscriptionId);

      // Update user to free plan
      await storage.updateUserPlan(user.id, 'free');

      res.json({ success: true });
    } catch (error: any) {
      console.error("Stripe error:", error);
      res.status(400).json({ message: error.message });
    }
  });
}
