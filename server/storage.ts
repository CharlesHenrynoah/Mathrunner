import { User, InsertUser, GameRecord } from "@shared/schema";
import session from "express-session";
import createMemoryStore from "memorystore";
import fs from "fs/promises";
import path from "path";

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

export class JsonStorage implements IStorage {
  private dataDir: string;
  sessionStore: session.Store;
  private currentId: number;
  private currentGameRecordId: number;

  constructor() {
    this.dataDir = path.join(process.cwd(), 'data');
    this.ensureDataDir();
    this.currentId = this.getCurrentMaxId();
    this.currentGameRecordId = this.getCurrentMaxGameRecordId();
    this.sessionStore = new MemoryStore({
      checkPeriod: 86400000,
    });
  }

  private async ensureDataDir() {
    try {
      await fs.mkdir(this.dataDir, { recursive: true });
    } catch (error) {
      console.error('Error creating data directory:', error);
    }
  }

  private getCurrentMaxId(): number {
    return 1; // TODO: Implement by scanning user files
  }

  private getCurrentMaxGameRecordId(): number {
    return 1; // TODO: Implement by scanning game records
  }

  private getUserFilePath(userId: number): string {
    return path.join(this.dataDir, `user_${userId}.json`);
  }

  private getGameRecordsFilePath(userId: number): string {
    return path.join(this.dataDir, `game_records_${userId}.json`);
  }

  async getUser(id: number): Promise<User | undefined> {
    try {
      const data = await fs.readFile(this.getUserFilePath(id), 'utf-8');
      return JSON.parse(data);
    } catch {
      return undefined;
    }
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    try {
      const files = await fs.readdir(this.dataDir);
      for (const file of files) {
        if (file.startsWith('user_')) {
          const data = await fs.readFile(path.join(this.dataDir, file), 'utf-8');
          const user = JSON.parse(data);
          if (user.username === username) {
            return user;
          }
        }
      }
      return undefined;
    } catch {
      return undefined;
    }
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const id = ++this.currentId;
    const user: User = {
      ...insertUser,
      id,
      currentLevel: 1,
      totalScore: 0,
      gamesPlayed: 0,
      bestScore: 0
    };

    await fs.writeFile(
      this.getUserFilePath(id),
      JSON.stringify(user, null, 2)
    );

    // Initialize empty game records file
    await fs.writeFile(
      this.getGameRecordsFilePath(id),
      JSON.stringify([], null, 2)
    );

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

    await fs.writeFile(
      this.getUserFilePath(userId),
      JSON.stringify(updatedUser, null, 2)
    );

    return updatedUser;
  }

  async addGameRecord(record: Omit<GameRecord, "id" | "createdAt">): Promise<GameRecord> {
    const id = ++this.currentGameRecordId;
    const gameRecord: GameRecord = {
      ...record,
      id,
      createdAt: new Date()
    };

    const records = await this.getGameRecords(record.userId);
    records.push(gameRecord);

    await fs.writeFile(
      this.getGameRecordsFilePath(record.userId),
      JSON.stringify(records, null, 2)
    );

    return gameRecord;
  }

  async getGameRecords(userId: number): Promise<GameRecord[]> {
    try {
      const data = await fs.readFile(this.getGameRecordsFilePath(userId), 'utf-8');
      return JSON.parse(data);
    } catch {
      return [];
    }
  }

  async getUserStats(userId: number): Promise<GameRecord[]> {
    return this.getGameRecords(userId);
  }
}

export const storage = new JsonStorage();