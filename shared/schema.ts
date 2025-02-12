import { pgTable, text, serial, integer, timestamp } from "drizzle-orm/pg-core";
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
  createdAt: timestamp("created_at").notNull().defaultNow()
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