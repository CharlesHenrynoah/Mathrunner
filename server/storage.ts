import { User, InsertUser, GameRecord } from "@shared/schema";
import session from "express-session";
import createMemoryStore from "memorystore";

const MemoryStore = createMemoryStore(session);

export interface IStorage {
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  updateUserStats(userId: number, score: number, level: number): Promise<User>;
  addGameRecord(record: Omit<GameRecord, "id" | "createdAt">): Promise<GameRecord>;
  getUserStats(userId: number): Promise<GameRecord[]>;
  getGameRecords(userId: number): Promise<GameRecord[]>;
  sessionStore: session.Store;
}

export class MemStorage implements IStorage {
  private users: Map<number, User>;
  private gameRecords: Map<number, GameRecord>;
  private currentId: number;
  private currentGameRecordId: number;
  sessionStore: session.Store;

  constructor() {
    this.users = new Map();
    this.gameRecords = new Map();
    this.currentId = 1;
    this.currentGameRecordId = 1;
    this.sessionStore = new MemoryStore({
      checkPeriod: 86400000,
    });
  }

  async getUser(id: number): Promise<User | undefined> {
    return this.users.get(id);
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(
      (user) => user.username === username,
    );
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const id = this.currentId++;
    const user: User = {
      ...insertUser,
      id,
      currentLevel: 1,
      totalScore: 0,
      gamesPlayed: 0,
      bestScore: 0
    };
    this.users.set(id, user);
    return user;
  }

  async updateUserStats(userId: number, score: number, level: number): Promise<User> {
    const user = await this.getUser(userId);
    if (!user) throw new Error("User not found");

    const updatedUser: User = {
      ...user,
      currentLevel: Math.max(user.currentLevel, level),
      totalScore: user.totalScore + score,
      gamesPlayed: user.gamesPlayed + 1,
      bestScore: Math.max(user.bestScore, score)
    };

    this.users.set(userId, updatedUser);
    return updatedUser;
  }

  async addGameRecord(record: Omit<GameRecord, "id" | "createdAt">): Promise<GameRecord> {
    const id = this.currentGameRecordId++;
    const gameRecord: GameRecord = {
      ...record,
      id,
      createdAt: new Date()
    };
    this.gameRecords.set(id, gameRecord);
    return gameRecord;
  }

  async getUserStats(userId: number): Promise<GameRecord[]> {
    return Array.from(this.gameRecords.values())
      .filter(record => record.userId === userId)
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  }

  async getGameRecords(userId: number): Promise<GameRecord[]> {
    return Array.from(this.gameRecords.values())
      .filter(record => record.userId === userId)
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  }
}

export const storage = new MemStorage();