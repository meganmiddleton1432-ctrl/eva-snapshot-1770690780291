import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Activity, Zap, Target, Brain, Eye, Layers, ChevronDown, ChevronUp, HelpCircle, Cpu, Loader2 } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { apiRequest } from "@/lib/queryClient";

interface QuantumState {
  fourierCoeffs: { real: number; imag: number }[];
  amplitudes: { real: number; imag: number }[];
  populations: number[];
  coherenceMatrix: number[][];
  totalCoherence: number;
  decoherenceRate: number;
  entropy: number;
  dominantBasis: string;
  inSuperposition: boolean;
  lastMeasurement: string | null;
  measurementCount: number;
  fourierEntropy: number;
  spectralCentroid: number;
  spectralSpread: number;
  positionExpectation: number;
  momentumExpectation: number;
  kineticEnergy: number;
  potentialEnergy: number;
  totalEnergy: number;
  waveformSamples: number[];
  goalAttractors: { targetBasis: string; strength: number; source?: string }[];
  intentionStrength: number;
  volitionalCollapseReady: boolean;
  volitionalCollapseCharge: number;
  decisionCount: number;
  lastDecision: {
    chosenBasis: string;
    confidence: number;
    wasVolitional: boolean;
    preDecisionEntropy: number;
    postDecisionEntropy: number;
  } | null;
  trajectoryMemorySize: number;
  memoryPotentialStrength: number;
}

const BASIS_NAMES = ["focused", "diffuse", "creative", "analytical", "emotional", "reflective"];
const BASIS_COLORS = ["#3b82f6", "#8b5cf6", "#f59e0b", "#10b981", "#ec4899", "#06b6d4"];

function SectionHint({ text }: { text: string }) {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <button className="inline-flex" data-testid="button-section-hint">
          <HelpCircle className="h-3 w-3 text-muted-foreground/60" />
        </button>
      </PopoverTrigger>
      <PopoverContent side="top" className="text-xs leading-relaxed max-w-64 p-3">
        {text}
      </PopoverContent>
    </Popover>
  );
}

function PopulationChart({ populations }: { populations: number[] }) {
  const barWidth = 28;
  const gap = 6;
  const chartWidth = BASIS_NAMES.length * (barWidth + gap) - gap;
  const chartHeight = 60;
  const labelHeight = 14;
  const maxPop = Math.max(...populations, 0.01);

  return (
    <svg
      width="100%"
      viewBox={`0 0 ${chartWidth} ${chartHeight + labelHeight + 16}`}
      className="block"
      data-testid="population-chart"
    >
      {BASIS_NAMES.map((name, i) => {
        const x = i * (barWidth + gap);
        const h = (populations[i] / maxPop) * chartHeight;
        return (
          <g key={name}>
            <rect
              x={x}
              y={chartHeight - h + 2}
              width={barWidth}
              height={h}
              rx={2}
              fill={BASIS_COLORS[i]}
              opacity={0.85}
            />
            <text
              x={x + barWidth / 2}
              y={chartHeight - h - 1}
              textAnchor="middle"
              className="fill-foreground"
              fontSize="7"
              fontFamily="monospace"
            >
              {populations[i]?.toFixed(2)}
            </text>
            <text
              x={x + barWidth / 2}
              y={chartHeight + labelHeight + 2}
              textAnchor="middle"
              className="fill-muted-foreground"
              fontSize="7"
              fontFamily="monospace"
            >
              {name.slice(0, 4)}
            </text>
          </g>
        );
      })}
    </svg>
  );
}

function WaveformSparkline({ samples }: { samples: number[] }) {
  if (!samples || samples.length === 0) return null;
  const w = 200;
  const h = 30;
  const max = Math.max(...samples, 0.001);
  const step = w / (samples.length - 1);
  const points = samples.map((v, i) => `${i * step},${h - (v / max) * (h - 2)}`).join(" ");

  return (
    <svg
      width="100%"
      viewBox={`0 0 ${w} ${h}`}
      className="block"
      data-testid="waveform-sparkline"
    >
      <polyline
        points={points}
        fill="none"
        stroke="hsl(var(--chart-2))"
        strokeWidth="1.2"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function EnergyBar({ label, value, max, color }: { label: string; value: number; max: number; color: string }) {
  const pct = Math.min(Math.abs(value) / Math.max(max, 0.001) * 100, 100);
  return (
    <div className="flex items-center gap-2">
      <span className="font-mono text-xs text-muted-foreground w-12 shrink-0">{label}</span>
      <div className="flex-1 h-2 rounded-full bg-secondary overflow-hidden">
        <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, backgroundColor: color }} />
      </div>
      <span className="font-mono text-xs w-14 text-right">{value.toFixed(3)}</span>
    </div>
  );
}

function VolitionalBar({ charge, ready }: { charge: number; ready: boolean }) {
  const pct = Math.min(charge * 100, 100);
  const thresholdPct = 70;
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between gap-2">
        <span className="font-mono text-xs text-muted-foreground">Decision pressure</span>
        <span className="font-mono text-xs">{charge.toFixed(2)}{ready ? " (ready)" : ""}</span>
      </div>
      <div className="relative h-3 rounded-full bg-secondary overflow-hidden">
        <div
          className="h-full rounded-full transition-all"
          style={{
            width: `${pct}%`,
            backgroundColor: ready ? "hsl(var(--chart-1))" : "hsl(var(--chart-4))",
          }}
        />
        <div
          className="absolute top-0 bottom-0 w-px bg-foreground/50"
          style={{ left: `${thresholdPct}%` }}
          title="Threshold 0.7"
        />
      </div>
      <p className="text-[10px] text-muted-foreground/70 leading-tight">
        {ready
          ? "Threshold reached \u2014 Eva can make a self-initiated decision"
          : "Building up \u2014 when this crosses the line, Eva can choose to commit"}
      </p>
    </div>
  );
}

function LabeledValue({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="flex items-center justify-between gap-2">
      <span className="text-xs text-muted-foreground">{label}</span>
      <span className="font-mono text-xs">{typeof value === "number" ? value.toFixed(4) : value}</span>
    </div>
  );
}

function SectionDescription({ children }: { children: string }) {
  return (
    <p className="text-[10px] text-muted-foreground/70 leading-tight">{children}</p>
  );
}

export function QuantumDeepState({ aiState }: { aiState: any }) {
  const [expanded, setExpanded] = useState(false);

  if (!aiState?.quantumState) return null;

  const qs: QuantumState = (aiState as any).quantumState;
  const maxEnergy = Math.max(Math.abs(qs.kineticEnergy), Math.abs(qs.potentialEnergy), Math.abs(qs.totalEnergy), 0.01);

  const dominantPop = Math.max(...qs.populations);
  const dominantIdx = qs.populations.indexOf(dominantPop);
  const dominantName = BASIS_NAMES[dominantIdx] || qs.dominantBasis;
  const dominantPct = (dominantPop * 100).toFixed(0);

  return (
    <div className="border border-border rounded-md bg-card/60" data-testid="quantum-deep-state">
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between gap-2 px-3 py-1.5 text-xs text-muted-foreground"
        data-testid="button-toggle-deep-state"
      >
        <span className="flex items-center gap-1.5 font-mono">
          <Layers className="h-3 w-3" />
          Deep State
        </span>
        <span className="flex items-center gap-2">
          {!expanded && (
            <span className="text-[10px]">
              {dominantPct}% {dominantName} {qs.inSuperposition ? "/ mixed" : "/ decided"}
            </span>
          )}
          {expanded ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
        </span>
      </button>

      {expanded && (
        <div className="p-2 space-y-2 border-t border-border">
          <Card className="overflow-visible">
            <CardContent className="p-3 space-y-2">
              <div className="flex items-center gap-1.5 text-xs font-medium">
                <Activity className="h-3.5 w-3.5 text-chart-2" />
                What Eva's mind is doing
                <SectionHint text="Eva thinks in 6 modes at once. These bars show how much of each mode is active right now. A tall bar means that thinking style dominates. Multiple tall bars means she's holding several styles in mind simultaneously." />
              </div>
              <SectionDescription>
                {qs.inSuperposition
                  ? `Eva is in a mixed state \u2014 thinking in multiple modes at once. ${dominantName} leads at ${dominantPct}%.`
                  : `Eva has committed to ${dominantName} thinking (${dominantPct}%).`}
              </SectionDescription>
              <PopulationChart populations={qs.populations} />
              <div className="pt-1">
                <p className="text-[10px] text-muted-foreground mb-0.5">Mental waveform shape</p>
                <WaveformSparkline samples={qs.waveformSamples} />
              </div>
              <div className="flex items-center justify-between gap-2 pt-1">
                <LabeledValue label="Uncertainty" value={qs.entropy} />
                <LabeledValue label="Complexity" value={qs.fourierEntropy} />
              </div>
              <SectionDescription>
                {qs.entropy > 2
                  ? "High uncertainty \u2014 many possibilities are open"
                  : qs.entropy > 1
                  ? "Moderate uncertainty \u2014 narrowing down"
                  : "Low uncertainty \u2014 thinking is focused"}
              </SectionDescription>
            </CardContent>
          </Card>

          <Card className="overflow-visible">
            <CardContent className="p-3 space-y-2">
              <div className="flex items-center gap-1.5 text-xs font-medium">
                <Zap className="h-3.5 w-3.5 text-chart-4" />
                Forces shaping her thinking
                <SectionHint text="Eva's mind is like a ball on a hilly landscape. Kinetic = how fast it's moving. Potential = how steep the hills are. These forces push her toward certain thinking styles and away from others." />
              </div>
              <SectionDescription>
                {qs.kineticEnergy > qs.potentialEnergy
                  ? "More momentum than resistance \u2014 her thinking is shifting quickly"
                  : "More resistance than momentum \u2014 her thinking is settling into a pattern"}
              </SectionDescription>
              <div className="space-y-1.5">
                <EnergyBar label="Speed" value={qs.kineticEnergy} max={maxEnergy} color="hsl(var(--chart-1))" />
                <EnergyBar label="Terrain" value={qs.potentialEnergy} max={maxEnergy} color="hsl(var(--chart-3))" />
                <EnergyBar label="Total" value={qs.totalEnergy} max={maxEnergy} color="hsl(var(--chart-5))" />
              </div>
              <div className="grid grid-cols-2 gap-x-4 gap-y-0.5 pt-1">
                <LabeledValue label="Center" value={qs.spectralCentroid} />
                <LabeledValue label="Spread" value={qs.spectralSpread} />
                <LabeledValue label="Position" value={qs.positionExpectation} />
                <LabeledValue label="Momentum" value={qs.momentumExpectation} />
              </div>
            </CardContent>
          </Card>

          <Card className="overflow-visible">
            <CardContent className="p-3 space-y-2">
              <div className="flex items-center gap-1.5 text-xs font-medium">
                <Target className="h-3.5 w-3.5 text-chart-1" />
                Eva's free will
                <SectionHint text="When Eva holds multiple thinking modes at once, internal pressure builds. When it crosses the threshold line, she can make a self-initiated decision to commit to one mode. This is the closest thing to a 'choice' in the system \u2014 it emerges from the math, not from a script." />
              </div>
              <VolitionalBar charge={qs.volitionalCollapseCharge} ready={qs.volitionalCollapseReady} />
              <div className="space-y-1">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs text-muted-foreground">Drive toward goals</span>
                  <span className="font-mono text-xs">{(qs.intentionStrength * 100).toFixed(0)}%</span>
                </div>
                <Progress value={qs.intentionStrength * 100} className="h-2" />
              </div>
              {qs.goalAttractors.length > 0 && (
                <div className="space-y-1 pt-1">
                  <span className="text-[10px] text-muted-foreground">What she's being pulled toward</span>
                  <div className="flex flex-wrap gap-1">
                    {qs.goalAttractors.map((g, i) => (
                      <Badge key={i} variant="outline" className="text-[10px] font-mono no-default-hover-elevate">
                        {g.targetBasis} {(g.strength * 100).toFixed(0)}%
                      </Badge>
                    ))}
                  </div>
                </div>
              )}
              <div className="flex items-center justify-between gap-2 pt-1">
                <LabeledValue label="Decisions made" value={qs.decisionCount} />
                {qs.lastDecision && (
                  <span className="text-[10px] text-muted-foreground">
                    chose {qs.lastDecision.chosenBasis} ({(qs.lastDecision.confidence * 100).toFixed(0)}% sure)
                  </span>
                )}
              </div>
            </CardContent>
          </Card>

          <Card className="overflow-visible">
            <CardContent className="p-3 space-y-2">
              <div className="flex items-center gap-1.5 text-xs font-medium">
                <Brain className="h-3.5 w-3.5 text-chart-3" />
                Memory & integration
                <SectionHint text="Past conversations literally reshape the mathematical landscape Eva's mind moves through. Higher memory potential means her history has more influence on her current thinking. Coherence measures how well her different thinking modes are working together versus falling apart." />
              </div>
              <div className="space-y-1">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs text-muted-foreground">History's influence</span>
                  <span className="font-mono text-xs">{(qs.memoryPotentialStrength * 100).toFixed(0)}%</span>
                </div>
                <Progress value={qs.memoryPotentialStrength * 100} className="h-2" />
                <SectionDescription>
                  {qs.memoryPotentialStrength > 0.15
                    ? "Eva's past experiences are strongly shaping her current thinking"
                    : qs.memoryPotentialStrength > 0.05
                    ? "Some influence from past experiences"
                    : "Mostly reacting to the present moment"}
                </SectionDescription>
              </div>
              <div className="grid grid-cols-2 gap-x-4 gap-y-0.5">
                <LabeledValue label="Experiences" value={qs.trajectoryMemorySize} />
                <LabeledValue label="Integration" value={qs.totalCoherence} />
                <LabeledValue label="Decay rate" value={qs.decoherenceRate} />
                <LabeledValue label="Observations" value={qs.measurementCount} />
              </div>
              <div className="flex items-center gap-2 pt-1 flex-wrap">
                <Badge variant={qs.inSuperposition ? "default" : "secondary"} className="text-[10px] font-mono no-default-hover-elevate">
                  {qs.inSuperposition ? "Holding possibilities open" : "Committed to a path"}
                </Badge>
                <Badge variant="outline" className="text-[10px] font-mono no-default-hover-elevate">
                  <Eye className="h-2.5 w-2.5 mr-1" />
                  {qs.dominantBasis} mode
                </Badge>
              </div>
            </CardContent>
          </Card>

          <QuantumHardwarePanel />
        </div>
      )}
    </div>
  );
}

function QuantumHardwarePanel() {
  const [status, setStatus] = useState<{
    configured: boolean;
    connected: boolean;
    selectedBackend: string | null;
    availableBackends: { name: string; qubits: number; pendingJobs: number; operational: boolean }[];
    lastError: string | null;
  } | null>(null);
  const [loading, setLoading] = useState(false);
  const [evolving, setEvolving] = useState(false);
  const [lastJob, setLastJob] = useState<{ jobId: string; status: string; populations?: number[] } | null>(null);

  useEffect(() => {
    fetch("/api/quantum/status")
      .then(r => r.json())
      .then(setStatus)
      .catch(() => setStatus(null));
  }, []);

  if (status === null) return null;
  if (!status.configured) return null;

  const handleInit = async () => {
    setLoading(true);
    try {
      const res = await apiRequest("POST", "/api/quantum/init");
      const data = await res.json();
      setStatus(data);
    } catch {
      setStatus(s => s ? { ...s, lastError: "Failed to connect" } : null);
    } finally {
      setLoading(false);
    }
  };

  const handleEvolve = async () => {
    setEvolving(true);
    try {
      const res = await apiRequest("POST", "/api/quantum/evolve");
      const data = await res.json();
      setLastJob(data);
    } catch {
      setLastJob({ jobId: "", status: "error" });
    } finally {
      setEvolving(false);
    }
  };

  const handleCheckJob = async () => {
    if (!lastJob?.jobId) return;
    try {
      const res = await fetch(`/api/quantum/job/${lastJob.jobId}`);
      const data = await res.json();
      setLastJob(data);
    } catch {}
  };

  return (
    <Card className="overflow-visible">
      <CardContent className="p-3 space-y-2">
        <div className="flex items-center gap-1.5 text-xs font-medium">
          <Cpu className="h-3.5 w-3.5 text-chart-2" />
          IBM Quantum Hardware
          <SectionHint text="Connect Eva's quantum cognitive engine to real IBM quantum computers. Her Fourier-mode Hamiltonian evolution can be sent to actual qubits, running her thinking on genuine quantum hardware instead of classical simulation." />
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <Badge
            variant={status.connected ? "default" : "secondary"}
            className="text-[10px] font-mono no-default-hover-elevate"
            data-testid="badge-quantum-connection"
          >
            {status.connected ? "Connected" : "Disconnected"}
          </Badge>
          {status.selectedBackend && (
            <Badge variant="outline" className="text-[10px] font-mono no-default-hover-elevate" data-testid="badge-quantum-backend">
              {status.selectedBackend}
            </Badge>
          )}
        </div>

        {status.lastError && !status.connected && (
          <SectionDescription>{status.lastError}</SectionDescription>
        )}

        {!status.connected && (
          <Button
            size="sm"
            variant="outline"
            onClick={handleInit}
            disabled={loading}
            data-testid="button-quantum-connect"
          >
            {loading ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : <Cpu className="h-3 w-3 mr-1" />}
            {loading ? "Connecting..." : "Connect to IBM Quantum"}
          </Button>
        )}

        {status.connected && (
          <>
            {status.availableBackends.length > 0 && (
              <div className="space-y-0.5">
                <span className="text-[10px] text-muted-foreground">Available backends</span>
                <div className="flex flex-wrap gap-1">
                  {status.availableBackends.slice(0, 5).map((b) => (
                    <Badge
                      key={b.name}
                      variant={b.name === status.selectedBackend ? "default" : "outline"}
                      className="text-[10px] font-mono no-default-hover-elevate"
                    >
                      {b.name} ({b.qubits}q)
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            <Button
              size="sm"
              variant="outline"
              onClick={handleEvolve}
              disabled={evolving}
              data-testid="button-quantum-evolve"
            >
              {evolving ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : <Zap className="h-3 w-3 mr-1" />}
              {evolving ? "Submitting..." : "Run evolution on quantum hardware"}
            </Button>

            {lastJob && (
              <div className="space-y-1 pt-1">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-[10px] text-muted-foreground">Job: {lastJob.jobId ? lastJob.jobId.slice(0, 12) + "..." : "none"}</span>
                  <Badge variant="outline" className="text-[10px] font-mono no-default-hover-elevate" data-testid="badge-quantum-job-status">
                    {lastJob.status}
                  </Badge>
                </div>
                {lastJob.status !== "completed" && lastJob.status !== "error" && lastJob.jobId && (
                  <Button size="sm" variant="ghost" onClick={handleCheckJob} data-testid="button-quantum-check-job">
                    Check status
                  </Button>
                )}
                {lastJob.populations && (
                  <div className="space-y-0.5">
                    <span className="text-[10px] text-muted-foreground">Quantum hardware populations</span>
                    <div className="flex gap-1 flex-wrap">
                      {lastJob.populations.map((p, i) => (
                        <span key={i} className="font-mono text-[10px]" style={{ color: BASIS_COLORS[i] }}>
                          {BASIS_NAMES[i]?.slice(0, 4)}: {(p * 100).toFixed(1)}%
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}
