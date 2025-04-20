import passport from "passport";
import { Strategy as LocalStrategy } from "passport-local";
import { Express } from "express";
import session from "express-session";
import { scrypt, randomBytes, timingSafeEqual } from "crypto";
import { promisify } from "util";
import { storage } from "./storage";
import { User as SelectUser } from "@shared/schema";
import { insertUserSchema } from "@shared/schema";
import { verifySubscriptionStatus, stripe } from "./stripe";

/**
 * Synchronizes a user's subscription data with Stripe
 * This makes an internal API call to the sync endpoint
 * to leverage the existing synchronization logic
 */
async function syncSubscriptionWithStripe(user: Express.User): Promise<any> {
  try {
    if (!user.email) {
      throw new Error('User email not available for sync');
    }
    
    // Use the stripe instance imported from stripe.ts
    if (!stripe) {
      throw new Error('Stripe not initialized');
    }
    
    // Find customer in Stripe
    const customers = await stripe.customers.list({ 
      email: user.email, 
      limit: 1 
    });
    
    if (customers.data.length === 0) {
      console.log(`No Stripe customer found for email ${user.email}`);
      await storage.updateUserStripeInfo(user.id, {
        customerId: null,
        subscriptionId: null
      });
      await storage.updateUserPlan(user.id, 'free');
      
      return {
        success: true,
        message: "Reset subscription data - no customer found in Stripe",
        plan: 'free'
      };
    }
    
    const customer = customers.data[0];
    
    // Find active subscriptions
    const subscriptions = await stripe.subscriptions.list({
      customer: customer.id,
      status: 'active',
      limit: 1
    });
    
    // Update user with correct data
    await storage.updateUserStripeInfo(user.id, {
      customerId: customer.id,
      subscriptionId: subscriptions.data.length > 0 ? subscriptions.data[0].id : null
    });
    
    if (subscriptions.data.length === 0) {
      await storage.updateUserPlan(user.id, 'free');
      return {
        success: true,
        message: "Updated to free plan - no active subscription",
        plan: 'free'
      };
    } else {
      await storage.updateUserPlan(user.id, 'paid');
      return {
        success: true,
        message: "Updated to paid plan with active subscription",
        plan: 'paid',
        subscriptionId: subscriptions.data[0].id
      };
    }
  } catch (error: any) {
    console.error("Subscription sync error:", error);
    throw error;
  }
}

declare global {
  namespace Express {
    interface User extends SelectUser {}
  }
}

const scryptAsync = promisify(scrypt);

async function hashPassword(password: string) {
  const salt = randomBytes(16).toString("hex");
  const buf = (await scryptAsync(password, salt, 64)) as Buffer;
  return `${buf.toString("hex")}.${salt}`;
}

async function comparePasswords(supplied: string, stored: string) {
  const [hashed, salt] = stored.split(".");
  const hashedBuf = Buffer.from(hashed, "hex");
  const suppliedBuf = (await scryptAsync(supplied, salt, 64)) as Buffer;
  return timingSafeEqual(hashedBuf, suppliedBuf);
}

export function setupAuth(app: Express) {
  if (!process.env.SESSION_SECRET) {
    // Use a random session secret if not provided
    process.env.SESSION_SECRET = randomBytes(32).toString("hex");
    console.warn("Warning: SESSION_SECRET not set, using random value");
  }

  const sessionSettings: session.SessionOptions = {
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    store: storage.sessionStore,
    name: 'formpulse.sid',
    rolling: true, // Resets the cookie expiration on activity
    cookie: { 
      secure: process.env.NODE_ENV === "production",
      maxAge: 24 * 60 * 60 * 1000, // 24 hours max age
      httpOnly: true,
      sameSite: 'lax'
    }
  };

  app.set("trust proxy", 1);
  app.use(session(sessionSettings));
  app.use(passport.initialize());
  app.use(passport.session());
  
  // Session absolute timeout middleware (7 days maximum regardless of activity)
  app.use((req, res, next) => {
    if (req.isAuthenticated() && req.session.passport) {
      const SESSION_ABSOLUTE_TIMEOUT = 7 * 24 * 60 * 60 * 1000; // 7 days
      const sessionCreatedAt = req.session.createdAt || Date.now();
      
      if (!req.session.createdAt) {
        req.session.createdAt = sessionCreatedAt;
      }
      
      const sessionAge = Date.now() - sessionCreatedAt;
      
      if (sessionAge > SESSION_ABSOLUTE_TIMEOUT) {
        // Force logout if absolute session timeout is reached
        return req.logout((err) => {
          if (err) return next(err);
          req.session.destroy((err) => {
            if (err) return next(err);
            res.redirect('/auth');
          });
        });
      }
    }
    next();
  });

  passport.use(
    new LocalStrategy(
      { usernameField: "email" },
      async (email, password, done) => {
        try {
          const user = await storage.getUserByEmail(email);
          if (!user || !(await comparePasswords(password, user.password))) {
            return done(null, false, { message: "Invalid email or password" });
          } else {
            return done(null, user);
          }
        } catch (error) {
          return done(error);
        }
      }
    )
  );

  passport.serializeUser((user, done) => done(null, user.id));
  passport.deserializeUser(async (id: number, done) => {
    try {
      const user = await storage.getUser(id);
      done(null, user);
    } catch (error) {
      done(error);
    }
  });

  // Registration endpoint
  app.post("/api/register", async (req, res, next) => {
    try {
      // Validate input
      const parsed = insertUserSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ error: parsed.error.format() });
      }
      
      // Check if user already exists
      const existingUserByEmail = await storage.getUserByEmail(req.body.email);
      if (existingUserByEmail) {
        return res.status(400).json({ message: "Email already exists" });
      }
      
      const existingUserByUsername = await storage.getUserByUsername(req.body.username);
      if (existingUserByUsername) {
        return res.status(400).json({ message: "Username already exists" });
      }

      // Create user with hashed password
      const user = await storage.createUser({
        ...req.body,
        password: await hashPassword(req.body.password),
      });

      // Login the user after registration
      req.login(user, (err) => {
        if (err) return next(err);
        const { password, ...userWithoutPassword } = user;
        res.status(201).json(userWithoutPassword);
      });
    } catch (error) {
      next(error);
    }
  });

  // Login endpoint
  app.post("/api/login", (req, res, next) => {
    passport.authenticate("local", async (err: Error | null, user: Express.User | false, info: { message: string } | undefined) => {
      if (err) return next(err);
      if (!user) {
        return res.status(401).json({ message: info?.message || "Authentication failed" });
      }
      
      // First login the user
      const loginPromise = new Promise<void>((resolve, reject) => {
        req.login(user, (err) => {
          if (err) reject(err);
          else resolve();
        });
      });
      
      try {
        await loginPromise;
        
        // Now that the user is logged in, sync their subscription status with Stripe
        // We'll perform the sync asynchronously so it doesn't block the login response
        (async () => {
          try {
            // Use the synchronization endpoint to get the latest subscription data from Stripe
            const syncResult = await syncSubscriptionWithStripe(user);
            console.log(`Synced subscription for ${user.email} during login:`, syncResult);
          } catch (syncError) {
            console.error("Error syncing subscription during login:", syncError);
            // Continue with login even if sync fails
          }
        })();
        
        // Return user data immediately without waiting for the sync
        const { password, ...userWithoutPassword } = user as any;
        res.status(200).json(userWithoutPassword);
      } catch (error) {
        next(error);
      }
    })(req, res, next);
  });

  // Logout endpoint
  app.post("/api/logout", (req, res, next) => {
    req.logout((err) => {
      if (err) return next(err);
      res.sendStatus(200);
    });
  });

  // Get current user endpoint
  app.get("/api/user", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    
    // Verify subscription status on user data access
    try {
      if (req.user.stripeSubscriptionId) {
        const currentPlan = req.user.plan;
        const verifiedPlan = await verifySubscriptionStatus(
          req.user.id, 
          req.user.stripeSubscriptionId, 
          currentPlan
        );
        
        // If plan changed during verification, refresh user data
        if (verifiedPlan !== currentPlan) {
          const updatedUser = await storage.getUser(req.user.id);
          if (updatedUser) {
            req.user = updatedUser;
          }
        }
      }
    } catch (verifyError) {
      console.error("Error verifying subscription during user data access:", verifyError);
      // Continue providing user data even if verification fails
    }
    
    const { password, ...userWithoutPassword } = req.user;
    res.json(userWithoutPassword);
  });

  // Password reset request endpoint
  app.post("/api/request-password-reset", async (req, res, next) => {
    try {
      const { email } = req.body;
      
      if (!email) {
        return res.status(400).json({ message: "Email is required" });
      }
      
      const user = await storage.getUserByEmail(email);
      
      // Don't reveal if user exists for security
      res.status(200).json({ message: "If your email exists in our system, you will receive a password reset link" });
      
      // In a real app, we would send an email with a reset link
      // For this MVP, we'll just log it
      if (user) {
        console.log(`Would send password reset link to ${email}`);
      }
    } catch (error) {
      next(error);
    }
  });

  // For a real app, we would implement a password reset endpoint
  // that verifies a token and allows setting a new password
}
