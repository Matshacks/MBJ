import { useEffect, useState, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import type { BotConfig, BotStatus, LogEntry, WSMessage } from "@shared/schema";
import { 
  Play, 
  Square, 
  Settings, 
  Activity, 
  Server, 
  Bot, 
  Trash2, 
  ArrowUpDown,
  Circle,
  Clock,
  RotateCcw,
  Save,
  Edit,
  Plus,
  Power,
  PowerOff
} from "lucide-react";

export default function Home() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [ws, setWs] = useState<WebSocket | null>(null);
  const [bots, setBots] = useState<BotConfig[]>([]);
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [autoScroll, setAutoScroll] = useState(true);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [isCreating, setIsCreating] = useState(false);
  const [newBotConfig, setNewBotConfig] = useState({
    username: "",
    serverIp: "",
    serverPort: 25565,
    autoReconnect: true,
    reconnectInterval: 30,
    maxReconnectAttempts: 10,
    logLevel: "info",
    wanderEnabled: false,
    chatEnabled: false,
    useRandomNames: false,
  });
  const logContainerRef = useRef<HTMLDivElement>(null);

  // Queries
  const { data: botsData, isLoading: botsLoading } = useQuery<BotConfig[]>({
    queryKey: ["/api/bots"],
  });

  const { data: serverLogs } = useQuery<LogEntry[]>({
    queryKey: ["/api/logs"],
  });

  // Mutations
  const startBotMutation = useMutation({
    mutationFn: (botId: number) => apiRequest("POST", `/api/bot/${botId}/start`),
    onSuccess: () => {
      toast({
        title: "Bot Starting",
        description: "Minecraft bot is connecting to the server...",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/bots"] });
    },
    onError: (error: any) => {
      toast({
        title: "Failed to Start Bot",
        description: error.message || "Unknown error occurred",
        variant: "destructive",
      });
    },
  });

  const stopBotMutation = useMutation({
    mutationFn: (botId: number) => apiRequest("POST", `/api/bot/${botId}/stop`),
    onSuccess: () => {
      toast({
        title: "Bot Stopped",
        description: "Minecraft bot has been disconnected",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/bots"] });
    },
    onError: (error: any) => {
      toast({
        title: "Failed to Stop Bot",
        description: error.message || "Unknown error occurred",
        variant: "destructive",
      });
    },
  });

  const createBotMutation = useMutation({
    mutationFn: (config: any) => apiRequest("POST", "/api/config", config),
    onSuccess: () => {
      toast({
        title: "Bot Created",
        description: "New bot configuration has been created",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/bots"] });
      setIsCreating(false);
      setNewBotConfig({
        username: "",
        serverIp: "",
        serverPort: 25565,
        autoReconnect: true,
        reconnectInterval: 30,
        maxReconnectAttempts: 10,
        logLevel: "info",
        wanderEnabled: false,
        chatEnabled: false,
        useRandomNames: false,
      });
    },
    onError: (error: any) => {
      toast({
        title: "Failed to Create Bot",
        description: error.message || "Unknown error occurred",
        variant: "destructive",
      });
    },
  });



  const clearLogsMutation = useMutation({
    mutationFn: () => apiRequest("DELETE", "/api/logs"),
    onSuccess: () => {
      setLogs([]);
      queryClient.invalidateQueries({ queryKey: ["/api/logs"] });
      toast({
        title: "Logs Cleared",
        description: "All log entries have been removed",
      });
    },
  });

  // WebSocket connection
  useEffect(() => {
    const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
    const wsUrl = `${protocol}//${window.location.host}/ws`;
    const socket = new WebSocket(wsUrl);

    socket.onopen = () => {
      setWs(socket);
    };

    socket.onmessage = (event) => {
      try {
        const message: WSMessage = JSON.parse(event.data);
        
        switch (message.type) {
          case 'bots_update':
            setBots(message.data);
            break;
          case 'bot_status':
            // Update individual bot status in the bots list
            setBots(prev => prev.map(bot => 
              bot.id === message.botId ? { ...bot, ...message.data } : bot
            ));
            break;
          case 'log_entry':
            setLogs(prev => [...prev, message.data]);
            break;
          case 'error':
            toast({
              title: "Bot Error",
              description: message.data.message,
              variant: "destructive",
            });
            break;
        }
      } catch (error) {
        console.error('Failed to parse WebSocket message:', error);
      }
    };

    socket.onclose = () => {
      setWs(null);
    };

    socket.onerror = (error) => {
      console.error('WebSocket error:', error);
    };

    return () => {
      socket.close();
    };
  }, [toast]);

  // Update bots data when query data changes
  useEffect(() => {
    if (botsData) {
      setBots(botsData);
    }
  }, [botsData]);

  // Initialize logs from server
  useEffect(() => {
    if (serverLogs) {
      setLogs(serverLogs);
    }
  }, [serverLogs]);

  // Auto-scroll logs
  useEffect(() => {
    if (autoScroll && logContainerRef.current) {
      logContainerRef.current.scrollTop = logContainerRef.current.scrollHeight;
    }
  }, [logs, autoScroll]);

  // Update current time
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Format uptime
  const formatUptime = (ms: number) => {
    const seconds = Math.floor(ms / 1000);
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // Format timestamp
  const formatTime = (date: Date) => {
    return date.toLocaleTimeString('en-US', { hour12: false });
  };

  // Format log timestamp
  const formatLogTime = (timestamp: string | Date) => {
    const date = new Date(timestamp);
    return `[${formatTime(date)}]`;
  };

  // Get log level color
  const getLogLevelColor = (level: string) => {
    switch (level.toLowerCase()) {
      case 'error': return 'text-red-400';
      case 'warn': return 'text-amber-400';
      case 'info': return 'text-blue-400';
      case 'debug': return 'text-gray-400';
      default: return 'text-gray-300';
    }
  };

  if (botsLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading bot configurations...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-surface">
      {/* Header */}
      <header className="bg-white shadow-material border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 bg-material-blue rounded-lg flex items-center justify-center">
                <Bot className="h-4 w-4 text-white" />
              </div>
              <h1 className="text-xl font-medium text-gray-900">Minecraft Bot Controller</h1>
            </div>
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2">
                <div className={`w-2 h-2 rounded-full animate-pulse ${ws ? 'bg-material-green' : 'bg-red-500'}`} />
                <span className="text-sm text-material-gray">
                  {ws ? 'Server Online' : 'Server Offline'}
                </span>
              </div>
              <div className="text-sm text-material-gray">
                {formatTime(currentTime)}
              </div>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* Bot Management Panel */}
          <div className="lg:col-span-2">
            <Card className="shadow-material mb-6">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center">
                    <Bot className="h-5 w-5 text-blue-600 mr-2" />
                    Bot Management
                  </CardTitle>
                  <Dialog open={isCreating} onOpenChange={setIsCreating}>
                    <DialogTrigger asChild>
                      <Button className="bg-blue-600 hover:bg-blue-700 text-white">
                        <Plus className="h-4 w-4 mr-2" />
                        Create New Bot
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="sm:max-w-md">
                      <DialogHeader>
                        <DialogTitle>Create New Bot</DialogTitle>
                      </DialogHeader>
                      <div className="space-y-4 py-4">
                        <div className="space-y-2">
                          <Label htmlFor="username">Bot Username</Label>
                          <Input
                            id="username"
                            placeholder="MinecraftBot_02"
                            value={newBotConfig.username}
                            onChange={(e) => setNewBotConfig({...newBotConfig, username: e.target.value})}
                          />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <Label htmlFor="serverIp">Server IP</Label>
                            <Input
                              id="serverIp"
                              placeholder="localhost"
                              value={newBotConfig.serverIp}
                              onChange={(e) => setNewBotConfig({...newBotConfig, serverIp: e.target.value})}
                            />
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor="serverPort">Port</Label>
                            <Input
                              id="serverPort"
                              type="number"
                              placeholder="25565"
                              value={newBotConfig.serverPort}
                              onChange={(e) => setNewBotConfig({...newBotConfig, serverPort: parseInt(e.target.value)})}
                            />
                          </div>
                        </div>
                        
                        <Separator />
                        
                        <div className="space-y-4">
                          <h4 className="text-sm font-medium text-gray-900">AI Features</h4>
                          
                          <div className="flex items-center justify-between">
                            <div>
                              <Label htmlFor="wanderEnabled" className="text-sm font-medium">Enable Wandering</Label>
                              <p className="text-xs text-gray-500">Bot will randomly walk around the world</p>
                            </div>
                            <Switch 
                              id="wanderEnabled"
                              checked={newBotConfig.wanderEnabled}
                              onCheckedChange={(checked) => setNewBotConfig({...newBotConfig, wanderEnabled: checked})}
                            />
                          </div>

                          <div className="flex items-center justify-between">
                            <div>
                              <Label htmlFor="chatEnabled" className="text-sm font-medium">Enable Chat</Label>
                              <p className="text-xs text-gray-500">Bot will occasionally send messages</p>
                            </div>
                            <Switch 
                              id="chatEnabled"
                              checked={newBotConfig.chatEnabled}
                              onCheckedChange={(checked) => setNewBotConfig({...newBotConfig, chatEnabled: checked})}
                            />
                          </div>

                          <div className="flex items-center justify-between">
                            <div>
                              <Label htmlFor="useRandomNames" className="text-sm font-medium">Random Names</Label>
                              <p className="text-xs text-gray-500">Generate random usernames on connect</p>
                            </div>
                            <Switch 
                              id="useRandomNames"
                              checked={newBotConfig.useRandomNames}
                              onCheckedChange={(checked) => setNewBotConfig({...newBotConfig, useRandomNames: checked})}
                            />
                          </div>
                        </div>
                        <div className="flex justify-end space-x-2 pt-4">
                          <Button
                            variant="outline"
                            onClick={() => setIsCreating(false)}
                          >
                            Cancel
                          </Button>
                          <Button
                            onClick={() => createBotMutation.mutate(newBotConfig)}
                            disabled={createBotMutation.isPending || !newBotConfig.username || !newBotConfig.serverIp}
                          >
                            Create Bot
                          </Button>
                        </div>
                      </div>
                    </DialogContent>
                  </Dialog>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {bots.length === 0 ? (
                    <div className="text-center py-8">
                      <Bot className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                      <h3 className="text-lg font-medium text-gray-900 mb-2">No bots configured</h3>
                      <p className="text-gray-500 mb-4">Create your first Minecraft bot to get started</p>
                    </div>
                  ) : (
                    bots.map((bot) => (
                      <div key={bot.id} className="border border-gray-200 rounded-lg p-4 hover:border-blue-200 transition-colors">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-3">
                            <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
                              <Bot className="h-4 w-4 text-blue-600" />
                            </div>
                            <div className="flex-1">
                              <h3 className="font-medium text-gray-900">{bot.username}</h3>
                              <p className="text-sm text-gray-500">{bot.serverIp}:{bot.serverPort}</p>
                              <div className="flex items-center space-x-2 mt-1">
                                {bot.wanderEnabled && (
                                  <Badge variant="outline" className="text-xs">
                                    <ArrowUpDown className="h-3 w-3 mr-1" />
                                    Wandering
                                  </Badge>
                                )}
                                {bot.chatEnabled && (
                                  <Badge variant="outline" className="text-xs">
                                    <Activity className="h-3 w-3 mr-1" />
                                    Chat
                                  </Badge>
                                )}
                                {bot.useRandomNames && (
                                  <Badge variant="outline" className="text-xs">
                                    <Circle className="h-3 w-3 mr-1" />
                                    Random Names
                                  </Badge>
                                )}
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center space-x-3">
                            <Badge 
                              variant={bot.isActive ? "default" : "secondary"}
                              className={bot.isActive ? "bg-green-500 hover:bg-green-600" : ""}
                            >
                              <Circle className={`h-2 w-2 mr-1 ${bot.isActive ? 'text-green-100' : 'text-gray-100'}`} />
                              {bot.isActive ? 'Running' : 'Stopped'}
                            </Badge>
                            {bot.isActive ? (
                              <Button
                                size="sm"
                                variant="destructive"
                                onClick={() => stopBotMutation.mutate(bot.id)}
                                disabled={stopBotMutation.isPending}
                              >
                                <PowerOff className="h-4 w-4 mr-1" />
                                Stop
                              </Button>
                            ) : (
                              <Button
                                size="sm"
                                className="bg-green-600 hover:bg-green-700 text-white"
                                onClick={() => startBotMutation.mutate(bot.id)}
                                disabled={startBotMutation.isPending}
                              >
                                <Power className="h-4 w-4 mr-1" />
                                Start
                              </Button>
                            )}
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </CardContent>
            </Card>

          </div>

          {/* Logs Panel */}
          <div className="lg:col-span-1">
            <Card className="shadow-material">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center">
                    <Activity className="h-5 w-5 text-blue-600 mr-2" />
                    Activity Logs
                  </CardTitle>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => clearLogsMutation.mutate()}
                    disabled={clearLogsMutation.isPending || logs.length === 0}
                  >
                    <Trash2 className="h-4 w-4 mr-1" />
                    Clear
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="p-0">
                <div 
                  ref={logContainerRef}
                  className="h-96 overflow-y-auto bg-gray-950 text-green-400 font-mono text-xs p-4"
                >
                  {logs.length === 0 ? (
                    <div className="text-center text-gray-500 mt-8">
                      No logs available
                    </div>
                  ) : (
                    logs.map((log, index) => (
                      <div key={index} className="mb-1">
                        <span className="text-gray-500">{formatLogTime(log.timestamp)}</span>
                        <span className={`ml-2 ${getLogLevelColor(log.level)}`}>
                          [{log.level.toUpperCase()}]
                        </span>
                        <span className="ml-2 text-gray-300">{log.message}</span>
                      </div>
                    ))
                  )}
                </div>
                <div className="p-3 border-t border-gray-200 bg-gray-50">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2 text-sm text-gray-600">
                      <div className="flex items-center">
                        <Switch
                          checked={autoScroll}
                          onCheckedChange={setAutoScroll}
                          className="scale-75"
                        />
                        <span className="ml-1">Auto-scroll</span>
                      </div>
                    </div>
                    <div className="text-xs text-gray-500">
                      {logs.length} entries
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
    </div>
  );
}
