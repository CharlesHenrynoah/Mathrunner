import type { Express } from "express";
import { createServer, type Server } from "http";
import { setupAuth } from "./auth";
import { storage } from "./storage";

export function registerRoutes(app: Express): Server {
  setupAuth(app);

  app.get("/api/stats", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    const stats = await storage.getUserStats(req.user.id);
    res.json(stats);
  });

  app.post("/api/game/record", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    
    const { score, level, problemType } = req.body;
    const gameRecord = await storage.addGameRecord({
      userId: req.user.id,
      score,
      level,
      problemType
    });

    const updatedUser = await storage.updateUserStats(req.user.id, score, level);
    req.login(updatedUser, (err) => {
      if (err) return res.status(500).send(err.message);
      res.json(gameRecord);
    });
  });

  const httpServer = createServer(app);
  return httpServer;
}
