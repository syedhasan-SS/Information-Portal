import "dotenv/config";
import express, { type Request, Response, NextFunction } from "express";
import { registerRoutes } from "./routes";
import { serveStatic } from "./static";
import { createServer } from "http";
import { storage } from "./storage";

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

  // Fix field department types on startup
  await fixFieldDepartmentTypes();

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
  // Other ports are firewalled. Default to 5000 if not specified.
  // this serves both the API and the client.
  // It is the only port that is not firewalled.
  const port = parseInt(process.env.PORT || "5000", 10);
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
