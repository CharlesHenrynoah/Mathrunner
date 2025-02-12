import { pgTable, text, serial, integer, timestamp, real } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  email: text("email").notNull().unique(),
  password: text("password").notNull(),
  currentLevel: integer("current_level").notNull().default(1),
  totalScore: integer("total_score").notNull().default(0),
  gamesPlayed: integer("games_played").notNull().default(0),
  bestScore: integer("best_score").notNull().default(0)
});

export const gameRecords = pgTable("game_records", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  score: integer("score").notNull(),
  level: integer("level").notNull(),
  problemType: text("problem_type").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  totalQuestions: integer("total_questions").notNull(),
  totalCorrect: integer("total_correct").notNull(),
  totalIncorrect: integer("total_incorrect").notNull(),
  avgResponseTime: real("avg_response_time").notNull(),
  additionCorrect: integer("addition_correct").notNull().default(0),
  additionTotal: integer("addition_total").notNull().default(0),
  subtractionCorrect: integer("subtraction_correct").notNull().default(0),
  subtractionTotal: integer("subtraction_total").notNull().default(0),
  multiplicationCorrect: integer("multiplication_correct").notNull().default(0),
  multiplicationTotal: integer("multiplication_total").notNull().default(0),
  divisionCorrect: integer("division_correct").notNull().default(0),
  divisionTotal: integer("division_total").notNull().default(0),
  powerCorrect: integer("power_correct").notNull().default(0),
  powerTotal: integer("power_total").notNull().default(0),
  algebraCorrect: integer("algebra_correct").notNull().default(0),
  algebraTotal: integer("algebra_total").notNull().default(0)
});

// Schema pour la connexion
export const loginSchema = z.object({
  username: z.string().min(1, "Le nom d'utilisateur est requis"),
  password: z.string().min(1, "Le mot de passe est requis")
});

// Schema pour l'inscription
export const insertUserSchema = createInsertSchema(users)
  .pick({
    username: true,
    email: true,
    password: true
  })
  .extend({
    confirmPassword: z.string()
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Les mots de passe ne correspondent pas",
    path: ["confirmPassword"],
  });

export const insertGameRecordSchema = createInsertSchema(gameRecords);

export type InsertUser = z.infer<typeof insertUserSchema>;
export type LoginData = z.infer<typeof loginSchema>;
export type User = typeof users.$inferSelect;
export type GameRecord = typeof gameRecords.$inferSelect;

// Types pour les statistiques calculées
export interface GameStats {
  bestScore: number;
  avgScore: number;
  totalGames: number;
  totalCorrect: number;
  totalQuestions: number;
  totalIncorrect: number;
  avgResponseTime: number;
  overallAccuracy: number;
  typeStats: {
    addition: { correct: number; total: number; accuracy: number };
    subtraction: { correct: number; total: number; accuracy: number };
    multiplication: { correct: number; total: number; accuracy: number };
    division: { correct: number; total: number; accuracy: number };
    power: { correct: number; total: number; accuracy: number };
    algebra: { correct: number; total: number; accuracy: number };
  };
  lastGame: {
    score: number;
    level: number;
    correct: number;
    incorrect: number;
    responseTime: number;
    bestType: string;
  };
  recentGames: Array<{
    id: number;
    score: number;
    level: number;
    problemType: string;
    createdAt: string;
  }>;
}