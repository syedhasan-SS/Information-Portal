import express from "express";
import type { Request, Response, NextFunction } from "express";
import type { VercelRequest, VercelResponse } from "@vercel/node";
import { createServer } from "http";
import path from "path";
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

app.use((req, res, next) => {
  const start = Date.now();
  const reqPath = req.path;
  let capturedJsonResponse: Record<string, any> | undefined = undefined;

  const originalResJson = res.json;
  res.json = function (bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };

  res.on("finish", () => {
    const duration = Date.now() - start;
    if (reqPath.startsWith("/api")) {
      let logLine = `${req.method} ${reqPath} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }

      if (logLine.length > 80) {
        logLine = logLine.slice(0, 79) + "…";
      }

      console.log(logLine);
    }
  });

  next();
});

// Initialize routes
let routesInitialized: Promise<void> | null = null;

function initRoutes() {
  if (!routesInitialized) {
    routesInitialized = (async () => {
      const mockServer = createServer();
      await registerRoutes(mockServer, app);

      // Serve static files from dist/public
      const distPath = path.join(process.cwd(), "dist", "public");
      app.use(express.static(distPath));

      // Fall through to index.html for client-side routing
      app.get("*", (_req, res, next) => {
        try {
          res.sendFile(path.join(distPath, "index.html"));
        } catch (error) {
          next(error);
        }
      });

      // Error handler (must be last)
      app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
        const status = err.status || err.statusCode || 500;
        const message = err.message || "Internal Server Error";
        console.error(`Error: ${message}`);
        res.status(status).json({ message });
      });
    })();
  }
  return routesInitialized;
}

// Export handler for Vercel
export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    // Initialize routes on first request
    await initRoutes();

    return new Promise((resolve, reject) => {
      app(req as any, res as any, (err: any) => {
        if (err) {
          console.error("Handler error:", err);
          reject(err);
        } else {
          resolve(undefined);
        }
      });
    });
  } catch (error: any) {
    console.error("Initialization error:", error);
    res.status(500).send(`Initialization error: ${error.message}`);
  }
}
