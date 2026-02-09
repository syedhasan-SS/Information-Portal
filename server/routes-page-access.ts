import type { Express } from "express";
import { storage } from "./storage";

export function registerPageAccessRoutes(app: Express) {
  // Get all pages
  app.get("/api/page-access/pages", async (req, res) => {
    try {
      const userEmail = req.headers["x-user-email"] as string;
      if (!userEmail) {
        return res.status(401).json({ error: "Authentication required" });
      }

      const user = await storage.getUserByEmail(userEmail);
      if (!user || (user.role !== "Owner" && user.role !== "Admin")) {
        return res.status(403).json({ error: "Access denied. Owner/Admin only." });
      }

      const pages = await storage.getAllPages();
      res.json(pages);
    } catch (error: any) {
      console.error("Get pages error:", error);
      res.status(500).json({ error: error.message });
    }
  });

  // Get features for a specific page
  app.get("/api/page-access/features/:pageKey", async (req, res) => {
    try {
      const userEmail = req.headers["x-user-email"] as string;
      if (!userEmail) {
        return res.status(401).json({ error: "Authentication required" });
      }

      const user = await storage.getUserByEmail(userEmail);
      if (!user || (user.role !== "Owner" && user.role !== "Admin")) {
        return res.status(403).json({ error: "Access denied. Owner/Admin only." });
      }

      const features = await storage.getPageFeatures(req.params.pageKey);
      res.json(features);
    } catch (error: any) {
      console.error("Get features error:", error);
      res.status(500).json({ error: error.message });
    }
  });

  // Get role's page and feature access
  app.get("/api/page-access/roles/:roleId", async (req, res) => {
    try {
      const userEmail = req.headers["x-user-email"] as string;
      if (!userEmail) {
        return res.status(401).json({ error: "Authentication required" });
      }

      const user = await storage.getUserByEmail(userEmail);
      if (!user || (user.role !== "Owner" && user.role !== "Admin")) {
        return res.status(403).json({ error: "Access denied. Owner/Admin only." });
      }

      const pages = await storage.getRolePageAccess(req.params.roleId);
      const features = await storage.getRoleFeatureAccess(req.params.roleId);

      res.json({ pages, features });
    } catch (error: any) {
      console.error("Get role access error:", error);
      res.status(500).json({ error: error.message });
    }
  });

  // Update role's page access (bulk)
  app.put("/api/page-access/roles/:roleId/pages", async (req, res) => {
    try {
      const userEmail = req.headers["x-user-email"] as string;
      if (!userEmail) {
        return res.status(401).json({ error: "Authentication required" });
      }

      const user = await storage.getUserByEmail(userEmail);
      if (!user || (user.role !== "Owner" && user.role !== "Admin")) {
        return res.status(403).json({ error: "Access denied. Owner/Admin only." });
      }

      const { pages } = req.body; // { pageKey: boolean }

      for (const [pageKey, isEnabled] of Object.entries(pages)) {
        await storage.setRolePageAccess(req.params.roleId, pageKey, isEnabled as boolean);
      }

      res.json({ message: "Page access updated successfully" });
    } catch (error: any) {
      console.error("Update role page access error:", error);
      res.status(500).json({ error: error.message });
    }
  });

  // Update role's feature access (bulk)
  app.put("/api/page-access/roles/:roleId/features", async (req, res) => {
    try {
      const userEmail = req.headers["x-user-email"] as string;
      if (!userEmail) {
        return res.status(401).json({ error: "Authentication required" });
      }

      const user = await storage.getUserByEmail(userEmail);
      if (!user || (user.role !== "Owner" && user.role !== "Admin")) {
        return res.status(403).json({ error: "Access denied. Owner/Admin only." });
      }

      const { features } = req.body; // { "pageKey:featureKey": boolean }

      for (const [key, isEnabled] of Object.entries(features)) {
        const [pageKey, featureKey] = key.split(":");
        await storage.setRoleFeatureAccess(req.params.roleId, pageKey, featureKey, isEnabled as boolean);
      }

      res.json({ message: "Feature access updated successfully" });
    } catch (error: any) {
      console.error("Update role feature access error:", error);
      res.status(500).json({ error: error.message });
    }
  });

  // Get user's overrides
  app.get("/api/page-access/users/:userId", async (req, res) => {
    try {
      const userEmail = req.headers["x-user-email"] as string;
      if (!userEmail) {
        return res.status(401).json({ error: "Authentication required" });
      }

      const user = await storage.getUserByEmail(userEmail);
      if (!user || (user.role !== "Owner" && user.role !== "Admin")) {
        return res.status(403).json({ error: "Access denied. Owner/Admin only." });
      }

      const pageOverrides = await storage.getUserPageOverrides(req.params.userId);
      const featureOverrides = await storage.getUserFeatureOverrides(req.params.userId);

      res.json({ pageOverrides, featureOverrides });
    } catch (error: any) {
      console.error("Get user overrides error:", error);
      res.status(500).json({ error: error.message });
    }
  });

  // Set user's page override
  app.post("/api/page-access/users/:userId/pages", async (req, res) => {
    try {
      const userEmail = req.headers["x-user-email"] as string;
      if (!userEmail) {
        return res.status(401).json({ error: "Authentication required" });
      }

      const user = await storage.getUserByEmail(userEmail);
      if (!user || (user.role !== "Owner" && user.role !== "Admin")) {
        return res.status(403).json({ error: "Access denied. Owner/Admin only." });
      }

      const { pageKey, isEnabled, reason } = req.body;

      await storage.setUserPageOverride(req.params.userId, pageKey, isEnabled, reason, user.id);

      res.json({ message: "User page override set successfully" });
    } catch (error: any) {
      console.error("Set user page override error:", error);
      res.status(500).json({ error: error.message });
    }
  });

  // Delete user's page override
  app.delete("/api/page-access/users/:userId/pages/:pageKey", async (req, res) => {
    try {
      const userEmail = req.headers["x-user-email"] as string;
      if (!userEmail) {
        return res.status(401).json({ error: "Authentication required" });
      }

      const user = await storage.getUserByEmail(userEmail);
      if (!user || (user.role !== "Owner" && user.role !== "Admin")) {
        return res.status(403).json({ error: "Access denied. Owner/Admin only." });
      }

      await storage.deleteUserPageOverride(req.params.userId, req.params.pageKey);

      res.json({ message: "User page override deleted successfully" });
    } catch (error: any) {
      console.error("Delete user page override error:", error);
      res.status(500).json({ error: error.message });
    }
  });

  // Get current user's effective access
  app.get("/api/page-access/my-access", async (req, res) => {
    try {
      const userEmail = req.headers["x-user-email"] as string;
      if (!userEmail) {
        return res.status(401).json({ error: "Authentication required" });
      }

      const user = await storage.getUserByEmail(userEmail);
      if (!user) {
        return res.status(401).json({ error: "User not found" });
      }

      const pages = await storage.getUserEffectivePageAccess(user.id);
      const features = await storage.getUserEffectiveFeatureAccess(user.id);

      res.json({ pages, features });
    } catch (error: any) {
      console.error("Get my access error:", error);
      res.status(500).json({ error: error.message });
    }
  });

  // Get specific user's access (with overrides marked)
  app.get("/api/page-access/users/:userId/access", async (req, res) => {
    try {
      const userEmail = req.headers["x-user-email"] as string;
      if (!userEmail) {
        return res.status(401).json({ error: "Authentication required" });
      }

      const user = await storage.getUserByEmail(userEmail);
      if (!user || (user.role !== "Owner" && user.role !== "Admin")) {
        return res.status(403).json({ error: "Access denied. Owner/Admin only." });
      }

      const pageOverrides = await storage.getUserPageOverrides(req.params.userId);
      const featureOverrides = await storage.getUserFeatureOverrides(req.params.userId);

      // Convert arrays to objects for easier lookup
      const pages: Record<string, boolean> = {};
      pageOverrides.forEach((override: any) => {
        pages[override.pageKey] = override.isEnabled;
      });

      const features: Record<string, Record<string, boolean>> = {};
      featureOverrides.forEach((override: any) => {
        if (!features[override.pageKey]) {
          features[override.pageKey] = {};
        }
        features[override.pageKey][override.featureKey] = override.isEnabled;
      });

      res.json({ pages, features });
    } catch (error: any) {
      console.error("Get user access error:", error);
      res.status(500).json({ error: error.message });
    }
  });

  // Update user's page access (bulk)
  app.put("/api/page-access/users/:userId/pages", async (req, res) => {
    try {
      const userEmail = req.headers["x-user-email"] as string;
      if (!userEmail) {
        return res.status(401).json({ error: "Authentication required" });
      }

      const user = await storage.getUserByEmail(userEmail);
      if (!user || (user.role !== "Owner" && user.role !== "Admin")) {
        return res.status(403).json({ error: "Access denied. Owner/Admin only." });
      }

      const { pages } = req.body; // { pageKey: boolean }

      for (const [pageKey, isEnabled] of Object.entries(pages)) {
        await storage.setUserPageOverride(req.params.userId, pageKey, isEnabled as boolean, "Set by admin", user.id);
      }

      res.json({ message: "User page access updated successfully" });
    } catch (error: any) {
      console.error("Update user page access error:", error);
      res.status(500).json({ error: error.message });
    }
  });

  // Get user's feature access for a specific page
  app.get("/api/page-access/users/:userId/features/:pageKey", async (req, res) => {
    try {
      const userEmail = req.headers["x-user-email"] as string;
      if (!userEmail) {
        return res.status(401).json({ error: "Authentication required" });
      }

      const user = await storage.getUserByEmail(userEmail);
      if (!user || (user.role !== "Owner" && user.role !== "Admin")) {
        return res.status(403).json({ error: "Access denied. Owner/Admin only." });
      }

      const featureOverrides = await storage.getUserFeatureOverrides(req.params.userId);
      const filtered = featureOverrides.filter((f: any) => f.pageKey === req.params.pageKey);

      const features: Record<string, boolean> = {};
      filtered.forEach((override: any) => {
        features[override.featureKey] = override.isEnabled;
      });

      res.json({ features });
    } catch (error: any) {
      console.error("Get user features error:", error);
      res.status(500).json({ error: error.message });
    }
  });

  // Update user's feature access (bulk)
  app.put("/api/page-access/users/:userId/features", async (req, res) => {
    try {
      const userEmail = req.headers["x-user-email"] as string;
      if (!userEmail) {
        return res.status(401).json({ error: "Authentication required" });
      }

      const user = await storage.getUserByEmail(userEmail);
      if (!user || (user.role !== "Owner" && user.role !== "Admin")) {
        return res.status(403).json({ error: "Access denied. Owner/Admin only." });
      }

      const { pageKey, features } = req.body; // { featureKey: boolean }

      for (const [featureKey, isEnabled] of Object.entries(features)) {
        await storage.setUserFeatureOverride(req.params.userId, pageKey, featureKey, isEnabled as boolean, "Set by admin", user.id);
      }

      res.json({ message: "User feature access updated successfully" });
    } catch (error: any) {
      console.error("Update user feature access error:", error);
      res.status(500).json({ error: error.message });
    }
  });
}
