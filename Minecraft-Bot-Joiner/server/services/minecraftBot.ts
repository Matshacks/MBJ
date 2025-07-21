import mineflayer from 'mineflayer';
import { Vec3 } from 'vec3';
import { EventEmitter } from 'events';
import type { BotConfig, BotStatus } from '@shared/schema';
import { generateRandomUsername, releaseUsername } from './nameGenerator';

export class MinecraftBotService extends EventEmitter {
  private bot: mineflayer.Bot | null = null;
  private config: BotConfig;
  private reconnectAttempts = 0;
  private startTime: Date | null = null;
  private reconnectTimeout: NodeJS.Timeout | null = null;
  private wanderInterval: NodeJS.Timeout | null = null;
  private chatInterval: NodeJS.Timeout | null = null;
  private actualUsername: string = '';
  private isWandering = false;

  constructor(config: BotConfig) {
    super();
    this.config = config;
  }

  updateConfig(config: BotConfig) {
    this.config = config;
  }

  async start(): Promise<void> {
    if (this.bot) {
      this.emit('log', { level: 'warn', message: 'Bot is already running' });
      return;
    }

    try {
      // Generate username if random names are enabled
      this.actualUsername = this.config.useRandomNames ? 
        generateRandomUsername() : 
        this.config.username;

      this.emit('log', { level: 'info', message: `Starting bot with username: ${this.actualUsername}` });
      this.emit('log', { level: 'info', message: `Connecting to ${this.config.serverIp}:${this.config.serverPort}` });

      this.bot = mineflayer.createBot({
        host: this.config.serverIp,
        port: this.config.serverPort,
        username: this.actualUsername,
      });

      this.setupBotEvents();
      this.startTime = new Date();
      
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      this.emit('log', { level: 'error', message: `Failed to create bot: ${errorMessage}` });
      this.emit('error', error);
      // Don't re-throw the error to prevent server crashes
    }
  }

  async stop(): Promise<void> {
    // Clear any pending timers
    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
      this.reconnectTimeout = null;
    }
    if (this.wanderInterval) {
      clearInterval(this.wanderInterval);
      this.wanderInterval = null;
    }
    if (this.chatInterval) {
      clearInterval(this.chatInterval);
      this.chatInterval = null;
    }

    if (this.bot) {
      this.emit('log', { level: 'info', message: 'Stopping bot...' });
      
      try {
        // Remove all listeners first to prevent further events
        this.bot.removeAllListeners();
        // Quit the bot connection
        this.bot.quit();
      } catch (error) {
        this.emit('log', { level: 'warn', message: `Error during bot shutdown: ${error}` });
      }
      
      this.bot = null;
    }
    
    // Release username if it was randomly generated
    if (this.config.useRandomNames && this.actualUsername) {
      releaseUsername(this.actualUsername);
    }
    
    // Reset all state
    this.startTime = null;
    this.reconnectAttempts = 0;
    this.isWandering = false;
    this.actualUsername = '';
    this.emit('status_update', this.getStatus());
  }

  private setupBotEvents(): void {
    if (!this.bot) return;

    this.bot.on('login', () => {
      this.emit('log', { level: 'info', message: `Bot logged in as ${this.bot?.username}` });
      this.reconnectAttempts = 0;
      this.emit('status_update', this.getStatus());
    });

    this.bot.on('spawn', () => {
      this.emit('log', { level: 'info', message: 'Bot spawned in the world' });
      this.emit('status_update', this.getStatus());
      this.startAIBehaviors();
    });

    this.bot.on('chat', (username, message) => {
      if (username === this.bot?.username) return;
      this.emit('log', { level: 'info', message: `<${username}> ${message}` });
    });

    this.bot.on('error', (err: any) => {
      let errorMessage = `Bot error: ${err.message}`;
      
      // Handle specific connection errors
      if (err.code === 'ECONNRESET') {
        errorMessage = 'Connection reset by server - this usually happens when the server is offline or restarting';
      } else if (err.code === 'ENOTFOUND') {
        errorMessage = 'Server not found - please check the server IP address';
      } else if (err.code === 'ECONNREFUSED') {
        errorMessage = 'Connection refused - the server may be offline or the port may be incorrect';
      } else if (err.code === 'ETIMEDOUT') {
        errorMessage = 'Connection timed out - the server may be slow to respond or unreachable';
      }
      
      this.emit('log', { level: 'error', message: errorMessage });
      this.emit('error', err);
      
      // Force cleanup on connection errors
      this.handleDisconnection();
    });

    this.bot.on('kicked', (reason) => {
      this.emit('log', { level: 'warn', message: `Bot was kicked: ${reason}` });
      this.handleDisconnection();
    });

    this.bot.on('end', () => {
      this.emit('log', { level: 'info', message: 'Bot disconnected' });
      this.handleDisconnection();
    });

    this.bot.on('death', () => {
      this.emit('log', { level: 'info', message: 'Bot died and will respawn' });
    });

    this.bot.on('health', () => {
      if (this.bot && this.bot.health <= 5) {
        this.emit('log', { level: 'warn', message: `Bot health is low: ${this.bot.health}` });
      }
    });
  }

  private handleDisconnection(): void {
    if (this.bot) {
      try {
        this.bot.removeAllListeners();
      } catch (error) {
        // Ignore cleanup errors
      }
      this.bot = null;
    }
    
    this.emit('status_update', this.getStatus());

    if (this.config.autoReconnect && this.reconnectAttempts < this.config.maxReconnectAttempts) {
      this.reconnectAttempts++;
      this.emit('log', { 
        level: 'info', 
        message: `Auto-reconnect enabled. Attempt ${this.reconnectAttempts}/${this.config.maxReconnectAttempts} in ${this.config.reconnectInterval} seconds` 
      });

      this.reconnectTimeout = setTimeout(() => {
        this.start();
      }, this.config.reconnectInterval * 1000);
    } else if (this.reconnectAttempts >= this.config.maxReconnectAttempts) {
      this.emit('log', { level: 'error', message: 'Max reconnection attempts reached. Bot stopped.' });
      this.reconnectAttempts = 0;
    }
  }

  getStatus(): BotStatus {
    const status: BotStatus = {
      id: this.config.id,
      connected: !!this.bot,
      username: this.actualUsername || this.config.username,
      uptime: this.startTime ? Date.now() - this.startTime.getTime() : 0,
      reconnectCount: this.reconnectAttempts,
      wandering: this.isWandering,
    };

    if (this.bot && this.bot.game) {
      status.serverInfo = {
        version: this.bot.version || 'Unknown',
        playerCount: `${Object.keys(this.bot.players).length}/20`,
        ping: this.bot.player?.ping || 0,
      };
    }

    return status;
  }

  private startAIBehaviors(): void {
    if (!this.bot) return;

    // Start wandering behavior
    if (this.config.wanderEnabled) {
      this.wanderInterval = setInterval(() => {
        this.performWander();
      }, 15000 + Math.random() * 10000); // 15-25 seconds
      this.emit('log', { level: 'info', message: 'AI wandering enabled' });
    }

    // Start chat behavior
    if (this.config.chatEnabled) {
      this.chatInterval = setInterval(() => {
        this.performRandomChat();
      }, 30000 + Math.random() * 60000); // 30-90 seconds
      this.emit('log', { level: 'info', message: 'AI chat enabled' });
    }
  }

  private performWander(): void {
    if (!this.bot || !this.bot.entity) return;

    try {
      const directions = [
        { x: 1, z: 0 }, { x: -1, z: 0 }, { x: 0, z: 1 }, { x: 0, z: -1 },
        { x: 1, z: 1 }, { x: -1, z: -1 }, { x: 1, z: -1 }, { x: -1, z: 1 }
      ];
      
      const direction = directions[Math.floor(Math.random() * directions.length)];
      const distance = 3 + Math.random() * 7; // 3-10 blocks
      
      const targetX = this.bot.entity.position.x + (direction.x * distance);
      const targetZ = this.bot.entity.position.z + (direction.z * distance);
      const targetY = this.bot.entity.position.y;

      this.isWandering = true;
      // Simple movement toward target (pathfinding would require additional setup)
      try {
        const targetVec = new Vec3(targetX, targetY, targetZ);
        this.bot.lookAt(targetVec);
        this.bot.setControlState('forward', true);
        setTimeout(() => {
          this.bot?.setControlState('forward', false);
        }, 2000);
      } catch (error) {
        // Movement error handling
      }
      
      setTimeout(() => {
        this.isWandering = false;
        this.emit('status_update', this.getStatus());
      }, 8000);

      this.emit('status_update', this.getStatus());
    } catch (error) {
      this.isWandering = false;
      // Don't log pathfinding errors as they're common
    }
  }

  private performRandomChat(): void {
    if (!this.bot || !this.bot.chat) return;

    const casualMessages = [
      'hey', 'hello', 'hi there', 'how is everyone?', 'nice server',
      'anyone building something cool?', 'what\'s everyone up to?', 'love this game',
      'beautiful world', 'anyone need help?', 'cool builds here', 'having fun',
      'nice day for mining', 'love the community here', 'great server',
      'anyone want to team up?', 'this is relaxing', 'awesome gameplay'
    ];

    if (Math.random() < 0.3) { // 30% chance to chat
      const message = casualMessages[Math.floor(Math.random() * casualMessages.length)];
      try {
        this.bot.chat(message);
        this.emit('log', { level: 'info', message: `Bot said: ${message}` });
      } catch (error) {
        // Ignore chat errors
      }
    }
  }

  isConnected(): boolean {
    return !!this.bot;
  }
}
