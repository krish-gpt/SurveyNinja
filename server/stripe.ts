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

// Utility function for verifying subscription status
export async function verifySubscriptionStatus(userId: number, stripeSubscriptionId: string | null, currentPlan: string): Promise<string> {
  // If no subscription ID or no Stripe connection, we can't verify, so keep current plan
  if (!stripeSubscriptionId || !stripe) {
    return currentPlan;
  }
  
  try {
    // Retrieve the current subscription directly from Stripe
    const subscription = await stripe.subscriptions.retrieve(stripeSubscriptionId);
    
    // Determine the plan based on subscription status
    if (subscription.status === 'active' || subscription.status === 'trialing') {
      if (currentPlan !== 'paid') {
        // If subscription is active but user not on paid plan, update them
        console.log(`Subscription verification: User ${userId} has active subscription but is on ${currentPlan} plan. Updating to paid.`);
        await storage.updateUserPlan(userId, 'paid');
        return 'paid';
      }
      return 'paid';
    } else if (subscription.status === 'canceled' || 
               subscription.status === 'unpaid' || 
               subscription.status === 'incomplete_expired') {
      if (currentPlan !== 'free') {
        // If subscription is inactive but user on paid plan, downgrade them
        console.log(`Subscription verification: User ${userId} has inactive subscription (${subscription.status}) but is on ${currentPlan} plan. Downgrading to free.`);
        await storage.updateUserPlan(userId, 'free');
        return 'free';
      }
      return 'free';
    }
    
    // For other statuses like 'incomplete', keep current plan until resolved
    return currentPlan;
  } catch (error) {
    console.error(`Error verifying subscription status for user ${userId}:`, error);
    return currentPlan; // On error, don't change anything
  }
}

export function setupStripe(app: Express) {
  // Endpoint to create a subscription session
  app.post("/api/create-subscription", async (req, res) => {
    try {
      console.log("Creating subscription - starting process...");
      
      if (!req.isAuthenticated()) {
        console.log("User not authenticated");
        return res.status(401).json({ message: "You must be logged in" });
      }

      if (!stripe) {
        console.log("Stripe not configured");
        return res.status(503).json({ message: "Stripe is not configured" });
      }

      console.log(`Using Stripe Price ID: ${SUBSCRIPTION_PRICE_ID}`);
      const user = req.user;
      console.log(`Creating subscription for user: ${user.id} (${user.email})`);

      // If user already has a subscription
      if (user.stripeSubscriptionId) {
        console.log(`User already has subscription ID: ${user.stripeSubscriptionId}, retrieving...`);
        try {
          const subscription = await stripe.subscriptions.retrieve(user.stripeSubscriptionId);
          console.log(`Retrieved subscription, status: ${subscription.status}`);
          console.log(`Latest invoice: ${JSON.stringify(subscription.latest_invoice)}`);
          
          // Check if there's a payment intent
          const clientSecret = typeof subscription.latest_invoice !== 'string' && 
                           subscription.latest_invoice?.payment_intent &&
                           typeof subscription.latest_invoice.payment_intent !== 'string' ? 
                           subscription.latest_invoice.payment_intent.client_secret : null;
          
          console.log(`Client secret retrieved: ${clientSecret ? 'YES' : 'NO'}`);
          
          return res.json({
            subscriptionId: subscription.id,
            clientSecret: clientSecret,
          });
        } catch (error) {
          console.error("Error retrieving existing subscription:", error);
          // Fall through to create a new subscription
        }
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

      console.log("Created subscription:", {
        id: subscription.id,
        status: subscription.status,
        hasInvoice: !!subscription.latest_invoice,
        hasPaymentIntent: !!(typeof subscription.latest_invoice !== 'string' && 
                           subscription.latest_invoice?.payment_intent),
        clientSecret: typeof subscription.latest_invoice !== 'string' && 
                    subscription.latest_invoice?.payment_intent &&
                    typeof subscription.latest_invoice.payment_intent !== 'string' ? 
                    subscription.latest_invoice.payment_intent.client_secret : null
      });

      // Update user with Stripe info - only store IDs, 
      // but don't change plan status until webhook confirms payment success
      await storage.updateUserStripeInfo(user.id, {
        customerId,
        subscriptionId: subscription.id,
        // Note: plan will remain 'free' until payment confirmed via webhook
      });

      // Extract client secret safely
      const clientSecret = typeof subscription.latest_invoice !== 'string' && 
                         subscription.latest_invoice?.payment_intent &&
                         typeof subscription.latest_invoice.payment_intent !== 'string' ? 
                         subscription.latest_invoice.payment_intent.client_secret : null;

      // Return the client secret
      res.json({
        subscriptionId: subscription.id,
        clientSecret: clientSecret,
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

  // Simulate payment success for demo purposes
  app.post('/api/simulate-payment-success', async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "You must be logged in" });
    }

    try {
      const user = req.user;
      
      // Check if the user is already on a paid plan
      if (user.plan === 'paid') {
        return res.json({ success: true, plan: 'paid', message: 'Already subscribed' });
      }
      
      console.log(`Simulating successful subscription payment for user: ${user.id}`);
      
      // Update the user to paid plan
      await storage.updateUserPlan(user.id, 'paid');
      
      // Set a payment date
      const currentDate = new Date();
      await storage.updateUserStripeInfo(user.id, {
        customerId: user.stripeCustomerId || 'demo_customer',
        subscriptionId: user.stripeSubscriptionId || 'demo_subscription',
        paymentDate: currentDate
      });
      
      console.log(`User ${user.id} upgraded to paid plan successfully (demo)`);
      
      return res.json({ success: true, plan: 'paid' });
    } catch (error: any) {
      console.error('Error processing simulated payment:', error);
      return res.status(500).json({ message: error.message });
    }
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
    
    // Verify and update subscription status if necessary
    if (user.stripeSubscriptionId) {
      const verifiedPlan = await verifySubscriptionStatus(
        user.id, 
        user.stripeSubscriptionId, 
        user.plan
      );
      
      // If plan was updated during verification, get the updated user
      if (verifiedPlan !== user.plan) {
        const updatedUser = await storage.getUser(user.id);
        if (updatedUser) {
          return res.json({
            plan: updatedUser.plan,
            subscriptionId: updatedUser.stripeSubscriptionId,
            customerId: updatedUser.stripeCustomerId,
          });
        }
      }
    }
    
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
