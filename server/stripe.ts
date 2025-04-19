import Stripe from "stripe";
import { Express } from "express";
import { storage } from "./storage";

// Verify all required Stripe keys are present
const requiredKeys = [
  "STRIPE_SECRET_KEY",
  "STRIPE_WEBHOOK_SECRET",
  "STRIPE_PRICE_ID",
];

const missingKeys = requiredKeys.filter((key) => !process.env[key]);

if (missingKeys.length > 0) {
  console.warn(
    `Missing Stripe environment variables: ${missingKeys.join(", ")}`,
  );
  console.warn("Some Stripe functionality may be disabled");
}

// Initialize Stripe with API key
export const stripe = process.env.STRIPE_SECRET_KEY
  ? new Stripe(process.env.STRIPE_SECRET_KEY, {
      apiVersion: "2023-08-16" as any,
    })
  : null;

// Get price ID from environment
const SUBSCRIPTION_PRICE_ID = process.env.STRIPE_PRICE_ID || "";

// Utility function for verifying subscription status
export async function verifySubscriptionStatus(
  userId: number,
  stripeSubscriptionId: string | null,
  currentPlan: string,
): Promise<string> {
  // If no subscription ID or no Stripe connection, we can't verify, so keep current plan
  if (!stripeSubscriptionId || !stripe) {
    return currentPlan;
  }

  try {
    // Retrieve the current subscription directly from Stripe
    const subscription =
      await stripe.subscriptions.retrieve(stripeSubscriptionId);

    // Determine the plan based on subscription status
    if (
      subscription.status === "active" ||
      subscription.status === "trialing"
    ) {
      if (currentPlan !== "paid") {
        // If subscription is active but user not on paid plan, update them
        console.log(
          `Subscription verification: User ${userId} has active subscription but is on ${currentPlan} plan. Updating to paid.`,
        );
        await storage.updateUserPlan(userId, "paid");
        return "paid";
      }
      return "paid";
    } else if (
      subscription.status === "canceled" ||
      subscription.status === "unpaid" ||
      subscription.status === "incomplete_expired"
    ) {
      if (currentPlan !== "free") {
        // If subscription is inactive but user on paid plan, downgrade them
        console.log(
          `Subscription verification: User ${userId} has inactive subscription (${subscription.status}) but is on ${currentPlan} plan. Downgrading to free.`,
        );
        await storage.updateUserPlan(userId, "free");
        return "free";
      }
      return "free";
    }

    // For other statuses like 'incomplete', keep current plan until resolved
    return currentPlan;
  } catch (error) {
    console.error(
      `Error verifying subscription status for user ${userId}:`,
      error,
    );
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
        console.log(
          `User already has subscription ID: ${user.stripeSubscriptionId}, retrieving...`,
        );
        try {
          const subscription = await stripe.subscriptions.retrieve(
            user.stripeSubscriptionId,
          );
          console.log(`Retrieved subscription, status: ${subscription.status}`);
          console.log(
            `Latest invoice: ${JSON.stringify(subscription.latest_invoice)}`,
          );

          // Check if there's a payment intent
          let clientSecret = null;
          if (
            typeof subscription.latest_invoice === "string" &&
            subscription.latest_invoice
          ) {
            // Retrieve invoice to get payment intent
            try {
              const invoice = await stripe.invoices.retrieve(
                subscription.latest_invoice,
              );
              // Handle invoice but can't directly access payment_intent due to type issues
              // For now we'll just log it
              console.log("Retrieved invoice", subscription.latest_invoice);
            } catch (err) {
              console.error("Error retrieving invoice:", err);
            }
          }

          console.log(
            `Client secret retrieved: ${clientSecret ? "YES" : "NO"}`,
          );

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
        payment_behavior: "default_incomplete",
        payment_settings: { save_default_payment_method: "on_subscription" },
        expand: ["latest_invoice.payment_intent"],
      });

      console.log("Created subscription:", {
        id: subscription.id,
        status: subscription.status,
        hasInvoice: !!subscription.latest_invoice,
      });

      // Update user with Stripe info - only store IDs,
      // but don't change plan status until webhook confirms payment success
      await storage.updateUserStripeInfo(user.id, {
        customerId,
        subscriptionId: subscription.id,
        // Note: plan will remain 'free' until payment confirmed via webhook
      });

      // Extract client secret safely
      let clientSecret = null;
      if (
        typeof subscription.latest_invoice === "string" &&
        subscription.latest_invoice
      ) {
        // Retrieve invoice to get payment intent
        try {
          const invoice = await stripe.invoices.retrieve(
            subscription.latest_invoice,
          );
          // Handle invoice but can't directly access payment_intent due to type issues
          // For now we'll just log it
          console.log("Retrieved latest invoice", subscription.latest_invoice);
        } catch (err) {
          console.error("Error retrieving latest invoice:", err);
        }
      }

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
  app.post("/api/stripe-webhook", async (req, res) => {
    if (!stripe) {
      return res.status(503).json({ message: "Stripe is not configured" });
    }

    const payload = req.body;
    const sig = req.headers["stripe-signature"] as string;
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
      // Checkout session completed - most important for Stripe Checkout workflow
      case "checkout.session.completed":
        const session = event.data.object;
        console.log("Checkout session completed:", session.id);

        // Extract user ID from metadata
        const userId = session.metadata?.userId;
        if (!userId) {
          console.error(
            "No userId in metadata for checkout session:",
            session.id,
          );
          break;
        }

        try {
          // Get user from database
          const user = await storage.getUser(parseInt(userId, 10));
          if (!user) {
            console.error("User not found for ID:", userId);
            break;
          }

          console.log(`Checkout completed for user ${user.id}`);

          // For subscription checkout, update user record
          if (session.mode === "subscription") {
            // Update user to paid plan
            await storage.updateUserPlan(user.id, "paid");

            // Set subscription info if available
            if (session.subscription) {
              await storage.updateUserStripeInfo(user.id, {
                customerId: session.customer as string,
                subscriptionId: session.subscription as string,
                paymentDate: new Date(),
              });

              console.log(`Updated subscription info for user ${user.id}`);
            }
          }
        } catch (error) {
          console.error("Error processing checkout completion:", error);
        }
        break;

      // Payment success events
      case "payment_intent.succeeded":
        console.log("PaymentIntent was successful!");
        break;

      // Subscription events
      case "customer.subscription.created":
      case "customer.subscription.updated":
        const subscription = event.data.object;
        const customerId = subscription.customer;
        const subscriptionStatus = subscription.status;

        console.log(
          `Subscription status: ${subscriptionStatus} for customer: ${customerId}`,
        );

        try {
          // Find user by Stripe customer ID
          const user = await storage.getUserByStripeCustomerId(customerId);

          if (user) {
            if (
              subscriptionStatus === "active" ||
              subscriptionStatus === "trialing"
            ) {
              // Update to paid plan only when subscription is confirmed active
              console.log(`Updating user ${user.id} to paid plan`);
              await storage.updateUserPlan(user.id, "paid");

              // Also update payment date
              const currentDate = new Date();
              await storage.updateUserStripeInfo(user.id, {
                customerId: user.stripeCustomerId,
                subscriptionId: user.stripeSubscriptionId,
                paymentDate: currentDate,
              });
            } else if (
              subscriptionStatus === "canceled" ||
              subscriptionStatus === "unpaid" ||
              subscriptionStatus === "incomplete_expired"
            ) {
              console.log(
                `Subscription inactive (${subscriptionStatus}), setting user ${user.id} to free plan`,
              );
              await storage.updateUserPlan(user.id, "free");
            }
          } else {
            console.error(
              `No user found for Stripe customer ID: ${customerId}`,
            );
          }
        } catch (error) {
          console.error("Error processing subscription webhook:", error);
        }
        break;

      case "customer.subscription.deleted":
        const canceledSubscription = event.data.object;
        const canceledCustomerId = canceledSubscription.customer;

        console.log(`Subscription deleted for customer: ${canceledCustomerId}`);

        try {
          // Find user by Stripe customer ID
          const subscribedUser =
            await storage.getUserByStripeCustomerId(canceledCustomerId);

          if (subscribedUser) {
            console.log(
              `Setting user ${subscribedUser.id} to free plan due to subscription deletion`,
            );
            await storage.updateUserPlan(subscribedUser.id, "free");
          } else {
            console.error(
              `No user found for Stripe customer ID: ${canceledCustomerId}`,
            );
          }
        } catch (error) {
          console.error(
            "Error processing subscription deletion webhook:",
            error,
          );
        }
        break;

      // Failed payment events
      case "invoice.payment_failed":
        const failedInvoice = event.data.object;
        const failedCustomerId = failedInvoice.customer;

        console.log(`Payment failed for customer: ${failedCustomerId}`);

        try {
          // Find user by Stripe customer ID and downgrade to free
          const user =
            await storage.getUserByStripeCustomerId(failedCustomerId);

          if (user) {
            console.log(`Payment failed, setting user ${user.id} to free plan`);
            await storage.updateUserPlan(user.id, "free");
          }
        } catch (error) {
          console.error("Error processing payment failure webhook:", error);
        }
        break;
    }

    res.status(200).json({ received: true });
  });

  // Create a Stripe Checkout session for subscription
  app.post("/api/create-checkout-session", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "You must be logged in" });
    }

    try {
      if (!stripe) {
        return res.status(503).json({ message: "Stripe is not configured" });
      }

      if (!process.env.STRIPE_PRICE_ID) {
        return res
          .status(503)
          .json({ message: "Stripe price ID is not configured" });
      }

      const user = req.user;

      // Check if the user is already on a paid plan
      if (user.plan === "paid") {
        return res.json({ success: true, message: "Already subscribed" });
      }

      // Create or retrieve customer
      let customerId = user.stripeCustomerId;

      if (!customerId) {
        // Create new customer
        const customer = await stripe.customers.create({
          email: user.email,
          name: user.username,
          metadata: {
            userId: user.id.toString(),
          },
        });

        customerId = customer.id;

        // Save customer ID to user
        await storage.updateUserStripeInfo(user.id, {
          customerId: customer.id,
          subscriptionId: user.stripeSubscriptionId || null,
        });
      }

      // Create checkout session
      const session = await stripe.checkout.sessions.create({
        customer: customerId,
        line_items: [
          {
            price: process.env.STRIPE_PRICE_ID,
            quantity: 1,
          },
        ],
        mode: "subscription",
        success_url: `${process.env.SERVER_URL || "http://localhost:5000"}/upgrade?success=true`,
        cancel_url: `${process.env.SERVER_URL || "http://localhost:5000"}/upgrade?canceled=true`,
        metadata: {
          userId: user.id.toString(),
        },
      });

      res.json({ url: session.url });
    } catch (error: any) {
      console.error("Error creating checkout session:", error);
      return res.status(500).json({ message: error.message });
    }
  });

  // Payment success - for when webhook isn't available
  app.get("/api/payment-success", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "You must be logged in" });
    }

    try {
      const user = req.user;

      // Check if user has a subscription ID but is still on free plan
      if (user.stripeSubscriptionId && user.plan === "free") {
        console.log("Manual success handler: Upgrading user to paid plan");

        // Retrieve subscription to ensure it's active
        if (stripe) {
          const subscription = await stripe.subscriptions.retrieve(
            user.stripeSubscriptionId,
          );

          if (
            subscription.status === "active" ||
            subscription.status === "trialing"
          ) {
            // Update user to paid plan
            await storage.updateUserPlan(user.id, "paid");

            // Update payment date
            const currentDate = new Date();
            await storage.updateUserStripeInfo(user.id, {
              customerId: user.stripeCustomerId,
              subscriptionId: user.stripeSubscriptionId,
              paymentDate: currentDate,
            });

            return res.json({ success: true, plan: "paid" });
          }
        }
      }

      return res.json({ success: false, plan: user.plan });
    } catch (error: any) {
      console.error("Error processing payment success:", error);
      return res.status(500).json({ message: error.message });
    }
  });

  // Create checkout session for subscription
  app.post("/api/create-checkout-session", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "You must be logged in" });
    }

    try {
      const user = req.user;

      // Make sure stripe is initialized before using it
      if (!stripe) {
        throw new Error("Stripe is not initialized");
      }

      // Create a new checkout session
      const session = await stripe.checkout.sessions.create({
        payment_method_types: ["card"],
        mode: "subscription",
        line_items: [
          {
            price: SUBSCRIPTION_PRICE_ID,
            quantity: 1,
          },
        ],
        success_url:
          req.body.successUrl || `${req.headers.origin}/subscription/success`,
        cancel_url:
          req.body.cancelUrl || `${req.headers.origin}/subscription/upgrade`,
        customer_email: user.email,
        client_reference_id: user.id.toString(),
        subscription_data: {
          metadata: {
            userId: user.id.toString(),
          },
        },
        metadata: {
          userId: user.id.toString(),
        },
      });

      res.status(200).json({ sessionId: session.id });
    } catch (error: any) {
      console.error("Failed to create checkout session:", error);
      res.status(500).json({
        message: "Could not create checkout session",
        error: error.message,
      });
    }
  });

  // Get subscription status
  app.get("/api/subscription", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "You must be logged in" });
    }

    const user = req.user;

    // Verify and update subscription status if necessary
    if (user.stripeSubscriptionId) {
      const verifiedPlan = await verifySubscriptionStatus(
        user.id,
        user.stripeSubscriptionId,
        user.plan,
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
  
  // Sync subscription data with Stripe
  app.post("/api/subscription/sync", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "You must be logged in" });
    }
    
    if (!stripe) {
      return res.status(503).json({ message: "Stripe is not configured" });
    }
    
    try {
      const user = req.user;
      console.log(`Syncing subscription for user ${user.id} (${user.email})`);
      
      // Step 1: Find this user's customer in Stripe by email
      const customers = await stripe.customers.list({ email: user.email, limit: 1 });
      
      if (customers.data.length === 0) {
        console.log(`No Stripe customer found for email ${user.email}`);
        // Reset subscription data if no customer found
        await storage.updateUserStripeInfo(user.id, {
          customerId: null,
          subscriptionId: null
        });
        await storage.updateUserPlan(user.id, 'free');
        
        return res.json({
          success: true,
          message: "Reset subscription data - no customer found in Stripe",
          plan: 'free',
          subscriptionId: null,
          customerId: null
        });
      }
      
      const customer = customers.data[0];
      console.log(`Found Stripe customer: ${customer.id}`);
      
      // Step 2: Find active subscriptions for this customer
      const subscriptions = await stripe.subscriptions.list({
        customer: customer.id,
        status: 'active',
        limit: 1
      });
      
      // Update customer ID regardless of subscription status
      await storage.updateUserStripeInfo(user.id, {
        customerId: customer.id,
        subscriptionId: subscriptions.data.length > 0 ? subscriptions.data[0].id : null
      });
      
      if (subscriptions.data.length === 0) {
        console.log(`No active subscription found for customer ${customer.id}`);
        // Set to free plan if no active subscription
        await storage.updateUserPlan(user.id, 'free');
        
        return res.json({
          success: true,
          message: "Updated customer ID, no active subscription found",
          plan: 'free',
          subscriptionId: null,
          customerId: customer.id
        });
      }
      
      // Step 3: Update user with correct subscription data
      const subscription = subscriptions.data[0];
      console.log(`Found active subscription: ${subscription.id} with status: ${subscription.status}`);
      
      // Update to paid plan
      await storage.updateUserPlan(user.id, 'paid');
      
      // Get updated user
      const updatedUser = await storage.getUser(user.id);
      
      return res.json({
        success: true,
        message: "Successfully synchronized with Stripe",
        plan: updatedUser?.plan || 'paid',
        subscriptionId: subscription.id,
        customerId: customer.id
      });
    } catch (error: any) {
      console.error("Error syncing subscription:", error);
      return res.status(500).json({ message: error.message });
    }
  });

  // Cancel subscription
  app.post("/api/cancel-subscription", async (req, res) => {
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
      await storage.updateUserPlan(user.id, "free");

      res.json({ success: true });
    } catch (error: any) {
      console.error("Stripe error:", error);
      res.status(400).json({ message: error.message });
    }
  });
}
