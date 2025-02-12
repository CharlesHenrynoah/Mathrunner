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

    const {
      score,
      level,
      problemType,
      totalQuestions,
      totalCorrect,
      totalIncorrect,
      avgResponseTime,
      additionCorrect,
      additionTotal,
      subtractionCorrect,
      subtractionTotal,
      multiplicationCorrect,
      multiplicationTotal,
      divisionCorrect,
      divisionTotal,
      powerCorrect,
      powerTotal,
      algebraCorrect,
      algebraTotal
    } = req.body;

    const gameRecord = await storage.addGameRecord({
      userId: req.user.id,
      score,
      level,
      problemType,
      totalQuestions,
      totalCorrect,
      totalIncorrect,
      avgResponseTime,
      additionCorrect,
      additionTotal,
      subtractionCorrect,
      subtractionTotal,
      multiplicationCorrect,
      multiplicationTotal,
      divisionCorrect,
      divisionTotal,
      powerCorrect,
      powerTotal,
      algebraCorrect,
      algebraTotal
    });

    // Update user stats with the new game data
    const updatedUser = await storage.updateUserStats(req.user.id, score, level);
    req.login(updatedUser, (err) => {
      if (err) return res.status(500).send(err.message);
      res.json({
        gameRecord,
        leveledUp: false,
        newLevel: level
      });
    });
  });

  const httpServer = createServer(app);
  return httpServer;
}