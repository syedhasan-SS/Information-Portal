import "dotenv/config";
import express from "express";
import type { Request, Response, NextFunction } from "express";
import type { VercelRequest, VercelResponse } from "@vercel/node";
import { createServer } from "http";
import path from "path";
import fs from "fs";
import { registerRoutes } from "../server/routes";

const app = express();

app.use(
  express.json({
    verify: (req: any, _res, buf) => {
      req.rawBody = buf;
    },
  }),
);

app.use(express.urlencoded({ extended: false }));

function log(message: string, source = "express") {
  const formattedTime = new Date().toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
    hour12: true,
  });

  console.log(`${formattedTime} [${source}] ${message}`);
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

      if (logLine.length > 80) {
        logLine = logLine.slice(0, 79) + "…";
      }

      log(logLine);
    }
  });

  next();
});

// Initialize routes asynchronously
let routesInitialized = false;
const initPromise = (async () => {
  try {
    const mockServer = createServer();
    await registerRoutes(mockServer, app);
    routesInitialized = true;
    log("Routes initialized successfully");
  } catch (error: any) {
    log(`Error initializing routes: ${error.message}`);
    throw error;
  }
})();

// Serve static files from dist/public if it exists
const distPath = path.join(process.cwd(), "dist", "public");
if (fs.existsSync(distPath)) {
  app.use(express.static(distPath));
  log(`Serving static files from ${distPath}`);
} else {
  log(`Warning: Static files directory not found at ${distPath}`);
}

// Fall through to index.html for client-side routing
app.get("*", (_req, res, next) => {
  const indexPath = path.join(distPath, "index.html");
  if (fs.existsSync(indexPath)) {
    res.sendFile(indexPath);
  } else {
    next(); // Let error handler handle it
  }
});

// Error handler (must be last)
app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
  const status = err.status || err.statusCode || 500;
  const message = err.message || "Internal Server Error";
  log(`Error: ${message}`);
  res.status(status).json({ message });
});

// Export handler for Vercel
export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Wait for routes to be initialized
  await initPromise;

  return new Promise((resolve, reject) => {
    app(req as any, res as any, (err: any) => {
      if (err) {
        reject(err);
      } else {
        resolve(undefined);
      }
    });
  });
}
