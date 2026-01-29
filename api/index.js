const express = require("express");
const path = require("path");
const { createServer } = require("http");

const app = express();

// JSON and URL-encoded body parsing
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

// Import and register routes
let routesRegistered = false;
let registerPromise = null;

async function ensureRoutesRegistered() {
  if (!registerPromise) {
    registerPromise = (async () => {
      if (routesRegistered) return;

      try {
        // Dynamic import of routes (will be compiled from TypeScript)
        const { registerRoutes } = require("../server/routes");
        const mockServer = createServer();

        await registerRoutes(mockServer, app);

        // Serve static files from dist/public
        const distPath = path.join(process.cwd(), "dist", "public");
        app.use(express.static(distPath));

        // Fallback to index.html for client-side routing
        app.get("*", (_req, res) => {
          res.sendFile(path.join(distPath, "index.html"));
        });

        routesRegistered = true;
        console.log("Routes registered successfully");
      } catch (error) {
        console.error("Error registering routes:", error);
        throw error;
      }
    })();
  }

  return registerPromise;
}

// Vercel serverless function handler
module.exports = async (req, res) => {
  try {
    await ensureRoutesRegistered();

    // Handle the request with Express
    return new Promise((resolve, reject) => {
      app(req, res, (err) => {
        if (err) {
          console.error("Request handler error:", err);
          reject(err);
        } else {
          resolve();
        }
      });
    });
  } catch (error) {
    console.error("Fatal error:", error);
    res.status(500).json({
      error: "Internal server error",
      message: error.message
    });
  }
};
