// Simple wrapper to serve the built Express app
const path = require("path");
const distPath = path.join(__dirname, "dist", "index.cjs");

// Load and export the built server
const app = require(distPath);

module.exports = app;
