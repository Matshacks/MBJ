import { botConfigs, logEntries, type BotConfig, type InsertBotConfig, type LogEntry, type InsertLogEntry } from "@shared/schema";

export interface IStorage {
  getBotConfig(id?: number): Promise<BotConfig | undefined>;
  updateBotConfig(config: InsertBotConfig, id?: number): Promise<BotConfig>;
  getAllBotConfigs(): Promise<BotConfig[]>;
  createBotConfig(config: InsertBotConfig): Promise<BotConfig>;
  deleteBotConfig(id: number): Promise<void>;
  updateBotStatus(id: number, isActive: boolean): Promise<void>;
  createLogEntry(entry: InsertLogEntry): Promise<LogEntry>;
  getLogEntries(limit?: number): Promise<LogEntry[]>;
  clearLogEntries(): Promise<void>;
}

export class MemStorage implements IStorage {
  private botConfigs: Map<number, BotConfig>;
  private logs: Map<number, LogEntry>;
  private currentBotId: number;
  private currentLogId: number;

  constructor() {
    this.botConfigs = new Map();
    this.logs = new Map();
    this.currentBotId = 1;
    this.currentLogId = 1;
    
    // Initialize with default bot config
    this.botConfigs.set(1, {
      id: 1,
      username: "MinecraftBot_01",
      serverIp: "example.com",
      serverPort: 12345,
      autoReconnect: true,
      reconnectInterval: 30,
      maxReconnectAttempts: 10,
      logLevel: "info",
      wanderEnabled: false,
      chatEnabled: false,
      useRandomNames: false,
      isActive: false,
    });
  }

  async getBotConfig(id?: number): Promise<BotConfig | undefined> {
    if (id) {
      return this.botConfigs.get(id);
    }
    return this.botConfigs.get(1);
  }

  async getAllBotConfigs(): Promise<BotConfig[]> {
    return Array.from(this.botConfigs.values());
  }

  async createBotConfig(config: InsertBotConfig): Promise<BotConfig> {
    const id = ++this.currentBotId;
    const newConfig: BotConfig = { 
      id, 
      username: config.username || "MinecraftBot",
      serverIp: config.serverIp || "example.com", 
      serverPort: config.serverPort || 12345,
      autoReconnect: config.autoReconnect ?? true,
      reconnectInterval: config.reconnectInterval || 30,
      maxReconnectAttempts: config.maxReconnectAttempts || 10,
      logLevel: config.logLevel || "info",
      wanderEnabled: config.wanderEnabled ?? false,
      chatEnabled: config.chatEnabled ?? false,
      useRandomNames: config.useRandomNames ?? false,
      isActive: config.isActive ?? false,
    };
    this.botConfigs.set(id, newConfig);
    return newConfig;
  }

  async updateBotConfig(config: InsertBotConfig, id?: number): Promise<BotConfig> {
    const configId = id || 1;
    const existing = this.botConfigs.get(configId);
    if (existing) {
      const updated = { ...existing, ...config };
      this.botConfigs.set(configId, updated);
      return updated;
    }
    throw new Error('Bot config not found');
  }

  async deleteBotConfig(id: number): Promise<void> {
    this.botConfigs.delete(id);
  }

  async updateBotStatus(id: number, isActive: boolean): Promise<void> {
    const config = this.botConfigs.get(id);
    if (config) {
      config.isActive = isActive;
      this.botConfigs.set(id, config);
    }
  }

  async createLogEntry(entry: InsertLogEntry): Promise<LogEntry> {
    const id = this.currentLogId++;
    const logEntry: LogEntry = {
      id,
      timestamp: new Date(),
      ...entry,
    };
    this.logs.set(id, logEntry);
    return logEntry;
  }

  async getLogEntries(limit = 100): Promise<LogEntry[]> {
    const entries = Array.from(this.logs.values())
      .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
      .slice(0, limit);
    return entries.reverse();
  }

  async clearLogEntries(): Promise<void> {
    this.logs.clear();
    this.currentLogId = 1;
  }
}

export const storage = new MemStorage();
