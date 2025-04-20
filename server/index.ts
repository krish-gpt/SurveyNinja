import express, { type Request, Response, NextFunction } from "express";
import { registerRoutes } from "./routes";
import { setupVite, serveStatic, log } from "./vite";
import cors from "cors";

const app = express();

// Create a webhook handler router with raw body parser for Stripe
const stripeWebhookRouter = express.Router();
stripeWebhookRouter.use(express.raw({ type: 'application/json' }));
app.use('/api/stripe-webhook', stripeWebhookRouter);

// Configure CORS with strict settings
const corsOptions = {
  origin: process.env.NODE_ENV === "production" 
    ? [process.env.ALLOWED_ORIGIN || "https://formpulse.replit.app"] 
    : ["http://localhost:5000", "http://localhost:3000"],
  methods: ["GET", "POST", "PUT", "DELETE", "PATCH"],
  allowedHeaders: ["Content-Type", "Authorization", "stripe-signature"],
  credentials: true,
  maxAge: 86400 // 24 hours in seconds
};

app.use(cors(corsOptions));

// Use JSON parsing middleware for all routes EXCEPT the Stripe webhook path
app.use((req, res, next) => {
  if (req.path === '/api/stripe-webhook') {
    next();
  } else {
    express.json()(req, res, next);
  }
});

app.use(express.urlencoded({ extended: false }));

// Add security headers
app.use((req, res, next) => {
  // Prevent browsers from incorrectly detecting non-scripts as scripts
  res.setHeader('X-Content-Type-Options', 'nosniff');
  
  // Block pages from being framed by other sites to prevent clickjacking
  res.setHeader('X-Frame-Options', 'DENY');
  
  // Disable browser's XSS protection to prevent it from interfering with the application's own XSS protection
  res.setHeader('X-XSS-Protection', '0');
  
  // Restrict where resources can be loaded from
  res.setHeader('Content-Security-Policy', "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval' https://*.stripe.com; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com; img-src 'self' data: https://*.stripe.com; connect-src 'self' https://*.stripe.com; frame-src 'self' https://*.stripe.com");
  
  // Don't include the Referer header when navigating to other origins
  res.setHeader('Referrer-Policy', 'same-origin');
  
  next();
});

app.use((req, res, next) => {
  const start = Date.now();
  const path = req.path;
  let capturedJsonResponse: Record<string, any> | undefined = undefined;

  const originalResJson = res.json;
  res.json = function (bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };

  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path.startsWith("/api")) {
      let logLine = `${req.method} ${path} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }

      if (logLine.length > 80) {
        logLine = logLine.slice(0, 79) + "…";
      }

      log(logLine);
    }
  });

  next();
});

(async () => {
  const server = await registerRoutes(app);

  app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";

    res.status(status).json({ message });
    throw err;
  });

  // importantly only setup vite in development and after
  // setting up all the other routes so the catch-all route
  // doesn't interfere with the other routes
  if (app.get("env") === "development") {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }

  // ALWAYS serve the app on port 5000
  // this serves both the API and the client.
  // It is the only port that is not firewalled.
  const port = 5000;
  server.listen({
    port,
    host: "0.0.0.0",
    reusePort: true,
  }, () => {
    log(`serving on port ${port}`);
  });
})();
