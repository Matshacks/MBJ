import type { Express } from "express";
import { createServer, type Server } from "http";
import { WebSocketServer, WebSocket } from "ws";
import { storage } from "./storage";
import { MinecraftBotService } from "./services/minecraftBot";
import { insertBotConfigSchema, insertLogEntrySchema, type WSMessage } from "@shared/schema";
import { z } from "zod";

const botServices = new Map<number, MinecraftBotService>();
const connectedClients = new Set<WebSocket>();

export async function registerRoutes(app: Express): Promise<Server> {
  // Don't automatically initialize bot service - it should only start when requested
  // This prevents automatic connection attempts that could crash the server

  // Get all bot configurations
  app.get("/api/bots", async (req, res) => {
    try {
      const configs = await storage.getAllBotConfigs();
      res.json(configs);
    } catch (error) {
      res.status(500).json({ message: "Failed to get bot configurations" });
    }
  });

  // Get single bot configuration
  app.get("/api/config/:id?", async (req, res) => {
    try {
      const id = req.params.id ? parseInt(req.params.id) : undefined;
      if (id) {
        const config = await storage.getBotConfig(id);
        res.json(config);
      } else {
        const config = await storage.getBotConfig();
        res.json(config);
      }
    } catch (error) {
      res.status(500).json({ message: "Failed to get configuration" });
    }
  });

  // Update bot configuration
  app.put("/api/config/:id?", async (req, res) => {
    try {
      const id = req.params.id ? parseInt(req.params.id) : undefined;
      const validatedConfig = insertBotConfigSchema.parse(req.body);
      const updatedConfig = await storage.updateBotConfig(validatedConfig, id);
      
      if (botServices.has(updatedConfig.id)) {
        const botService = botServices.get(updatedConfig.id);
        botService?.updateConfig(updatedConfig);
      }
      
      res.json(updatedConfig);
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({ message: "Invalid configuration", errors: error.errors });
      } else {
        res.status(500).json({ message: "Failed to update configuration" });
      }
    }
  });

  // Create new bot configuration
  app.post("/api/config", async (req, res) => {
    try {
      const validatedConfig = insertBotConfigSchema.parse(req.body);
      const newConfig = await storage.createBotConfig(validatedConfig);
      
      broadcastToClients({
        type: 'bots_update',
        data: await storage.getAllBotConfigs()
      });
      
      res.json(newConfig);
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({ message: "Invalid configuration", errors: error.errors });
      } else {
        res.status(500).json({ message: "Failed to create configuration" });
      }
    }
  });

  // Start bot
  app.post("/api/bot/:id/start", async (req, res) => {
    try {
      const botId = parseInt(req.params.id);
      const config = await storage.getBotConfig(botId);
      
      if (!config) {
        return res.status(400).json({ message: "Bot configuration not found" });
      }

      if (botServices.has(botId) && botServices.get(botId)?.isConnected()) {
        return res.status(400).json({ message: "Bot is already running" });
      }

      const botService = new MinecraftBotService(config);
      botServices.set(botId, botService);
      setupBotServiceEvents(botId, botService);

      await botService.start();
      await storage.updateBotStatus(botId, true);
      
      broadcastToClients({
        type: 'bots_update',
        data: await storage.getAllBotConfigs()
      });
      
      res.json({ message: "Bot start initiated", botId });
    } catch (error) {
      console.error('Error starting bot:', error);
      res.status(500).json({ message: "Failed to start bot" });
    }
  });

  // Stop bot
  app.post("/api/bot/:id/stop", async (req, res) => {
    try {
      const botId = parseInt(req.params.id);
      const botService = botServices.get(botId);
      
      if (!botService) {
        return res.status(400).json({ message: "Bot not found or not running" });
      }

      await botService.stop();
      botServices.delete(botId);
      await storage.updateBotStatus(botId, false);
      
      broadcastToClients({
        type: 'bots_update',
        data: await storage.getAllBotConfigs()
      });
      
      res.json({ message: "Bot stopped", botId });
    } catch (error) {
      console.error('Error stopping bot:', error);
      // Force cleanup even if stop fails
      try {
        const botId = parseInt(req.params.id);
        if (botServices.has(botId)) {
          await botServices.get(botId)?.stop();
          botServices.delete(botId);
          await storage.updateBotStatus(botId, false);
        }
      } catch (cleanupError) {
        console.error('Error during force cleanup:', cleanupError);
      }
      res.json({ message: "Bot force stopped" });
    }
  });

  // Get all bot statuses
  app.get("/api/bots/status", async (req, res) => {
    try {
      const configs = await storage.getAllBotConfigs();
      const statuses = configs.map(config => {
        const botService = botServices.get(config.id);
        if (botService) {
          return botService.getStatus();
        } else {
          return {
            id: config.id,
            connected: false,
            username: config.username,
            uptime: 0,
            reconnectCount: 0,
            wandering: false,
          };
        }
      });
      res.json(statuses);
    } catch (error) {
      res.status(500).json({ message: "Failed to get bot statuses" });
    }
  });

  // Get single bot status
  app.get("/api/bot/:id/status", async (req, res) => {
    try {
      const botId = parseInt(req.params.id);
      const botService = botServices.get(botId);
      
      if (botService) {
        const status = botService.getStatus();
        res.json(status);
      } else {
        const config = await storage.getBotConfig(botId);
        res.json({
          id: botId,
          connected: false,
          username: config?.username || "MinecraftBot",
          uptime: 0,
          reconnectCount: 0,
          wandering: false,
        });
      }
    } catch (error) {
      res.status(500).json({ message: "Failed to get bot status" });
    }
  });

  // Get logs
  app.get("/api/logs", async (req, res) => {
    try {
      const limit = req.query.limit ? parseInt(req.query.limit as string) : 100;
      const logs = await storage.getLogEntries(limit);
      res.json(logs);
    } catch (error) {
      res.status(500).json({ message: "Failed to get logs" });
    }
  });

  // Clear logs
  app.delete("/api/logs", async (req, res) => {
    try {
      await storage.clearLogEntries();
      res.json({ message: "Logs cleared" });
    } catch (error) {
      res.status(500).json({ message: "Failed to clear logs" });
    }
  });

  const httpServer = createServer(app);

  // Setup WebSocket server
  const wss = new WebSocketServer({ server: httpServer, path: '/ws' });

  wss.on('connection', async (ws) => {
    connectedClients.add(ws);
    
    // Send current bot statuses to new client
    const configs = await storage.getAllBotConfigs();
    ws.send(JSON.stringify({
      type: 'bots_update',
      data: configs
    } as WSMessage));

    ws.on('close', () => {
      connectedClients.delete(ws);
    });

    ws.on('error', (error) => {
      console.error('WebSocket error:', error);
      connectedClients.delete(ws);
    });
  });

  function setupBotServiceEvents(botId: number, botService: MinecraftBotService) {
    botService.on('log', async (logData: any) => {
      try {
        const logEntry = await storage.createLogEntry(logData);
        broadcastToClients({
          type: 'log_entry',
          data: logEntry,
          botId
        });
      } catch (error) {
        console.error('Failed to save log entry:', error);
      }
    });

    botService.on('status_update', (status: any) => {
      try {
        broadcastToClients({
          type: 'bot_status',
          data: status,
          botId
        });
      } catch (error) {
        console.error('Failed to broadcast status update:', error);
      }
    });

    botService.on('error', (error: any) => {
      try {
        console.error('Bot service error:', error);
        broadcastToClients({
          type: 'error',
          data: { message: error.message || 'Unknown bot error' },
          botId
        });
      } catch (broadcastError) {
        console.error('Failed to broadcast error:', broadcastError);
      }
    });
  }

  function broadcastToClients(message: WSMessage) {
    const messageStr = JSON.stringify(message);
    connectedClients.forEach(client => {
      if (client.readyState === WebSocket.OPEN) {
        client.send(messageStr);
      }
    });
  }

  return httpServer;
}
