import type { Express } from "express";
import { createServer, type Server } from "http";
import { setupAuth } from "./auth";
import { storage } from "./storage";

export function registerRoutes(app: Express): Server {
  setupAuth(app);

  app.get("/api/stats", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);

    // Récupérer tous les enregistrements de jeu de l'utilisateur
    const records = await storage.getGameRecords(req.user.id);

    if (!records || records.length === 0) {
      return res.json({
        bestScore: 0,
        avgScore: 0,
        totalGames: 0,
        totalCorrect: 0,
        totalQuestions: 0,
        totalIncorrect: 0,
        avgResponseTime: 0,
        overallAccuracy: 0,
        typeStats: {
          addition: { correct: 0, total: 0, accuracy: 0 },
          subtraction: { correct: 0, total: 0, accuracy: 0 },
          multiplication: { correct: 0, total: 0, accuracy: 0 },
          division: { correct: 0, total: 0, accuracy: 0 },
          power: { correct: 0, total: 0, accuracy: 0 },
          algebra: { correct: 0, total: 0, accuracy: 0 }
        },
        lastGame: {
          score: 0,
          level: 0,
          correct: 0,
          incorrect: 0,
          responseTime: 0,
          bestType: "-"
        },
        recentGames: []
      });
    }

    // Calculer les statistiques globales
    const totalGames = records.length;
    const bestScore = Math.max(...records.map(r => r.score));
    const avgScore = Math.round(records.reduce((sum, r) => sum + r.score, 0) / totalGames);
    const totalCorrect = records.reduce((sum, r) => sum + r.totalCorrect, 0);
    const totalQuestions = records.reduce((sum, r) => sum + r.totalQuestions, 0);
    const totalIncorrect = records.reduce((sum, r) => sum + r.totalIncorrect, 0);
    const avgResponseTime = Number((records.reduce((sum, r) => sum + r.avgResponseTime, 0) / totalGames).toFixed(2));
    const overallAccuracy = Math.round((totalCorrect / totalQuestions) * 100) || 0;

    // Calculer les statistiques par type
    const typeStats = {
      addition: { correct: 0, total: 0, accuracy: 0 },
      subtraction: { correct: 0, total: 0, accuracy: 0 },
      multiplication: { correct: 0, total: 0, accuracy: 0 },
      division: { correct: 0, total: 0, accuracy: 0 },
      power: { correct: 0, total: 0, accuracy: 0 },
      algebra: { correct: 0, total: 0, accuracy: 0 }
    };

    records.forEach(record => {
      typeStats.addition.correct += record.additionCorrect;
      typeStats.addition.total += record.additionTotal;
      typeStats.subtraction.correct += record.subtractionCorrect;
      typeStats.subtraction.total += record.subtractionTotal;
      typeStats.multiplication.correct += record.multiplicationCorrect;
      typeStats.multiplication.total += record.multiplicationTotal;
      typeStats.division.correct += record.divisionCorrect;
      typeStats.division.total += record.divisionTotal;
      typeStats.power.correct += record.powerCorrect;
      typeStats.power.total += record.powerTotal;
      typeStats.algebra.correct += record.algebraCorrect;
      typeStats.algebra.total += record.algebraTotal;
    });

    // Calculer la précision pour chaque type
    Object.keys(typeStats).forEach(key => {
      const stats = typeStats[key as keyof typeof typeStats];
      stats.accuracy = Math.round((stats.correct / stats.total) * 100) || 0;
    });

    // Obtenir les données de la dernière partie
    const lastGame = records[records.length - 1];
    const lastGameStats = {
      score: lastGame.score,
      level: lastGame.level,
      correct: lastGame.totalCorrect,
      incorrect: lastGame.totalIncorrect,
      responseTime: Number(lastGame.avgResponseTime.toFixed(2)),
      bestType: getBestType(lastGame)
    };

    // Récupérer les parties récentes (limitées à 10)
    const recentGames = records
      .slice(-10)
      .reverse()
      .map(record => ({
        id: record.id,
        score: record.score,
        level: record.level,
        problemType: record.problemType,
        createdAt: record.createdAt.toISOString()
      }));

    res.json({
      bestScore,
      avgScore,
      totalGames,
      totalCorrect,
      totalQuestions,
      totalIncorrect,
      avgResponseTime,
      overallAccuracy,
      typeStats,
      lastGame: lastGameStats,
      recentGames
    });
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

function getBestType(game: any): string {
  const types = [
    { name: 'addition', correct: game.additionCorrect, total: game.additionTotal },
    { name: 'subtraction', correct: game.subtractionCorrect, total: game.subtractionTotal },
    { name: 'multiplication', correct: game.multiplicationCorrect, total: game.multiplicationTotal },
    { name: 'division', correct: game.divisionCorrect, total: game.divisionTotal },
    { name: 'power', correct: game.powerCorrect, total: game.powerTotal },
    { name: 'algebra', correct: game.algebraCorrect, total: game.algebraTotal }
  ];

  let bestType = '-';
  let bestAccuracy = 0;

  types.forEach(type => {
    if (type.total > 0) {
      const accuracy = (type.correct / type.total) * 100;
      if (accuracy > bestAccuracy) {
        bestAccuracy = accuracy;
        bestType = type.name;
      }
    }
  });

  return bestType;
}