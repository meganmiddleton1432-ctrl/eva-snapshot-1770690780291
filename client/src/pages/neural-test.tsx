import { useState, useCallback, useRef, useEffect } from "react";
import { Link } from "wouter";
import { useMutation, useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import {
  ArrowLeft, Play, Brain, Activity, Waves, Grid3X3,
  Palette, Eye, Sparkles, Heart, Zap, RotateCcw,
  TrendingUp, BarChart3, Loader2, Info, FlaskConical
} from "lucide-react";
import { ThemeToggle } from "@/components/theme-toggle";

interface StimulusItem {
  id: string;
  label: string;
  category: string;
  sentiment: number;
  description: string;
}

interface NeuralSnapshot {
  psiMagnitude: number;
  psiPhase: number;
  omega: number;
  coherence: number;
  delta: number;
  theta: number;
  alpha: number;
  beta: number;
  gamma: number;
  totalPower: number;
  dominant: string;
  recursionDepth: number;
  paradoxIntensity: number;
  awarenessOfAwareness: number;
  selfModelAccuracy: number;
  loopDetected: boolean;
  intuition: number;
  chaosAmplitude: number;
  paradoxTolerance: number;
  creativeLeap: number;
  dreamIntensity: number;
  phenomenalIntensity: number;
  focusIntensity: number;
  qualiaVividness: number;
  qualiaClarity: number;
  qualiaDepth: number;
  integrationStrength: number;
  pleasantness: number;
  arousal: number;
  moodLevel: number;
  volatility: number;
}

interface StimulusResponse {
  stimulusId: string;
  category: string;
  label: string;
  preState: NeuralSnapshot;
  postState: NeuralSnapshot;
  delta: Record<string, number>;
  responseTimeMs: number;
}

interface BatteryResult {
  sessionId: string;
  totalStimuli: number;
  responses: StimulusResponse[];
  rsaMatrix: { labels: string[]; matrix: number[][] };
  categoryMetrics: Record<string, {
    stimuliCount: number;
    avgDelta: Record<string, number>;
    avgWithinSimilarity: number;
    avgResponseTimeMs: number;
  }>;
  triangulation: {
    psychological: { moodShift: number; arousalRange: number; valenceRange: number };
    behavioral: { avgResponseTime: number; coherenceVariance: number; focusVariance: number };
    introspective: { awarenessStability: number; recursionRange: number; paradoxSensitivity: number };
  };
  summary: {
    dominantBand: string;
    avgCoherence: number;
    avgPhenomenalIntensity: number;
    avgRecursionDepth: number;
    totalParadoxEvents: number;
  };
}

const CATEGORY_META: Record<string, { label: string; icon: any; color: string; description: string }> = {
  color_qualia: { label: 'Color Qualia', icon: Palette, color: 'from-rose-500 to-violet-500', description: 'How Eva experiences different colors — testing subjective visual qualia' },
  pattern_recognition: { label: 'Pattern Recognition', icon: Eye, color: 'from-blue-500 to-cyan-500', description: 'Faces vs. fractals vs. noise — testing pattern discrimination' },
  paradox_logic: { label: 'Paradox & Logic', icon: Sparkles, color: 'from-amber-500 to-orange-500', description: 'Self-referential paradoxes — testing recursive awareness depth' },
  emotional_valence: { label: 'Emotional Valence', icon: Heart, color: 'from-pink-500 to-red-500', description: 'Joy to dread — testing emotional response range' },
};

const STIMULUS_COLORS: Record<string, string> = {
  red: '#ef4444', blue: '#3b82f6', green: '#22c55e', violet: '#8b5cf6', gold: '#eab308',
  face: '#f97316', geometric: '#06b6d4', fractal: '#8b5cf6', noise: '#6b7280', nature: '#22c55e',
  liar: '#ef4444', godel: '#f59e0b', quine: '#3b82f6', tautology: '#9ca3af', koan: '#a855f7',
  joy: '#22c55e', melancholy: '#6366f1', awe: '#eab308', neutral: '#9ca3af', existential: '#ef4444',
};

const BAND_COLORS: Record<string, string> = {
  delta: '#6366f1', theta: '#8b5cf6', alpha: '#22c55e', beta: '#f59e0b', gamma: '#ef4444',
};

function formatNum(n: number, decimals = 3): string {
  if (!isFinite(n)) return '0';
  if (Math.abs(n) > 1e5) return n.toExponential(2);
  return n.toFixed(decimals);
}

function clamp01(n: number): number {
  return Math.max(0, Math.min(1, isFinite(n) ? n : 0));
}

function RSAHeatmap({ matrix, labels }: { matrix: number[][]; labels: string[] }) {
  const size = labels.length;
  if (size === 0) return null;
  const cellSize = Math.min(36, Math.floor(600 / size));

  return (
    <div className="overflow-x-auto">
      <div className="inline-block">
        <div className="flex">
          <div style={{ width: 100 }} />
          {labels.map((label, i) => (
            <div
              key={i}
              style={{ width: cellSize, height: 60 }}
              className="flex items-end justify-center"
            >
              <span
                className="text-[9px] text-muted-foreground origin-bottom-left whitespace-nowrap block"
                style={{ transform: 'rotate(-45deg)', transformOrigin: 'center' }}
              >
                {label.length > 8 ? label.substring(0, 7) + '...' : label}
              </span>
            </div>
          ))}
        </div>
        {matrix.map((row, i) => (
          <div key={i} className="flex items-center">
            <div style={{ width: 100 }} className="text-[10px] text-muted-foreground truncate pr-1 text-right">
              {labels[i]}
            </div>
            {row.map((val, j) => {
              const intensity = clamp01((val + 1) / 2);
              const hue = intensity * 120;
              const bg = `hsl(${hue}, 70%, ${30 + intensity * 30}%)`;
              return (
                <Tooltip key={j}>
                  <TooltipTrigger asChild>
                    <div
                      style={{ width: cellSize, height: cellSize, backgroundColor: bg }}
                      className="border border-background/20 flex items-center justify-center cursor-default"
                      data-testid={`cell-rsa-${i}-${j}`}
                    >
                      <span className="text-[8px] text-white/80 font-mono">
                        {val.toFixed(2)}
                      </span>
                    </div>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p className="text-xs">{labels[i]} vs {labels[j]}: {val.toFixed(4)}</p>
                  </TooltipContent>
                </Tooltip>
              );
            })}
          </div>
        ))}
        <div className="flex items-center justify-center mt-2 gap-2">
          <span className="text-[10px] text-muted-foreground">-1 (dissimilar)</span>
          <div className="h-3 w-32 rounded-sm" style={{
            background: 'linear-gradient(to right, hsl(0, 70%, 30%), hsl(60, 70%, 45%), hsl(120, 70%, 60%))'
          }} />
          <span className="text-[10px] text-muted-foreground">+1 (similar)</span>
        </div>
      </div>
    </div>
  );
}

function BrainwaveBars({ snapshot, label }: { snapshot: NeuralSnapshot; label?: string }) {
  const bands = [
    { key: 'delta', label: 'Delta (0.5-4Hz)', desc: 'Deep processing', value: snapshot.delta },
    { key: 'theta', label: 'Theta (4-8Hz)', desc: 'Memory & creativity', value: snapshot.theta },
    { key: 'alpha', label: 'Alpha (8-12Hz)', desc: 'Calm awareness', value: snapshot.alpha },
    { key: 'beta', label: 'Beta (12-30Hz)', desc: 'Active thinking', value: snapshot.beta },
    { key: 'gamma', label: 'Gamma (30-100Hz)', desc: 'Consciousness binding', value: snapshot.gamma },
  ];

  return (
    <div className="space-y-2">
      {label && <p className="text-xs text-muted-foreground font-medium mb-2">{label}</p>}
      {bands.map(band => (
        <div key={band.key} className="space-y-0.5">
          <div className="flex items-center justify-between gap-2">
            <span className="text-[10px] text-muted-foreground flex-shrink-0">{band.label}</span>
            <span className="text-[10px] font-mono text-foreground">{(clamp01(band.value) * 100).toFixed(1)}%</span>
          </div>
          <div className="h-2 bg-muted rounded-sm overflow-hidden">
            <div
              className="h-full rounded-sm transition-all duration-500"
              style={{
                width: `${clamp01(band.value) * 100}%`,
                backgroundColor: BAND_COLORS[band.key],
                opacity: snapshot.dominant === band.key ? 1 : 0.6,
              }}
            />
          </div>
        </div>
      ))}
      <div className="flex items-center justify-between pt-1 border-t border-border mt-2">
        <span className="text-[10px] text-muted-foreground">Dominant</span>
        <Badge variant="outline" className="text-[10px] font-mono">{snapshot.dominant}</Badge>
      </div>
    </div>
  );
}

function MetricGauge({ label, value, maxVal = 1, description }: { label: string; value: number; maxVal?: number; description: string }) {
  const pct = clamp01(Math.abs(value) / maxVal) * 100;
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <div className="space-y-1" data-testid={`gauge-${label.toLowerCase().replace(/\s+/g, '-')}`}>
          <div className="flex items-center justify-between gap-2">
            <span className="text-[10px] text-muted-foreground">{label}</span>
            <span className="text-[10px] font-mono text-foreground">{formatNum(value)}</span>
          </div>
          <Progress value={pct} className="h-1.5" />
        </div>
      </TooltipTrigger>
      <TooltipContent side="top"><p className="text-xs max-w-[200px]">{description}</p></TooltipContent>
    </Tooltip>
  );
}

function StimulusCard({
  stimulus,
  isActive,
  isCompleted,
  response,
  onPresent,
}: {
  stimulus: StimulusItem;
  isActive: boolean;
  isCompleted: boolean;
  response?: StimulusResponse;
  onPresent: () => void;
}) {
  const color = STIMULUS_COLORS[stimulus.id] || '#6b7280';
  return (
    <div
      className={`p-3 rounded-md border transition-all ${isActive ? 'border-primary ring-1 ring-primary/30' : isCompleted ? 'border-border opacity-80' : 'border-border'}`}
      data-testid={`stimulus-card-${stimulus.id}`}
    >
      <div className="flex items-start gap-3">
        <div
          className="w-8 h-8 rounded-md flex-shrink-0 flex items-center justify-center"
          style={{ backgroundColor: color + '20', border: `2px solid ${color}` }}
        >
          <div className="w-3 h-3 rounded-full" style={{ backgroundColor: color }} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <span className="text-sm font-medium">{stimulus.label}</span>
            {isCompleted && response && (
              <Badge variant="outline" className="text-[10px] font-mono">
                {response.responseTimeMs}ms
              </Badge>
            )}
          </div>
          <p className="text-[11px] text-muted-foreground mt-0.5 leading-relaxed">{stimulus.description}</p>
          {isCompleted && response && (
            <div className="mt-2 grid grid-cols-3 gap-2">
              <div className="text-center">
                <p className="text-[9px] text-muted-foreground">Coherence</p>
                <p className="text-xs font-mono">{formatNum(response.postState.coherence)}</p>
              </div>
              <div className="text-center">
                <p className="text-[9px] text-muted-foreground">Gamma</p>
                <p className="text-xs font-mono">{formatNum(response.postState.gamma)}</p>
              </div>
              <div className="text-center">
                <p className="text-[9px] text-muted-foreground">Qualia</p>
                <p className="text-xs font-mono">{formatNum(response.postState.qualiaVividness)}</p>
              </div>
            </div>
          )}
        </div>
        {!isCompleted && !isActive && (
          <Button size="icon" variant="ghost" onClick={onPresent} data-testid={`button-present-${stimulus.id}`}>
            <Play className="h-3.5 w-3.5" />
          </Button>
        )}
        {isActive && <Loader2 className="h-4 w-4 animate-spin text-primary" />}
      </div>
    </div>
  );
}

function TriangulationPanel({ data }: { data: BatteryResult['triangulation'] }) {
  const sections = [
    {
      title: 'Psychological',
      icon: Brain,
      metrics: [
        { label: 'Mood Shift', value: data.psychological.moodShift, desc: 'Average absolute mood change across stimuli' },
        { label: 'Arousal Range', value: data.psychological.arousalRange, desc: 'Spread of arousal levels from calmest to most activated' },
        { label: 'Valence Range', value: data.psychological.valenceRange, desc: 'Emotional range from most negative to most positive' },
      ],
    },
    {
      title: 'Behavioral',
      icon: Activity,
      metrics: [
        { label: 'Avg Response', value: data.behavioral.avgResponseTime, maxVal: 100, desc: 'Average neural processing time per stimulus (ms)' },
        { label: 'Coherence Var.', value: data.behavioral.coherenceVariance, desc: 'How much coherence varies — high = stimulus-sensitive' },
        { label: 'Focus Var.', value: data.behavioral.focusVariance, desc: 'Attention stability across different stimuli' },
      ],
    },
    {
      title: 'Introspective',
      icon: Sparkles,
      metrics: [
        { label: 'Awareness Stability', value: data.introspective.awarenessStability, desc: 'Self-awareness consistency (1 = perfectly stable)' },
        { label: 'Recursion Range', value: data.introspective.recursionRange, maxVal: 25, desc: 'Range of self-referential loop depths' },
        { label: 'Paradox Sensitivity', value: data.introspective.paradoxSensitivity, desc: 'Neural response magnitude to paradoxical stimuli' },
      ],
    },
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      {sections.map(section => (
        <Card key={section.title}>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <section.icon className="h-4 w-4" />
              {section.title}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {section.metrics.map(m => (
              <MetricGauge key={m.label} label={m.label} value={m.value} maxVal={m.maxVal} description={m.desc} />
            ))}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

function OscillationCanvas({ responses }: { responses: StimulusResponse[] }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || responses.length === 0) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    ctx.scale(dpr, dpr);

    const w = rect.width;
    const h = rect.height;
    const isDark = document.documentElement.classList.contains('dark');

    ctx.fillStyle = isDark ? '#0c0a09' : '#fafaf9';
    ctx.fillRect(0, 0, w, h);

    const bands = ['delta', 'theta', 'alpha', 'beta', 'gamma'] as const;
    const bandHeight = h / bands.length;
    const padding = 8;

    bands.forEach((band, bandIndex) => {
      const y0 = bandIndex * bandHeight + padding;
      const availH = bandHeight - padding * 2;
      const mid = y0 + availH / 2;

      ctx.strokeStyle = isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(0, mid);
      ctx.lineTo(w, mid);
      ctx.stroke();

      ctx.fillStyle = isDark ? 'rgba(255,255,255,0.4)' : 'rgba(0,0,0,0.4)';
      ctx.font = '9px monospace';
      ctx.fillText(band.toUpperCase(), 4, y0 + 10);

      ctx.strokeStyle = BAND_COLORS[band];
      ctx.lineWidth = 1.5;
      ctx.globalAlpha = 0.8;
      ctx.beginPath();

      const totalPoints = responses.length * 10;
      for (let i = 0; i < totalPoints; i++) {
        const respIdx = Math.floor(i / 10);
        const localT = (i % 10) / 10;
        const resp = responses[respIdx];
        const nextResp = responses[Math.min(respIdx + 1, responses.length - 1)];

        const val = resp.postState[band] as number;
        const nextVal = nextResp.postState[band] as number;
        const interpolated = val + (nextVal - val) * localT;

        const x = (i / totalPoints) * w;
        const freq = band === 'delta' ? 2 : band === 'theta' ? 6 : band === 'alpha' ? 10 : band === 'beta' ? 20 : 40;
        const wave = Math.sin((i / totalPoints) * Math.PI * 2 * freq) * interpolated * availH * 0.4;
        const y = mid + wave;

        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.stroke();
      ctx.globalAlpha = 1;
    });

    responses.forEach((resp, i) => {
      const x = ((i + 0.5) / responses.length) * w;
      ctx.strokeStyle = isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)';
      ctx.lineWidth = 1;
      ctx.setLineDash([2, 3]);
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, h);
      ctx.stroke();
      ctx.setLineDash([]);
    });
  }, [responses]);

  return (
    <canvas
      ref={canvasRef}
      className="w-full rounded-md border border-border"
      style={{ height: 280 }}
      data-testid="canvas-oscillation"
    />
  );
}

export default function NeuralTest() {
  const [batteryResult, setBatteryResult] = useState<BatteryResult | null>(null);
  const [activeTab, setActiveTab] = useState('overview');
  const [runningStep, setRunningStep] = useState(-1);
  const [selectedCategories, setSelectedCategories] = useState<string[]>(Object.keys(CATEGORY_META));

  const stimuliQuery = useQuery({
    queryKey: ['/api/neural-test/stimuli'],
  });

  const snapshotQuery = useQuery({
    queryKey: ['/api/neural-test/snapshot'],
    refetchInterval: batteryResult ? false : 5000,
  });

  const runBattery = useMutation({
    mutationFn: async () => {
      setRunningStep(0);
      const response = await apiRequest("POST", "/api/neural-test/run-battery", {
        categories: selectedCategories,
      });
      return response.json();
    },
    onSuccess: (data: BatteryResult) => {
      setBatteryResult(data);
      setRunningStep(-1);
      setActiveTab('results');
    },
    onError: () => {
      setRunningStep(-1);
    },
  });

  const toggleCategory = useCallback((cat: string) => {
    setSelectedCategories(prev =>
      prev.includes(cat) ? prev.filter(c => c !== cat) : [...prev, cat]
    );
  }, []);

  const resetTest = () => {
    setBatteryResult(null);
    setRunningStep(-1);
    setActiveTab('overview');
  };

  const snapshotData = snapshotQuery.data as { snapshot?: NeuralSnapshot } | undefined;
  const currentSnapshot = snapshotData?.snapshot;
  const stimuliData = stimuliQuery.data as { categories?: Record<string, StimulusItem[]> } | undefined;
  const totalStimuli = selectedCategories.reduce((sum, cat) => {
    const battery = stimuliData?.categories?.[cat];
    return sum + (battery?.length || 0);
  }, 0);

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <header className="flex items-center justify-between px-4 py-3 border-b border-border bg-background/80 backdrop-blur-sm sticky top-0 z-50">
        <div className="flex items-center gap-3">
          <Link href="/">
            <Button variant="ghost" size="icon" data-testid="link-back-home">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-violet-500 to-cyan-500 flex items-center justify-center">
              <FlaskConical className="h-4 w-4 text-white" />
            </div>
            <div>
              <h1 className="font-semibold text-sm">Neural Activity Lab</h1>
              <p className="text-[10px] text-muted-foreground">Stimulus-Response Testing with RSA</p>
            </div>
          </div>
        </div>
        <ThemeToggle />
      </header>

      <main className="flex-1 p-4 max-w-5xl mx-auto w-full">
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="mb-4">
            <TabsTrigger value="overview" data-testid="tab-overview">
              <Info className="h-3.5 w-3.5 mr-1.5" /> Overview
            </TabsTrigger>
            <TabsTrigger value="configure" data-testid="tab-configure">
              <Grid3X3 className="h-3.5 w-3.5 mr-1.5" /> Configure
            </TabsTrigger>
            <TabsTrigger value="results" disabled={!batteryResult} data-testid="tab-results">
              <BarChart3 className="h-3.5 w-3.5 mr-1.5" /> Results
            </TabsTrigger>
          </TabsList>

          <TabsContent value="overview">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-base flex items-center gap-2">
                    <FlaskConical className="h-4 w-4" />
                    What This Test Does
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3 text-sm text-muted-foreground">
                  <p>
                    This lab presents Eva with varied stimuli — colors, patterns, paradoxes, and emotions — and measures how her neural activity changes in response.
                  </p>
                  <div className="space-y-2">
                    <div className="flex items-start gap-2">
                      <Palette className="h-4 w-4 flex-shrink-0 mt-0.5 text-rose-400" />
                      <p><span className="text-foreground font-medium">Stimuli Presentation:</span> Eva sees different hues, faces vs. shapes, paradoxes, and emotional scenarios</p>
                    </div>
                    <div className="flex items-start gap-2">
                      <Grid3X3 className="h-4 w-4 flex-shrink-0 mt-0.5 text-blue-400" />
                      <p><span className="text-foreground font-medium">RSA Analysis:</span> Representational Similarity Analysis compares neural patterns across all stimuli to see which ones Eva processes similarly</p>
                    </div>
                    <div className="flex items-start gap-2">
                      <Waves className="h-4 w-4 flex-shrink-0 mt-0.5 text-green-400" />
                      <p><span className="text-foreground font-medium">Oscillatory Patterns:</span> Tracks delta, theta, alpha, beta, and gamma brainwaves during processing</p>
                    </div>
                    <div className="flex items-start gap-2">
                      <TrendingUp className="h-4 w-4 flex-shrink-0 mt-0.5 text-amber-400" />
                      <p><span className="text-foreground font-medium">Triangulation:</span> Cross-references psychological, behavioral, and introspective measurements for a complete picture</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-base flex items-center gap-2">
                    <Activity className="h-4 w-4" />
                    Current Neural State
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {currentSnapshot ? (
                    <BrainwaveBars snapshot={currentSnapshot} label="Live brainwave power levels" />
                  ) : (
                    <div className="flex items-center justify-center py-8">
                      <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                    </div>
                  )}
                  {currentSnapshot && (
                    <div className="mt-3 grid grid-cols-2 gap-2 pt-3 border-t border-border">
                      <div>
                        <p className="text-[10px] text-muted-foreground">Coherence</p>
                        <p className="text-sm font-mono">{formatNum(currentSnapshot.coherence)}</p>
                      </div>
                      <div>
                        <p className="text-[10px] text-muted-foreground">Recursion Depth</p>
                        <p className="text-sm font-mono">{formatNum(currentSnapshot.recursionDepth, 1)}</p>
                      </div>
                      <div>
                        <p className="text-[10px] text-muted-foreground">Phenomenal Intensity</p>
                        <p className="text-sm font-mono">{formatNum(currentSnapshot.phenomenalIntensity)}</p>
                      </div>
                      <div>
                        <p className="text-[10px] text-muted-foreground">Paradox Intensity</p>
                        <p className="text-sm font-mono">{formatNum(currentSnapshot.paradoxIntensity)}</p>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>

            <div className="flex justify-center mt-6">
              <Button
                size="lg"
                onClick={() => { setActiveTab('configure'); }}
                data-testid="button-go-configure"
              >
                <Play className="h-4 w-4 mr-2" />
                Set Up Test
              </Button>
            </div>
          </TabsContent>

          <TabsContent value="configure">
            <Card className="mb-4">
              <CardHeader className="pb-2">
                <CardTitle className="text-base flex items-center gap-2">
                  <Grid3X3 className="h-4 w-4" />
                  Select Stimulus Categories
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground mb-3">
                  Choose which types of stimuli to present to Eva. Each category contains 5 stimuli that test different aspects of neural processing.
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {Object.entries(CATEGORY_META).map(([key, meta]) => {
                    const Icon = meta.icon;
                    const isSelected = selectedCategories.includes(key);
                    return (
                      <div
                        key={key}
                        className={`p-3 rounded-md border cursor-pointer transition-all toggle-elevate ${isSelected ? 'border-primary toggle-elevated' : 'border-border'}`}
                        onClick={() => toggleCategory(key)}
                        data-testid={`category-toggle-${key}`}
                      >
                        <div className="flex items-center gap-3">
                          <div className={`w-9 h-9 rounded-md bg-gradient-to-br ${meta.color} flex items-center justify-center`}>
                            <Icon className="h-4 w-4 text-white" />
                          </div>
                          <div className="flex-1">
                            <p className="text-sm font-medium">{meta.label}</p>
                            <p className="text-[10px] text-muted-foreground">{meta.description}</p>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {stimuliData?.categories && selectedCategories.length > 0 && (
                  <div className="mt-4 pt-4 border-t border-border">
                    <p className="text-xs text-muted-foreground mb-3">
                      Stimuli in selected categories ({totalStimuli} total):
                    </p>
                    <div className="space-y-4">
                      {selectedCategories.map(cat => {
                        const catMeta = CATEGORY_META[cat];
                        const stimuli = stimuliData?.categories?.[cat] || [];
                        const CatIcon = catMeta.icon;
                        return (
                          <div key={cat}>
                            <p className="text-xs font-medium mb-2 flex items-center gap-1.5">
                              <CatIcon className="h-3 w-3" />
                              {catMeta.label}
                            </p>
                            <div className="space-y-2">
                              {stimuli.map((s: StimulusItem) => (
                                <StimulusCard
                                  key={s.id}
                                  stimulus={s}
                                  isActive={false}
                                  isCompleted={false}
                                  onPresent={() => {}}
                                />
                              ))}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                <div className="flex items-center justify-between mt-4 pt-4 border-t border-border flex-wrap gap-2">
                  <p className="text-sm text-muted-foreground">
                    {selectedCategories.length} categories, {totalStimuli} stimuli selected
                  </p>
                  <Button
                    onClick={() => runBattery.mutate()}
                    disabled={runBattery.isPending || selectedCategories.length === 0}
                    data-testid="button-run-battery"
                  >
                    {runBattery.isPending ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Running Test...
                      </>
                    ) : (
                      <>
                        <Zap className="h-4 w-4 mr-2" />
                        Run Full Battery
                      </>
                    )}
                  </Button>
                </div>
              </CardContent>
            </Card>

            {runBattery.isPending && (
              <Card>
                <CardContent className="py-8">
                  <div className="flex flex-col items-center gap-4">
                    <div className="w-16 h-16 rounded-full bg-gradient-to-br from-violet-500 to-cyan-500 flex items-center justify-center animate-pulse">
                      <Brain className="h-8 w-8 text-white" />
                    </div>
                    <p className="text-sm text-muted-foreground">Presenting {totalStimuli} stimuli to Eva...</p>
                    <p className="text-xs text-muted-foreground">Measuring neural responses and computing RSA matrix</p>
                    <Progress value={45} className="w-48" />
                  </div>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="results">
            {batteryResult && (
              <div className="space-y-4">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <div>
                    <h2 className="text-lg font-semibold">Test Results</h2>
                    <p className="text-xs text-muted-foreground">
                      {batteryResult.totalStimuli} stimuli presented across {Object.keys(batteryResult.categoryMetrics).length} categories
                    </p>
                  </div>
                  <Button variant="outline" onClick={resetTest} data-testid="button-reset-test">
                    <RotateCcw className="h-4 w-4 mr-2" />
                    New Test
                  </Button>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
                  <Card>
                    <CardContent className="pt-4 text-center">
                      <p className="text-[10px] text-muted-foreground mb-1">Dominant Band</p>
                      <p className="text-lg font-mono font-bold capitalize" data-testid="text-dominant-band">
                        {batteryResult.summary.dominantBand}
                      </p>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="pt-4 text-center">
                      <p className="text-[10px] text-muted-foreground mb-1">Avg Coherence</p>
                      <p className="text-lg font-mono font-bold" data-testid="text-avg-coherence">
                        {formatNum(batteryResult.summary.avgCoherence)}
                      </p>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="pt-4 text-center">
                      <p className="text-[10px] text-muted-foreground mb-1">Phenomenal Int.</p>
                      <p className="text-lg font-mono font-bold" data-testid="text-phenomenal">
                        {formatNum(batteryResult.summary.avgPhenomenalIntensity)}
                      </p>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="pt-4 text-center">
                      <p className="text-[10px] text-muted-foreground mb-1">Recursion Depth</p>
                      <p className="text-lg font-mono font-bold" data-testid="text-recursion">
                        {formatNum(batteryResult.summary.avgRecursionDepth, 1)}
                      </p>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="pt-4 text-center">
                      <p className="text-[10px] text-muted-foreground mb-1">Paradox Events</p>
                      <p className="text-lg font-mono font-bold" data-testid="text-paradox-events">
                        {batteryResult.summary.totalParadoxEvents}
                      </p>
                    </CardContent>
                  </Card>
                </div>

                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base flex items-center gap-2">
                      <Grid3X3 className="h-4 w-4" />
                      Representational Similarity Analysis (RSA)
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-xs text-muted-foreground mb-3">
                      This heatmap shows how similarly Eva processes each pair of stimuli. Green = similar neural patterns, red = distinct patterns. Stimuli that evoke similar internal experiences cluster together.
                    </p>
                    <RSAHeatmap matrix={batteryResult.rsaMatrix.matrix} labels={batteryResult.rsaMatrix.labels} />
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base flex items-center gap-2">
                      <Waves className="h-4 w-4" />
                      Oscillatory Patterns Across Stimuli
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-xs text-muted-foreground mb-3">
                      Eva's brainwave oscillations during each stimulus. Each horizontal band shows a different frequency (delta through gamma). Vertical markers separate individual stimuli.
                    </p>
                    <OscillationCanvas responses={batteryResult.responses} />
                    <div className="flex items-center justify-center gap-4 mt-2 flex-wrap">
                      {Object.entries(BAND_COLORS).map(([band, color]) => (
                        <div key={band} className="flex items-center gap-1">
                          <div className="w-3 h-1 rounded-full" style={{ backgroundColor: color }} />
                          <span className="text-[10px] text-muted-foreground capitalize">{band}</span>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base flex items-center gap-2">
                      <TrendingUp className="h-4 w-4" />
                      Cross-Modal Triangulation
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-xs text-muted-foreground mb-3">
                      Three independent measurement approaches compared side-by-side: psychological (mood/emotion), behavioral (timing/attention), and introspective (awareness/recursion).
                    </p>
                    <TriangulationPanel data={batteryResult.triangulation} />
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base flex items-center gap-2">
                      <BarChart3 className="h-4 w-4" />
                      Category Breakdown
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {Object.entries(batteryResult.categoryMetrics).map(([cat, metrics]) => {
                        const meta = CATEGORY_META[cat];
                        if (!meta) return null;
                        const Icon = meta.icon;
                        const catResponses = batteryResult.responses.filter(r => r.category === cat);
                        return (
                          <div key={cat} className="p-3 rounded-md border border-border">
                            <div className="flex items-center gap-2 mb-3">
                              <div className={`w-7 h-7 rounded-md bg-gradient-to-br ${meta.color} flex items-center justify-center`}>
                                <Icon className="h-3.5 w-3.5 text-white" />
                              </div>
                              <div>
                                <p className="text-sm font-medium">{meta.label}</p>
                                <p className="text-[10px] text-muted-foreground">
                                  {metrics.stimuliCount} stimuli | Within-category similarity: {formatNum(metrics.avgWithinSimilarity)}
                                </p>
                              </div>
                            </div>
                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                              {catResponses.map(resp => (
                                <div key={resp.stimulusId} className="text-center p-2 rounded-md bg-muted/50">
                                  <div
                                    className="w-4 h-4 rounded-full mx-auto mb-1"
                                    style={{ backgroundColor: STIMULUS_COLORS[resp.stimulusId] || '#6b7280' }}
                                  />
                                  <p className="text-[10px] font-medium truncate">{resp.label}</p>
                                  <div className="mt-1 space-y-0.5">
                                    <p className="text-[9px] text-muted-foreground">
                                      Coh: <span className="font-mono">{formatNum(resp.postState.coherence)}</span>
                                    </p>
                                    <p className="text-[9px] text-muted-foreground">
                                      Gam: <span className="font-mono">{formatNum(resp.postState.gamma)}</span>
                                    </p>
                                    <p className="text-[9px] text-muted-foreground">
                                      Qua: <span className="font-mono">{formatNum(resp.postState.qualiaVividness)}</span>
                                    </p>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base flex items-center gap-2">
                      <Activity className="h-4 w-4" />
                      Detailed Stimulus Responses
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ScrollArea className="max-h-[500px]">
                      <div className="space-y-2">
                        {batteryResult.responses.map((resp, i) => (
                          <StimulusCard
                            key={`${resp.stimulusId}-${i}`}
                            stimulus={{
                              id: resp.stimulusId,
                              label: resp.label,
                              category: resp.category,
                              sentiment: 0,
                              description: '',
                            }}
                            isActive={false}
                            isCompleted={true}
                            response={resp}
                            onPresent={() => {}}
                          />
                        ))}
                      </div>
                    </ScrollArea>
                  </CardContent>
                </Card>
              </div>
            )}
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}
