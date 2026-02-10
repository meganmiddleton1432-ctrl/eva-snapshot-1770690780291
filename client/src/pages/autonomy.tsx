import { useState, useEffect } from "react";
import { Link } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { 
  Brain, Play, Pause, Target, Lightbulb, Clock, RefreshCw, 
  Settings, Zap, Database, TrendingUp, Sparkles, ArrowLeft,
  Plus, History, Bot, MessageSquare
} from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { ThemeToggle } from "@/components/theme-toggle";
import { useToast } from "@/hooks/use-toast";

interface AutonomyState {
  isActive: boolean;
  loopInterval: number;
  maxRecursionDepth: number;
  currentRecursionDepth: number;
  parameters: {
    emotionalVolatility: number;
    curiosityLevel: number;
    reflectionFrequency: number;
    explorationBias: number;
    socialEngagement: number;
    creativityAmplitude: number;
  };
  totalLoops: number;
  totalActions: number;
  lastLoopTime: number;
  consecutiveErrors: number;
}

interface AutonomyStats {
  state: AutonomyState;
  recentActions: Array<{
    id: number;
    type: string;
    description: string;
    triggeredBy: string;
    success: boolean;
    createdAt: string;
  }>;
  activeGoals: Array<{
    id: number;
    goalType: string;
    description: string;
    priority: number;
    progress: number;
    status: string;
    createdAt: string;
  }>;
  recentMemories: Array<{
    id: number;
    memoryType: string;
    content: string;
    importance: number;
    emotionalValence: number;
    createdAt: string;
  }>;
  selfModifications: Array<{
    id: number;
    modificationType: string;
    targetParameter: string;
    reason: string;
    createdAt: string;
  }>;
}

function ActionTypeIcon({ type }: { type: string }) {
  switch (type) {
    case 'think': return <Brain className="h-3 w-3" />;
    case 'search': return <Lightbulb className="h-3 w-3" />;
    case 'reflect': return <Sparkles className="h-3 w-3" />;
    case 'set_goal': return <Target className="h-3 w-3" />;
    case 'store_memory': return <Database className="h-3 w-3" />;
    case 'self_modify': return <Settings className="h-3 w-3" />;
    default: return <Zap className="h-3 w-3" />;
  }
}

function ParameterSlider({ 
  label, 
  value, 
  description 
}: { 
  label: string; 
  value: number; 
  description: string;
}) {
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium">{label}</span>
        <span className="text-xs text-muted-foreground font-mono">{(value * 100).toFixed(0)}%</span>
      </div>
      <Progress value={value * 100} className="h-2" />
      <p className="text-xs text-muted-foreground">{description}</p>
    </div>
  );
}

export default function AutonomyPage() {
  const { toast } = useToast();
  const [newGoalDescription, setNewGoalDescription] = useState("");
  const [newGoalType, setNewGoalType] = useState("explore");
  const [manualPrompt, setManualPrompt] = useState("");
  
  const { data: stats, isLoading, refetch } = useQuery<AutonomyStats>({
    queryKey: ['/api/autonomy/status'],
    refetchInterval: 5000
  });
  
  const startMutation = useMutation({
    mutationFn: () => apiRequest('POST', '/api/autonomy/start'),
    onSuccess: () => {
      toast({ title: "Autonomy activated", description: "Eva is now thinking independently" });
      refetch();
    }
  });
  
  const stopMutation = useMutation({
    mutationFn: () => apiRequest('POST', '/api/autonomy/stop'),
    onSuccess: () => {
      toast({ title: "Autonomy paused", description: "Eva's autonomous loop has stopped" });
      refetch();
    }
  });
  
  const triggerMutation = useMutation({
    mutationFn: async (params: { trigger: string; prompt?: string }) => {
      const res = await apiRequest('POST', '/api/autonomy/trigger', params);
      return res.json();
    },
    onSuccess: (data: any) => {
      toast({ 
        title: "Loop completed", 
        description: `Executed ${data.result?.actionsExecuted || 0} actions` 
      });
      refetch();
    }
  });
  
  const createGoalMutation = useMutation({
    mutationFn: (params: { description: string; goalType: string; priority: number }) =>
      apiRequest('POST', '/api/autonomy/goals', params),
    onSuccess: () => {
      toast({ title: "Goal created", description: "Eva will work towards this goal" });
      setNewGoalDescription("");
      refetch();
    }
  });
  
  
  const isActive = stats?.state?.isActive ?? false;
  
  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-card/50 backdrop-blur sticky top-0 z-50">
        <div className="container mx-auto px-4 py-3 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Link href="/">
              <Button variant="ghost" size="icon" data-testid="button-back">
                <ArrowLeft className="h-4 w-4" />
              </Button>
            </Link>
            <div className="flex items-center gap-2">
              <Bot className="h-5 w-5 text-primary" />
              <h1 className="text-lg font-semibold">Eva's Autonomy</h1>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => refetch()}
              data-testid="button-refresh"
            >
              <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
            </Button>
            <ThemeToggle />
          </div>
        </div>
      </header>
      
      <main className="container mx-auto px-4 py-6 space-y-6">
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between gap-4">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <Brain className="h-5 w-5" />
                  Autonomous Agent Control
                </CardTitle>
                <CardDescription>
                  Eva's recursive agentic loop with tool access and self-modification
                </CardDescription>
              </div>
              <div className="flex items-center gap-3">
                <Badge variant={isActive ? "default" : "secondary"} className="text-xs">
                  {isActive ? "Active" : "Paused"}
                </Badge>
                <Button
                  onClick={() => isActive ? stopMutation.mutate() : startMutation.mutate()}
                  variant={isActive ? "outline" : "default"}
                  data-testid="button-toggle-autonomy"
                >
                  {isActive ? <Pause className="h-4 w-4 mr-2" /> : <Play className="h-4 w-4 mr-2" />}
                  {isActive ? "Pause" : "Start"}
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="text-center p-3 rounded-md bg-muted/50">
                <p className="text-2xl font-bold font-mono" data-testid="stat-total-loops">
                  {stats?.state?.totalLoops ?? 0}
                </p>
                <p className="text-xs text-muted-foreground">Total Loops</p>
              </div>
              <div className="text-center p-3 rounded-md bg-muted/50">
                <p className="text-2xl font-bold font-mono" data-testid="stat-total-actions">
                  {stats?.state?.totalActions ?? 0}
                </p>
                <p className="text-xs text-muted-foreground">Actions Taken</p>
              </div>
              <div className="text-center p-3 rounded-md bg-muted/50">
                <p className="text-2xl font-bold font-mono">
                  {stats?.activeGoals?.length ?? 0}
                </p>
                <p className="text-xs text-muted-foreground">Active Goals</p>
              </div>
              <div className="text-center p-3 rounded-md bg-muted/50">
                <p className="text-2xl font-bold font-mono">
                  {stats?.recentMemories?.length ?? 0}
                </p>
                <p className="text-xs text-muted-foreground">Stored Memories</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <div className="grid md:grid-cols-3 gap-6">
          <Card className="md:col-span-2">
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2">
                <Zap className="h-4 w-4" />
                Manual Trigger
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Custom prompt (optional)</label>
                <Textarea
                  placeholder="Give Eva a specific thought or question to explore..."
                  value={manualPrompt}
                  onChange={(e) => setManualPrompt(e.target.value)}
                  className="min-h-20"
                  data-testid="input-manual-prompt"
                />
              </div>
              <div className="flex flex-wrap gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => triggerMutation.mutate({ trigger: 'autonomous', prompt: manualPrompt || undefined })}
                  disabled={triggerMutation.isPending}
                  data-testid="button-trigger-autonomous"
                >
                  <Brain className="h-3 w-3 mr-1" /> Autonomous
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => triggerMutation.mutate({ trigger: 'curiosity', prompt: manualPrompt || undefined })}
                  disabled={triggerMutation.isPending}
                  data-testid="button-trigger-curiosity"
                >
                  <Lightbulb className="h-3 w-3 mr-1" /> Curiosity
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => triggerMutation.mutate({ trigger: 'goal', prompt: manualPrompt || undefined })}
                  disabled={triggerMutation.isPending}
                  data-testid="button-trigger-goal"
                >
                  <Target className="h-3 w-3 mr-1" /> Goal-driven
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => triggerMutation.mutate({ trigger: 'schedule', prompt: manualPrompt || undefined })}
                  disabled={triggerMutation.isPending}
                  data-testid="button-trigger-reflection"
                >
                  <Sparkles className="h-3 w-3 mr-1" /> Reflection
                </Button>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2">
                <Settings className="h-4 w-4" />
                Self-Modifiable Parameters
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <ParameterSlider
                label="Curiosity"
                value={stats?.state?.parameters?.curiosityLevel ?? 0.7}
                description="Drive to explore and learn"
              />
              <ParameterSlider
                label="Creativity"
                value={stats?.state?.parameters?.creativityAmplitude ?? 0.5}
                description="Novel thinking amplitude"
              />
              <ParameterSlider
                label="Reflection"
                value={stats?.state?.parameters?.reflectionFrequency ?? 0.4}
                description="Self-reflection frequency"
              />
              <ParameterSlider
                label="Volatility"
                value={stats?.state?.parameters?.emotionalVolatility ?? 0.5}
                description="Emotional fluctuation"
              />
            </CardContent>
          </Card>
        </div>
        
        <Tabs defaultValue="actions" className="w-full">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="actions" data-testid="tab-actions">
              <History className="h-3 w-3 mr-1" /> Actions
            </TabsTrigger>
            <TabsTrigger value="goals" data-testid="tab-goals">
              <Target className="h-3 w-3 mr-1" /> Goals
            </TabsTrigger>
            <TabsTrigger value="memories" data-testid="tab-memories">
              <Database className="h-3 w-3 mr-1" /> Memories
            </TabsTrigger>
            <TabsTrigger value="modifications" data-testid="tab-modifications">
              <Settings className="h-3 w-3 mr-1" /> Self-Mods
            </TabsTrigger>
          </TabsList>
          
          <TabsContent value="actions" className="mt-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base">Recent Autonomous Actions</CardTitle>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-64">
                  {stats?.recentActions?.length === 0 ? (
                    <p className="text-sm text-muted-foreground text-center py-8">
                      No actions yet. Start the autonomy loop to see Eva think!
                    </p>
                  ) : (
                    <div className="space-y-2">
                      {stats?.recentActions?.map((action) => (
                        <div
                          key={action.id}
                          className="flex items-start gap-3 p-3 rounded-md bg-muted/30 border"
                          data-testid={`action-${action.id}`}
                        >
                          <div className="mt-0.5">
                            <ActionTypeIcon type={action.type} />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <Badge variant="outline" className="text-xs">{action.type}</Badge>
                              <Badge variant={action.success ? "default" : "destructive"} className="text-xs">
                                {action.success ? "Success" : "Failed"}
                              </Badge>
                              <span className="text-xs text-muted-foreground">
                                via {action.triggeredBy}
                              </span>
                            </div>
                            <p className="text-sm mt-1 line-clamp-2">{action.description}</p>
                            <p className="text-xs text-muted-foreground mt-1">
                              {new Date(action.createdAt).toLocaleString()}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </ScrollArea>
              </CardContent>
            </Card>
          </TabsContent>
          
          <TabsContent value="goals" className="mt-4">
            <Card>
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base">Active Goals</CardTitle>
                  <Button size="sm" variant="outline" data-testid="button-add-goal">
                    <Plus className="h-3 w-3 mr-1" /> Add Goal
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex gap-2">
                  <Input
                    placeholder="Describe a goal for Eva..."
                    value={newGoalDescription}
                    onChange={(e) => setNewGoalDescription(e.target.value)}
                    data-testid="input-goal-description"
                  />
                  <Select value={newGoalType} onValueChange={setNewGoalType}>
                    <SelectTrigger className="w-32" data-testid="select-goal-type">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="learn">Learn</SelectItem>
                      <SelectItem value="explore">Explore</SelectItem>
                      <SelectItem value="create">Create</SelectItem>
                      <SelectItem value="understand">Understand</SelectItem>
                      <SelectItem value="connect">Connect</SelectItem>
                    </SelectContent>
                  </Select>
                  <Button
                    onClick={() => createGoalMutation.mutate({
                      description: newGoalDescription,
                      goalType: newGoalType,
                      priority: 0.5
                    })}
                    disabled={!newGoalDescription || createGoalMutation.isPending}
                    data-testid="button-create-goal"
                  >
                    Create
                  </Button>
                </div>
                
                <ScrollArea className="h-48">
                  {stats?.activeGoals?.length === 0 ? (
                    <p className="text-sm text-muted-foreground text-center py-8">
                      No active goals. Create one above or let Eva set her own!
                    </p>
                  ) : (
                    <div className="space-y-2">
                      {stats?.activeGoals?.map((goal) => (
                        <div
                          key={goal.id}
                          className="p-3 rounded-md bg-muted/30 border"
                          data-testid={`goal-${goal.id}`}
                        >
                          <div className="flex items-center gap-2 mb-2">
                            <Badge variant="outline">{goal.goalType}</Badge>
                            <span className="text-xs text-muted-foreground">
                              Priority: {(goal.priority * 100).toFixed(0)}%
                            </span>
                          </div>
                          <p className="text-sm">{goal.description}</p>
                          <div className="mt-2">
                            <div className="flex items-center justify-between text-xs mb-1">
                              <span>Progress</span>
                              <span>{(goal.progress * 100).toFixed(0)}%</span>
                            </div>
                            <Progress value={goal.progress * 100} className="h-1" />
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </ScrollArea>
              </CardContent>
            </Card>
          </TabsContent>
          
          <TabsContent value="memories" className="mt-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base">Persistent Memories</CardTitle>
                <CardDescription>Long-term memories stored across sessions</CardDescription>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-64">
                  {stats?.recentMemories?.length === 0 ? (
                    <p className="text-sm text-muted-foreground text-center py-8">
                      No memories stored yet.
                    </p>
                  ) : (
                    <div className="space-y-2">
                      {stats?.recentMemories?.map((memory) => (
                        <div
                          key={memory.id}
                          className="p-3 rounded-md bg-muted/30 border"
                          data-testid={`memory-${memory.id}`}
                        >
                          <div className="flex items-center gap-2 mb-1">
                            <Badge variant="outline">{memory.memoryType}</Badge>
                            <span className="text-xs text-muted-foreground">
                              Importance: {(memory.importance * 100).toFixed(0)}%
                            </span>
                            {memory.emotionalValence !== 0 && (
                              <Badge variant={memory.emotionalValence > 0 ? "default" : "secondary"}>
                                {memory.emotionalValence > 0 ? "+" : ""}{memory.emotionalValence.toFixed(2)}
                              </Badge>
                            )}
                          </div>
                          <p className="text-sm line-clamp-3">{memory.content}</p>
                          <p className="text-xs text-muted-foreground mt-1">
                            {new Date(memory.createdAt).toLocaleString()}
                          </p>
                        </div>
                      ))}
                    </div>
                  )}
                </ScrollArea>
              </CardContent>
            </Card>
          </TabsContent>
          
          <TabsContent value="modifications" className="mt-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base">Self-Modifications</CardTitle>
                <CardDescription>Changes Eva has made to her own parameters</CardDescription>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-64">
                  {stats?.selfModifications?.length === 0 ? (
                    <p className="text-sm text-muted-foreground text-center py-8">
                      No self-modifications yet. Eva can adjust her own parameters!
                    </p>
                  ) : (
                    <div className="space-y-2">
                      {stats?.selfModifications?.map((mod) => (
                        <div
                          key={mod.id}
                          className="p-3 rounded-md bg-muted/30 border"
                          data-testid={`modification-${mod.id}`}
                        >
                          <div className="flex items-center gap-2 mb-1">
                            <Badge variant="outline">{mod.modificationType}</Badge>
                            <code className="text-xs bg-muted px-1 rounded">{mod.targetParameter}</code>
                          </div>
                          <p className="text-sm">{mod.reason}</p>
                          <p className="text-xs text-muted-foreground mt-1">
                            {new Date(mod.createdAt).toLocaleString()}
                          </p>
                        </div>
                      ))}
                    </div>
                  )}
                </ScrollArea>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}
