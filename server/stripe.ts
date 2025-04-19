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

      // Update user with Stripe info - only store IDs, 
      // but don't change plan status until webhook confirms payment success
      await storage.updateUserStripeInfo(user.id, {
        customerId,
        subscriptionId: subscription.id,
        // Note: plan will remain 'free' until payment confirmed via webhook
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
    console.log(`Webhook received: ${event.type}`);
    
    switch (event.type) {
      // Payment success events
      case 'payment_intent.succeeded':
        // Payment was successful, but we'll wait for the subscription status to be updated
        console.log('PaymentIntent was successful!');
        break;
        
      // Subscription events
      case 'customer.subscription.created':
      case 'customer.subscription.updated':
        const subscription = event.data.object;
        const customerId = subscription.customer;
        const subscriptionStatus = subscription.status;
        
        console.log(`Subscription status: ${subscriptionStatus} for customer: ${customerId}`);
        
        try {
          // Find user by Stripe customer ID
          const user = await storage.getUserByStripeCustomerId(customerId);
          
          if (user) {
            if (subscriptionStatus === 'active' || subscriptionStatus === 'trialing') {
              // Update to paid plan only when subscription is confirmed active
              console.log(`Updating user ${user.id} to paid plan`);
              await storage.updateUserPlan(user.id, 'paid');
              
              // Also update payment date
              const currentDate = new Date();
              await storage.updateUserStripeInfo(user.id, {
                customerId: user.stripeCustomerId,
                subscriptionId: user.stripeSubscriptionId,
                paymentDate: currentDate
              });
              
            } else if (subscriptionStatus === 'canceled' || subscriptionStatus === 'unpaid' || 
                       subscriptionStatus === 'incomplete_expired') {
              console.log(`Subscription inactive (${subscriptionStatus}), setting user ${user.id} to free plan`);
              await storage.updateUserPlan(user.id, 'free');
            }
          } else {
            console.error(`No user found for Stripe customer ID: ${customerId}`);
          }
        } catch (error) {
          console.error('Error processing subscription webhook:', error);
        }
        break;
        
      case 'customer.subscription.deleted':
        const canceledSubscription = event.data.object;
        const canceledCustomerId = canceledSubscription.customer;
        
        console.log(`Subscription deleted for customer: ${canceledCustomerId}`);
        
        try {
          // Find user by Stripe customer ID
          const subscribedUser = await storage.getUserByStripeCustomerId(canceledCustomerId);
          
          if (subscribedUser) {
            console.log(`Setting user ${subscribedUser.id} to free plan due to subscription deletion`);
            await storage.updateUserPlan(subscribedUser.id, 'free');
          } else {
            console.error(`No user found for Stripe customer ID: ${canceledCustomerId}`);
          }
        } catch (error) {
          console.error('Error processing subscription deletion webhook:', error);
        }
        break;
      
      // Failed payment events
      case 'invoice.payment_failed':
        const failedInvoice = event.data.object;
        const failedCustomerId = failedInvoice.customer;
        
        console.log(`Payment failed for customer: ${failedCustomerId}`);
        
        try {
          // Find user by Stripe customer ID and downgrade to free
          const user = await storage.getUserByStripeCustomerId(failedCustomerId);
          
          if (user) {
            console.log(`Payment failed, setting user ${user.id} to free plan`);
            await storage.updateUserPlan(user.id, 'free');
          }
        } catch (error) {
          console.error('Error processing payment failure webhook:', error);
        }
        break;
    }

    res.status(200).json({ received: true });
  });

  // Payment success - for when webhook isn't available
  app.get('/api/payment-success', async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "You must be logged in" });
    }

    try {
      const user = req.user;
      
      // Check if user has a subscription ID but is still on free plan
      if (user.stripeSubscriptionId && user.plan === 'free') {
        console.log('Manual success handler: Upgrading user to paid plan');
        
        // Retrieve subscription to ensure it's active
        if (stripe) {
          const subscription = await stripe.subscriptions.retrieve(user.stripeSubscriptionId);
          
          if (subscription.status === 'active' || subscription.status === 'trialing') {
            // Update user to paid plan
            await storage.updateUserPlan(user.id, 'paid');
            
            // Update payment date
            const currentDate = new Date();
            await storage.updateUserStripeInfo(user.id, {
              customerId: user.stripeCustomerId,
              subscriptionId: user.stripeSubscriptionId,
              paymentDate: currentDate
            });
            
            return res.json({ success: true, plan: 'paid' });
          }
        }
      }
      
      return res.json({ success: false, plan: user.plan });
    } catch (error: any) {
      console.error('Error processing payment success:', error);
      return res.status(500).json({ message: error.message });
    }
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
      await stripe.subscriptions.cancel(user.stripeSubscriptionId);

      // Update user to free plan
      await storage.updateUserPlan(user.id, 'free');

      res.json({ success: true });
    } catch (error: any) {
      console.error("Stripe error:", error);
      res.status(400).json({ message: error.message });
    }
  });
}
