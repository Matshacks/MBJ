import { pgTable, text, serial, integer, boolean, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const botConfigs = pgTable("bot_configs", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().default("MinecraftBot_01"),
  serverIp: text("server_ip").notNull().default("example.com"),
  serverPort: integer("server_port").notNull().default(12345),
  autoReconnect: boolean("auto_reconnect").notNull().default(true),
  reconnectInterval: integer("reconnect_interval").notNull().default(30),
  maxReconnectAttempts: integer("max_reconnect_attempts").notNull().default(10),
  logLevel: text("log_level").notNull().default("info"),
  // AI Settings
  wanderEnabled: boolean("wander_enabled").notNull().default(false),
  chatEnabled: boolean("chat_enabled").notNull().default(false),
  useRandomNames: boolean("use_random_names").notNull().default(false),
  isActive: boolean("is_active").notNull().default(false),
});

export const logEntries = pgTable("log_entries", {
  id: serial("id").primaryKey(),
  timestamp: timestamp("timestamp").notNull().defaultNow(),
  level: text("level").notNull(),
  message: text("message").notNull(),
});

export const insertBotConfigSchema = createInsertSchema(botConfigs).omit({
  id: true,
});

export const insertLogEntrySchema = createInsertSchema(logEntries).omit({
  id: true,
  timestamp: true,
});

export type InsertBotConfig = z.infer<typeof insertBotConfigSchema>;
export type BotConfig = typeof botConfigs.$inferSelect;
export type InsertLogEntry = z.infer<typeof insertLogEntrySchema>;
export type LogEntry = typeof logEntries.$inferSelect;

// WebSocket message types
export type BotStatus = {
  id: number;
  connected: boolean;
  username: string;
  uptime: number;
  reconnectCount: number;
  wandering: boolean;
  serverInfo?: {
    version: string;
    playerCount: string;
    ping: number;
  };
};

export type WSMessage = {
  type: 'bot_status' | 'log_entry' | 'server_info' | 'error' | 'bots_update';
  data: any;
  botId?: number;
};
