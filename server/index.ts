import "dotenv/config";
import express, { type Request, Response, NextFunction } from "express";
import { registerRoutes } from "./routes";
import { serveStatic } from "./static";
import { createServer } from "http";
import { storage } from "./storage";
import { startDailyReportScheduler } from "./slack-reporter";

const app = express();
const httpServer = createServer(app);

declare module "http" {
  interface IncomingMessage {
    rawBody: unknown;
  }
}

app.use(
  express.json({
    verify: (req, _res, buf) => {
      req.rawBody = buf;
    },
  }),
);

app.use(express.urlencoded({ extended: false }));

export function log(message: string, source = "express") {
  const formattedTime = new Date().toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
    hour12: true,
  });

  console.log(`${formattedTime} [${source}] ${message}`);
}

// Ensure all default departments exist in the database
async function ensureDefaultDepartments() {
  const DEFAULT_DEPARTMENTS = [
    { name: "Finance",     description: "Financial operations and payments",      color: "#10b981", displayOrder: 1 },
    { name: "Operations",  description: "Order fulfillment and logistics",        color: "#f59e0b", displayOrder: 2 },
    { name: "Marketplace", description: "Product listings and seller management", color: "#8b5cf6", displayOrder: 3 },
    { name: "Tech",        description: "Technical support and platform issues",  color: "#3b82f6", displayOrder: 4 },
    { name: "Supply",      description: "Supply chain and inventory management",  color: "#ec4899", displayOrder: 5 },
    { name: "Growth",      description: "Business development and expansion",     color: "#f97316", displayOrder: 6 },
    { name: "Experience",  description: "Customer experience and service",        color: "#6366f1", displayOrder: 7 },
    { name: "CX",          description: "Customer Support",                       color: "#06b6d4", displayOrder: 8 },
  ];
  try {
    for (const dept of DEFAULT_DEPARTMENTS) {
      const existing = await storage.getDepartmentByName(dept.name);
      if (!existing) {
        await storage.createDepartment(dept);
        log(`Created missing department: ${dept.name}`, "startup");
      }
    }
  } catch (error) {
    console.error("Failed to ensure default departments:", error);
  }
}

// Migrate all existing SLA configs to use business hours (exclude weekends)
async function ensureBusinessHoursSla() {
  try {
    const { db } = await import("./db");
    const { slaConfigurations } = await import("@shared/schema");
    const { eq } = await import("drizzle-orm");

    // Flip every config that still has useBusinessHours = false
    const result = await db
      .update(slaConfigurations)
      .set({ useBusinessHours: true, updatedAt: new Date() })
      .where(eq(slaConfigurations.useBusinessHours, false))
      .returning({ id: slaConfigurations.id });

    if (result.length > 0) {
      log(`Enabled business-hours SLA on ${result.length} config(s) — weekends now excluded`, "startup");
    }
  } catch (error) {
    console.error("Failed to migrate SLA configs to business hours:", error);
  }
}

// Fix department types for vendorHandle and customer fields on startup
async function fixFieldDepartmentTypes() {
  try {
    const existingFields = await storage.getTicketFieldConfigurations();

    // Fix vendorHandle to be Seller Support only
    const vendorHandleField = existingFields.find(f => f.fieldName === "vendorHandle");
    if (vendorHandleField && vendorHandleField.departmentType !== "Seller Support") {
      await storage.updateTicketFieldConfiguration(vendorHandleField.id, {
        departmentType: "Seller Support",
      });
      log(`Fixed vendorHandle departmentType: ${vendorHandleField.departmentType} -> Seller Support`, "startup");
    }

    // Fix customer to be Customer Support only, or create if missing
    const customerField = existingFields.find(f => f.fieldName === "customer");
    if (customerField && customerField.departmentType !== "Customer Support") {
      await storage.updateTicketFieldConfiguration(customerField.id, {
        departmentType: "Customer Support",
      });
      log(`Fixed customer departmentType: ${customerField.departmentType} -> Customer Support`, "startup");
    } else if (!customerField) {
      // Customer field doesn't exist - create it
      await storage.createTicketFieldConfiguration({
        fieldName: "customer",
        fieldLabel: "Customer",
        fieldType: "text",
        departmentType: "Customer Support",
        isEnabled: true,
        isRequired: true,
        displayOrder: 1,
        metadata: {
          placeholder: "Enter customer name or ID",
          helpText: "The customer associated with this ticket",
        },
      });
      log(`Created missing customer field with departmentType: Customer Support`, "startup");
    }
  } catch (error) {
    console.error("Failed to fix field department types:", error);
  }
}

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

      log(logLine);
    }
  });

  next();
});

(async () => {
  await registerRoutes(httpServer, app);

  // Ensure all default departments exist (creates any missing ones, e.g. Marketplace, Supply)
  await ensureDefaultDepartments();

  // Migrate SLA configs to exclude weekends from SLA calculations
  await ensureBusinessHoursSla();

  // Fix field department types on startup
  await fixFieldDepartmentTypes();

  // Start Slack daily report scheduler (fires at 08:00 PKT / 03:00 UTC)
  startDailyReportScheduler();

  app.use((err: any, _req: Request, res: Response, next: NextFunction) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";

    console.error("Internal Server Error:", err);

    if (res.headersSent) {
      return next(err);
    }

    return res.status(status).json({ message });
  });

  // importantly only setup vite in development and after
  // setting up all the other routes so the catch-all route
  // doesn't interfere with the other routes
  if (process.env.NODE_ENV === "production") {
    serveStatic(app);
  } else {
    const { setupVite } = await import("./vite");
    await setupVite(httpServer, app);
  }

  // ALWAYS serve the app on the port specified in the environment variable PORT
  // Other ports are firewalled. Default to 5001 (5000 blocked by macOS AirPlay).
  // this serves both the API and the client.
  // It is the only port that is not firewalled.
  const port = parseInt(process.env.PORT || "5001", 10);
  httpServer.listen(
    {
      port,
      host: "localhost",
    },
    () => {
      log(`serving on port ${port}`);
    },
  );
})();
