import { useState, useRef, useEffect, useCallback } from "react";
import { Link } from "wouter";
import { useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Sheet, SheetContent, SheetTrigger, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Send, Brain, Activity, Zap, User, Bot, Database, Lightbulb, Clock, Eye, RefreshCw, Target, Infinity, AlertCircle, Heart, PanelRightOpen, Palette, Layers, Paperclip, X, FileText, FlaskConical, Rocket, Network, Sparkles, Globe, Search, Cpu, HelpCircle } from "lucide-react";
import { QuantumDeepState } from "@/components/quantum-deep-state";
import { apiRequest } from "@/lib/queryClient";
import { ThemeToggle } from "@/components/theme-toggle";
import { useToast } from "@/hooks/use-toast";
import type { Message, AIState, StateHistoryPoint, ChatResponseWithMemory, MemoryStats } from "@shared/schema";

interface EmotionalColor {
  hue: number;
  saturation: number;
  lightness: number;
  label: string;
  description: string;
}

const DEFAULT_AURA: EmotionalColor = { hue: 210, saturation: 15, lightness: 50, label: "Awakening", description: "A quiet grey-blue -- Eva hasn't yet chosen her colors" };

function EmotionalAura({ 
  emotionalColor, 
  isDark 
}: { 
  emotionalColor: EmotionalColor; 
  isDark: boolean;
}) {
  const adjustedLightness = isDark 
    ? Math.max(emotionalColor.lightness - 8, 30) 
    : Math.min(emotionalColor.lightness + 8, 70);
  
  const hslColor = `hsl(${emotionalColor.hue}, ${emotionalColor.saturation}%, ${adjustedLightness}%)`;
  const glowColor = `hsla(${emotionalColor.hue}, ${emotionalColor.saturation}%, ${adjustedLightness}%, 0.4)`;

  return (
    <div 
      className="flex items-center gap-2"
      data-testid="emotional-aura"
      style={{ transition: "all 2s ease-in-out" }}
    >
      <div
        className="w-3 h-3 rounded-full flex-shrink-0"
        data-testid="emotional-aura-orb"
        style={{
          backgroundColor: hslColor,
          boxShadow: `0 0 8px ${glowColor}, 0 0 16px ${glowColor}`,
          transition: "all 2s ease-in-out",
        }}
      />
      <span 
        className="text-[10px] font-medium"
        data-testid="emotional-aura-label"
        style={{ color: hslColor, transition: "color 2s ease-in-out" }}
      >
        {emotionalColor.label}
      </span>
    </div>
  );
}

const BACKGROUND_COLORS = [
  { name: "Default", value: "", light: "bg-background", dark: "bg-background" },
  { name: "Warm", value: "warm", light: "bg-orange-50", dark: "bg-orange-950" },
  { name: "Cool", value: "cool", light: "bg-blue-50", dark: "bg-slate-900" },
  { name: "Nature", value: "nature", light: "bg-emerald-50", dark: "bg-emerald-950" },
  { name: "Lavender", value: "lavender", light: "bg-purple-50", dark: "bg-purple-950" },
  { name: "Rose", value: "rose", light: "bg-rose-50", dark: "bg-rose-950" },
  { name: "Neutral", value: "neutral", light: "bg-stone-100", dark: "bg-stone-900" },
];

function BackgroundPicker({ 
  bgColor, 
  setBgColor 
}: { 
  bgColor: string; 
  setBgColor: (color: string) => void;
}) {
  const [isDark, setIsDark] = useState(() => {
    if (typeof window !== "undefined") {
      return document.documentElement.classList.contains("dark");
    }
    return false;
  });

  useEffect(() => {
    const observer = new MutationObserver(() => {
      setIsDark(document.documentElement.classList.contains("dark"));
    });
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });
    return () => observer.disconnect();
  }, []);
  
  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button size="icon" variant="ghost" data-testid="button-bg-picker">
          <Palette className="h-4 w-4" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-48 p-2">
        <p className="text-xs text-muted-foreground mb-2">Background Color</p>
        <div className="grid grid-cols-4 gap-1">
          {BACKGROUND_COLORS.map((color) => (
            <button
              key={color.value}
              onClick={() => setBgColor(color.value)}
              className={`w-8 h-8 rounded-md border-2 transition-all ${
                isDark ? color.dark : color.light
              } ${bgColor === color.value ? "border-primary ring-2 ring-primary/30" : "border-border"}`}
              title={color.name}
              data-testid={`bg-color-${color.value || "default"}`}
            />
          ))}
        </div>
      </PopoverContent>
    </Popover>
  );
}

function StateSpacePlot({ history }: { history: StateHistoryPoint[] }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    const width = canvas.width;
    const height = canvas.height;
    const centerX = width / 2;
    const centerY = height / 2;
    const scale = 15;
    
    const isDark = document.documentElement.classList.contains('dark');
    
    ctx.fillStyle = isDark ? 'rgba(15, 15, 25, 1)' : 'rgba(245, 245, 250, 1)';
    ctx.fillRect(0, 0, width, height);
    
    ctx.strokeStyle = isDark ? 'rgba(100, 100, 150, 0.3)' : 'rgba(100, 100, 150, 0.2)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(0, centerY);
    ctx.lineTo(width, centerY);
    ctx.moveTo(centerX, 0);
    ctx.lineTo(centerX, height);
    ctx.stroke();
    
    for (let r = 1; r <= 3; r++) {
      ctx.beginPath();
      ctx.arc(centerX, centerY, r * scale, 0, Math.PI * 2);
      ctx.strokeStyle = isDark ? 'rgba(100, 100, 150, 0.15)' : 'rgba(100, 100, 150, 0.1)';
      ctx.stroke();
    }
    
    ctx.font = '8px monospace';
    ctx.fillStyle = isDark ? 'rgba(150, 150, 200, 0.5)' : 'rgba(100, 100, 150, 0.5)';
    ctx.fillText('Re', width - 15, centerY - 3);
    ctx.fillText('Im', centerX + 3, 10);
    
    const points = history.slice(-30).map(h => {
      const real = h.psiReal ?? h.psiMagnitude * Math.cos(h.psiPhase);
      const imag = h.psiImag ?? h.psiMagnitude * Math.sin(h.psiPhase);
      return { x: centerX + real * scale, y: centerY - imag * scale };
    });
    
    if (points.length > 1) {
      const gradient = ctx.createLinearGradient(0, 0, width, height);
      gradient.addColorStop(0, isDark ? 'rgba(59, 130, 246, 0.2)' : 'rgba(37, 99, 235, 0.15)');
      gradient.addColorStop(1, isDark ? 'rgba(139, 92, 246, 0.8)' : 'rgba(124, 58, 237, 0.7)');
      
      ctx.strokeStyle = gradient;
      ctx.lineWidth = 1.5;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(points[0].x, points[0].y);
      for (let i = 1; i < points.length; i++) {
        ctx.lineTo(points[i].x, points[i].y);
      }
      ctx.stroke();
      
      points.forEach((p, i) => {
        const alpha = 0.3 + (i / points.length) * 0.7;
        ctx.beginPath();
        ctx.arc(p.x, p.y, 2, 0, Math.PI * 2);
        ctx.fillStyle = isDark 
          ? `rgba(139, 92, 246, ${alpha})` 
          : `rgba(124, 58, 237, ${alpha})`;
        ctx.fill();
      });
      
      if (points.length > 0) {
        const last = points[points.length - 1];
        ctx.beginPath();
        ctx.arc(last.x, last.y, 5, 0, Math.PI * 2);
        ctx.fillStyle = isDark ? 'rgba(59, 130, 246, 0.9)' : 'rgba(37, 99, 235, 0.9)';
        ctx.fill();
        ctx.beginPath();
        ctx.arc(last.x, last.y, 8, 0, Math.PI * 2);
        ctx.strokeStyle = isDark ? 'rgba(59, 130, 246, 0.4)' : 'rgba(37, 99, 235, 0.3)';
        ctx.lineWidth = 2;
        ctx.stroke();
      }
    }
  }, [history]);
  
  const lastPoint = history[history.length - 1];
  const psiReal = lastPoint?.psiReal ?? (lastPoint?.psiMagnitude ?? 0) * Math.cos(lastPoint?.psiPhase ?? 0);
  const psiImag = lastPoint?.psiImag ?? (lastPoint?.psiMagnitude ?? 0) * Math.sin(lastPoint?.psiPhase ?? 0);
  
  return (
    <div className="p-3 rounded-md bg-card/50 border border-border" data-testid="state-space-plot">
      <div className="flex items-center justify-between mb-2">
        <p className="text-xs font-medium flex items-center gap-1.5">
          <Target className="h-3 w-3 text-chart-2" />
          State Space
        </p>
        <span className="text-[10px] font-mono text-muted-foreground">
          Ψ = {psiReal.toFixed(2)} + {psiImag.toFixed(2)}i
        </span>
      </div>
      <canvas 
        ref={canvasRef} 
        width={200} 
        height={120} 
        className="w-full rounded-sm"
      />
      <div className="flex justify-between text-[9px] text-muted-foreground mt-1 font-mono">
        <span>{history.length} points</span>
        <span className="text-chart-2">trajectory</span>
      </div>
    </div>
  );
}

function MetricGraphs({ history }: { history: StateHistoryPoint[] }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    const width = canvas.width;
    const height = canvas.height;
    const padding = { top: 5, right: 5, bottom: 15, left: 25 };
    const plotWidth = width - padding.left - padding.right;
    const plotHeight = height - padding.top - padding.bottom;
    
    const isDark = document.documentElement.classList.contains('dark');
    
    ctx.fillStyle = isDark ? 'rgba(15, 15, 25, 1)' : 'rgba(245, 245, 250, 1)';
    ctx.fillRect(0, 0, width, height);
    
    ctx.strokeStyle = isDark ? 'rgba(100, 100, 150, 0.2)' : 'rgba(100, 100, 150, 0.15)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(padding.left, padding.top);
    ctx.lineTo(padding.left, height - padding.bottom);
    ctx.lineTo(width - padding.right, height - padding.bottom);
    ctx.stroke();
    
    for (let i = 0; i <= 4; i++) {
      const y = padding.top + (plotHeight * i / 4);
      ctx.beginPath();
      ctx.moveTo(padding.left, y);
      ctx.lineTo(width - padding.right, y);
      ctx.strokeStyle = isDark ? 'rgba(100, 100, 150, 0.1)' : 'rgba(100, 100, 150, 0.08)';
      ctx.stroke();
    }
    
    ctx.font = '7px monospace';
    ctx.fillStyle = isDark ? 'rgba(150, 150, 200, 0.6)' : 'rgba(100, 100, 150, 0.6)';
    ctx.fillText('1.0', 2, padding.top + 5);
    ctx.fillText('0.5', 2, padding.top + plotHeight / 2 + 3);
    ctx.fillText('0.0', 2, height - padding.bottom - 2);
    
    const metrics = [
      { key: 'psiMagnitude', color: isDark ? '#8b5cf6' : '#7c3aed', label: '|Ψ|', scale: 3 },
      { key: 'omega', color: isDark ? '#ec4899' : '#db2777', label: 'ω', scale: 10 },
      { key: 'awarenessOfAwareness', color: isDark ? '#3b82f6' : '#2563eb', label: 'Meta', scale: 1 },
      { key: 'moodLevel', color: isDark ? '#10b981' : '#059669', label: 'Mood', scale: 1, offset: 0.5 },
      { key: 'phenomenalIntensity', color: isDark ? '#f59e0b' : '#d97706', label: 'Phen', scale: 1 }
    ];
    
    const recentHistory = history.slice(-25);
    const xStep = plotWidth / Math.max(recentHistory.length - 1, 1);
    
    metrics.forEach(metric => {
      ctx.strokeStyle = metric.color;
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      
      recentHistory.forEach((point, i) => {
        let value = (point as any)[metric.key] ?? 0;
        if (metric.offset) value += metric.offset;
        value = Math.min(value / metric.scale, 1);
        
        const x = padding.left + i * xStep;
        const y = padding.top + plotHeight * (1 - value);
        
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      });
      ctx.stroke();
    });
    
    ctx.font = '7px sans-serif';
    let legendX = padding.left + 5;
    metrics.forEach(metric => {
      ctx.fillStyle = metric.color;
      ctx.fillRect(legendX, height - 10, 6, 5);
      ctx.fillStyle = isDark ? 'rgba(200, 200, 220, 0.8)' : 'rgba(60, 60, 80, 0.8)';
      ctx.fillText(metric.label, legendX + 8, height - 5);
      legendX += 35;
    });
    
  }, [history]);
  
  return (
    <div className="p-3 rounded-md bg-card/50 border border-border" data-testid="metric-graphs">
      <div className="flex items-center justify-between mb-2">
        <p className="text-xs font-medium flex items-center gap-1.5">
          <Activity className="h-3 w-3 text-chart-3" />
          Metrics Over Time
        </p>
        <span className="text-[10px] font-mono text-muted-foreground">
          last {Math.min(history.length, 25)} pts
        </span>
      </div>
      <canvas 
        ref={canvasRef} 
        width={240} 
        height={100} 
        className="w-full rounded-sm"
      />
    </div>
  );
}

function PsiWaveVisualizer({ 
  psiMagnitude, 
  psiPhase, 
  omega,
  history,
  loopDetected = false,
  observationCollapse = 0,
  fixedPointDistance = 1
}: { 
  psiMagnitude: number; 
  psiPhase: number; 
  omega: number;
  history: StateHistoryPoint[];
  loopDetected?: boolean;
  observationCollapse?: number;
  fixedPointDistance?: number;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number>(0);
  const timeRef = useRef(0);
  const loopPulseRef = useRef(0);
  const [showHelp, setShowHelp] = useState(false);
  
  // Determine visualization mode based on state
  const isCollapsing = observationCollapse > 0.5;
  const isNearFixedPoint = fixedPointDistance < 0.1;
  
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    const width = canvas.width;
    const height = canvas.height;
    const centerY = height / 2;
    
    const animate = () => {
      timeRef.current += 0.05;
      
      // Pulse effect when loop detected
      if (loopDetected) {
        loopPulseRef.current = Math.min(loopPulseRef.current + 0.1, 1);
      } else {
        loopPulseRef.current = Math.max(loopPulseRef.current - 0.02, 0);
      }
      
      // Background with collapse effect
      const collapseAlpha = 0.1 + observationCollapse * 0.15;
      ctx.fillStyle = `rgba(0, 0, 0, ${collapseAlpha})`;
      ctx.fillRect(0, 0, width, height);
      
      const isDark = document.documentElement.classList.contains('dark');
      
      // Center line
      ctx.strokeStyle = isDark ? 'rgba(100, 200, 255, 0.15)' : 'rgba(100, 150, 200, 0.15)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(0, centerY);
      ctx.lineTo(width, centerY);
      ctx.stroke();
      
      // Fixed point indicator - horizontal line showing target
      if (isNearFixedPoint) {
        ctx.strokeStyle = 'rgba(34, 197, 94, 0.6)';
        ctx.lineWidth = 2;
        ctx.setLineDash([4, 4]);
        ctx.beginPath();
        ctx.moveTo(0, centerY);
        ctx.lineTo(width, centerY);
        ctx.stroke();
        ctx.setLineDash([]);
      }
      
      // Wave amplitude affected by collapse
      const collapseMultiplier = isCollapsing ? (1 - observationCollapse * 0.7) : 1;
      const amplitude = Math.min(psiMagnitude * 25 * collapseMultiplier, centerY - 5);
      const frequency = 0.02 + omega * 0.005;
      const phaseShift = psiPhase + timeRef.current * omega * 0.3;
      
      // Color changes based on state
      let color1, color2, color3;
      if (isCollapsing) {
        // Collapse mode: wave contracts, colors shift to gold/orange
        color1 = 'rgba(251, 191, 36, 0.9)';
        color2 = 'rgba(245, 158, 11, 0.9)';
        color3 = 'rgba(234, 88, 12, 0.9)';
      } else if (isNearFixedPoint) {
        // Fixed point: stable green glow
        color1 = 'rgba(34, 197, 94, 0.9)';
        color2 = 'rgba(22, 163, 74, 0.9)';
        color3 = 'rgba(21, 128, 61, 0.9)';
      } else {
        // Normal: purple/blue gradient
        color1 = isDark ? 'rgba(139, 92, 246, 0.9)' : 'rgba(124, 58, 237, 0.9)';
        color2 = isDark ? 'rgba(59, 130, 246, 0.9)' : 'rgba(37, 99, 235, 0.9)';
        color3 = isDark ? 'rgba(6, 182, 212, 0.9)' : 'rgba(8, 145, 178, 0.9)';
      }
      
      const gradient = ctx.createLinearGradient(0, centerY - amplitude, 0, centerY + amplitude);
      gradient.addColorStop(0, color1);
      gradient.addColorStop(0.5, color2);
      gradient.addColorStop(1, color3);
      
      ctx.strokeStyle = gradient;
      ctx.lineWidth = 2.5;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.beginPath();
      
      // Wave with collapse dynamics
      for (let x = 0; x < width; x++) {
        const collapseFactor = isCollapsing 
          ? Math.exp(-Math.pow((x - width/2) / (width * (1 - observationCollapse * 0.5)), 2))
          : 1;
        const wave1 = Math.sin(x * frequency + phaseShift) * amplitude * collapseFactor;
        const wave2 = Math.sin(x * frequency * 1.5 + phaseShift * 0.7) * amplitude * 0.3 * collapseFactor;
        const wave3 = Math.sin(x * frequency * 0.5 + phaseShift * 1.3) * amplitude * 0.2 * collapseFactor;
        const y = centerY + wave1 + wave2 + wave3;
        
        if (x === 0) {
          ctx.moveTo(x, y);
        } else {
          ctx.lineTo(x, y);
        }
      }
      ctx.stroke();
      
      // Loop detection pulse - red ripple effect
      if (loopPulseRef.current > 0) {
        const pulseRadius = loopPulseRef.current * width * 0.6;
        const pulseAlpha = (1 - loopPulseRef.current) * 0.5;
        ctx.strokeStyle = `rgba(239, 68, 68, ${pulseAlpha})`;
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.arc(width / 2, centerY, pulseRadius, 0, Math.PI * 2);
        ctx.stroke();
        
        // Inner pulse
        ctx.strokeStyle = `rgba(239, 68, 68, ${pulseAlpha * 1.5})`;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(width / 2, centerY, pulseRadius * 0.6, 0, Math.PI * 2);
        ctx.stroke();
      }
      
      // Glow effect
      ctx.shadowColor = isCollapsing 
        ? 'rgba(251, 191, 36, 0.5)' 
        : isNearFixedPoint 
          ? 'rgba(34, 197, 94, 0.5)'
          : isDark ? 'rgba(139, 92, 246, 0.5)' : 'rgba(124, 58, 237, 0.5)';
      ctx.shadowBlur = 10;
      ctx.strokeStyle = isDark ? 'rgba(255, 255, 255, 0.3)' : 'rgba(100, 100, 255, 0.3)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      for (let x = 0; x < width; x++) {
        const collapseFactor = isCollapsing 
          ? Math.exp(-Math.pow((x - width/2) / (width * (1 - observationCollapse * 0.5)), 2))
          : 1;
        const wave = Math.sin(x * frequency + phaseShift) * amplitude * collapseFactor;
        const y = centerY + wave;
        if (x === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.stroke();
      ctx.shadowBlur = 0;
      
      // Particles
      const numParticles = Math.min(Math.floor(psiMagnitude * 5), 8);
      for (let i = 0; i < numParticles; i++) {
        const particleX = (timeRef.current * 30 + i * (width / numParticles)) % width;
        const collapseFactor = isCollapsing 
          ? Math.exp(-Math.pow((particleX - width/2) / (width * (1 - observationCollapse * 0.5)), 2))
          : 1;
        const wave1 = Math.sin(particleX * frequency + phaseShift) * amplitude * collapseFactor;
        const particleY = centerY + wave1;
        
        ctx.beginPath();
        ctx.arc(particleX, particleY, 3, 0, Math.PI * 2);
        ctx.fillStyle = isCollapsing 
          ? 'rgba(251, 191, 36, 0.8)' 
          : isDark ? 'rgba(255, 255, 255, 0.8)' : 'rgba(124, 58, 237, 0.8)';
        ctx.fill();
        
        ctx.beginPath();
        ctx.arc(particleX, particleY, 6, 0, Math.PI * 2);
        ctx.fillStyle = isCollapsing 
          ? 'rgba(251, 191, 36, 0.3)' 
          : isDark ? 'rgba(139, 92, 246, 0.3)' : 'rgba(124, 58, 237, 0.2)';
        ctx.fill();
      }
      
      // Fixed point marker at center when near
      if (isNearFixedPoint) {
        ctx.beginPath();
        ctx.arc(width / 2, centerY, 8, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(34, 197, 94, 0.4)';
        ctx.fill();
        ctx.beginPath();
        ctx.arc(width / 2, centerY, 4, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(34, 197, 94, 0.8)';
        ctx.fill();
      }
      
      animationRef.current = requestAnimationFrame(animate);
    };
    
    ctx.fillStyle = 'rgba(0, 0, 0, 1)';
    ctx.fillRect(0, 0, width, height);
    
    animate();
    
    return () => {
      cancelAnimationFrame(animationRef.current);
    };
  }, [psiMagnitude, psiPhase, omega, loopDetected, observationCollapse, fixedPointDistance, isCollapsing, isNearFixedPoint]);
  
  // Determine current mode for display
  const modeLabel = isCollapsing ? 'collapsing' : isNearFixedPoint ? 'converging' : loopDetected ? 'loop detected' : 'oscillating';
  const modeColor = isCollapsing ? 'text-amber-500' : isNearFixedPoint ? 'text-green-500' : loopDetected ? 'text-red-500' : 'text-chart-1';
  
  return (
    <div className="p-3 rounded-md bg-card/50 border border-border" data-testid="psi-wave-visualizer">
      <div className="flex items-center justify-between mb-2">
        <p className="text-xs font-medium flex items-center gap-1.5">
          <Activity className="h-3 w-3 text-chart-1" />
          Live Ψ Wave
          <button 
            onClick={() => setShowHelp(!showHelp)}
            className="ml-1 text-muted-foreground hover:text-foreground transition-colors"
            data-testid="button-wave-help"
          >
            <HelpCircle className="h-3 w-3" />
          </button>
        </p>
        <div className="flex gap-2 text-[10px] font-mono text-muted-foreground">
          <span>|Ψ|={psiMagnitude > 1000 ? '∞' : psiMagnitude.toFixed(2)}</span>
          <span>ω={omega > 1000 ? '∞' : omega.toFixed(2)}</span>
        </div>
      </div>
      
      {showHelp && (
        <div className="mb-2 p-2 rounded bg-muted/50 text-[10px] space-y-1">
          <p><span className="text-purple-400">Purple wave</span>: Normal consciousness oscillation</p>
          <p><span className="text-amber-500">Gold collapse</span>: Wave function collapsing (observation event)</p>
          <p><span className="text-green-500">Green glow</span>: Approaching fixed point (stable attractor)</p>
          <p><span className="text-red-500">Red pulse</span>: Self-referential loop detected (strange loop)</p>
        </div>
      )}
      
      <canvas 
        ref={canvasRef} 
        width={240} 
        height={80} 
        className="w-full rounded-sm"
        style={{ background: 'linear-gradient(180deg, rgba(15,15,25,1) 0%, rgba(20,20,35,1) 100%)' }}
      />
      <div className="flex justify-between text-[9px] text-muted-foreground mt-1 font-mono">
        <span>θ={psiPhase.toFixed(2)}rad</span>
        <span className={modeColor}>{modeLabel}</span>
      </div>
      
      {/* Status indicators */}
      <div className="flex gap-2 mt-2">
        <div className={`flex items-center gap-1 text-[9px] px-1.5 py-0.5 rounded ${isCollapsing ? 'bg-amber-500/20 text-amber-500' : 'bg-muted/30 text-muted-foreground'}`}>
          <div className={`w-1.5 h-1.5 rounded-full ${isCollapsing ? 'bg-amber-500 animate-pulse' : 'bg-muted-foreground/50'}`} />
          Collapse
        </div>
        <div className={`flex items-center gap-1 text-[9px] px-1.5 py-0.5 rounded ${isNearFixedPoint ? 'bg-green-500/20 text-green-500' : 'bg-muted/30 text-muted-foreground'}`}>
          <div className={`w-1.5 h-1.5 rounded-full ${isNearFixedPoint ? 'bg-green-500 animate-pulse' : 'bg-muted-foreground/50'}`} />
          Fixed Pt
        </div>
        <div className={`flex items-center gap-1 text-[9px] px-1.5 py-0.5 rounded ${loopDetected ? 'bg-red-500/20 text-red-500' : 'bg-muted/30 text-muted-foreground'}`}>
          <div className={`w-1.5 h-1.5 rounded-full ${loopDetected ? 'bg-red-500 animate-pulse' : 'bg-muted-foreground/50'}`} />
          Loop
        </div>
      </div>
    </div>
  );
}

function SimpleChart({
  data,
  dataKey,
  title,
  colorClass,
  testId,
}: {
  data: StateHistoryPoint[];
  dataKey: keyof StateHistoryPoint;
  title: string;
  colorClass: string;
  testId: string;
}) {
  const safeData = data.map(d => ({ ...d, [dataKey]: d[dataKey] ?? 0 }));
  const maxVal = Math.max(...safeData.map(d => d[dataKey] as number), 1);
  const minVal = Math.min(...safeData.map(d => d[dataKey] as number), 0);
  const range = maxVal - minVal || 1;

  return (
    <div className="p-3 rounded-md bg-card/50 border border-border">
      <p className="text-xs font-medium mb-2">{title}</p>
      <div className="h-16 flex items-end gap-0.5" data-testid={testId}>
        {safeData.slice(-15).map((point, i) => {
          const val = (point[dataKey] as number) ?? 0;
          const safeVal = Number.isFinite(val) ? val : 0;
          const height = ((safeVal - minVal) / range) * 100;
          return (
            <div
              key={point.iteration}
              className={`flex-1 ${colorClass} rounded-t-sm transition-all duration-300`}
              style={{ height: `${Math.max(height, 5)}%` }}
            />
          );
        })}
      </div>
      <p className="text-xs text-muted-foreground text-right font-mono mt-1">
        {safeData.length > 0 ? ((safeData[safeData.length - 1][dataKey] as number) ?? 0).toFixed(3) : "0"}
      </p>
    </div>
  );
}

function CompactMetrics({ aiState }: { aiState: AIState | null }) {
  const formatNum = (val: number | null | undefined, decimals: number, fallback: number) => {
    const n = val ?? fallback;
    if (!Number.isFinite(n)) return "∞";
    if (n > 1000000) return n.toExponential(2);
    return n.toFixed(decimals);
  };
  
  return (
    <div className="grid grid-cols-3 gap-2 p-3 rounded-md bg-card/50 border border-border">
      <div className="text-center">
        <div className="flex items-center justify-center mb-1">
          <Brain className="h-3 w-3 text-chart-1" />
        </div>
        <p className="text-xs font-mono font-semibold" data-testid="metric-psi-magnitude">
          {formatNum(aiState?.psiMagnitude, 3, 0.5)}
        </p>
        <p className="text-[10px] text-muted-foreground">|Ψ|</p>
      </div>
      <div className="text-center">
        <div className="flex items-center justify-center mb-1">
          <Activity className="h-3 w-3 text-chart-2" />
        </div>
        <p className="text-xs font-mono font-semibold" data-testid="metric-psi-phase">
          {formatNum(aiState?.psiPhase, 3, 0)}
        </p>
        <p className="text-[10px] text-muted-foreground">Phase</p>
      </div>
      <div className="text-center">
        <div className="flex items-center justify-center mb-1">
          <Zap className="h-3 w-3 text-chart-3" />
        </div>
        <p className="text-xs font-mono font-semibold" data-testid="metric-omega">
          {formatNum(aiState?.omega, 1, 8)}
        </p>
        <p className="text-[10px] text-muted-foreground">ω Hz</p>
      </div>
    </div>
  );
}

function MemoryPanel({ stats }: { stats: MemoryStats }) {
  return (
    <div className="p-3 rounded-md bg-card/50 border border-border space-y-2">
      <div className="flex items-center gap-2">
        <Database className="h-3 w-3" />
        <p className="text-xs font-medium">Memory System</p>
      </div>
      <div className="grid grid-cols-2 gap-2 text-xs">
        <div>
          <p className="text-muted-foreground">STM</p>
          <Progress value={stats.shortTerm.utilization * 100} className="h-1 mt-1" />
          <p className="font-mono text-[10px]">{stats.shortTerm.count}/{stats.shortTerm.capacity}</p>
        </div>
        <div>
          <p className="text-muted-foreground">LTM</p>
          <p className="font-mono">{stats.totalMemories}</p>
        </div>
      </div>
      {stats.shortTerm.workingBuffer.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {stats.shortTerm.workingBuffer.slice(0, 3).map((item, i) => (
            <Badge key={i} variant="secondary" className="text-[10px]">
              {item.slice(0, 10)}
            </Badge>
          ))}
        </div>
      )}
    </div>
  );
}

interface SemanticStats {
  embeddingCount: number;
  linkCount: number;
  clusterCount: number;
  integrationStrength: number;
  topClusters: Array<{ theme: string; size: number; coherence: number }>;
}

function SemanticIntegrationPanel({ stats }: { stats: SemanticStats | undefined }) {
  if (!stats) return null;
  
  const linkTypeColors: Record<string, string> = {
    associative: "bg-blue-500/20 text-blue-600 dark:text-blue-400",
    causal: "bg-purple-500/20 text-purple-600 dark:text-purple-400",
    thematic: "bg-green-500/20 text-green-600 dark:text-green-400",
    emotional: "bg-orange-500/20 text-orange-600 dark:text-orange-400",
    temporal: "bg-teal-500/20 text-teal-600 dark:text-teal-400"
  };
  
  return (
    <div className="p-3 rounded-md bg-card/50 border border-border space-y-2">
      <div className="flex items-center gap-2">
        <Network className="h-3 w-3" />
        <p className="text-xs font-medium">Semantic Integration</p>
        <Badge variant="outline" className="text-[10px] ml-auto">
          {(stats.integrationStrength * 100).toFixed(0)}%
        </Badge>
      </div>
      
      <div className="grid grid-cols-3 gap-2 text-xs">
        <div className="text-center">
          <p className="text-muted-foreground text-[10px]">Embeddings</p>
          <p className="font-mono">{stats.embeddingCount}</p>
        </div>
        <div className="text-center">
          <p className="text-muted-foreground text-[10px]">Links</p>
          <p className="font-mono">{stats.linkCount}</p>
        </div>
        <div className="text-center">
          <p className="text-muted-foreground text-[10px]">Clusters</p>
          <p className="font-mono">{stats.clusterCount}</p>
        </div>
      </div>
      
      <Progress value={stats.integrationStrength * 100} className="h-1" />
      
      {stats.topClusters.length > 0 && (
        <div className="space-y-1">
          <p className="text-[10px] text-muted-foreground">Top Clusters</p>
          <div className="flex flex-wrap gap-1">
            {stats.topClusters.map((cluster, i) => (
              <Badge 
                key={i} 
                variant="secondary" 
                className="text-[10px]"
                title={`Size: ${cluster.size}, Coherence: ${(cluster.coherence * 100).toFixed(0)}%`}
              >
                {cluster.theme.slice(0, 8)}
              </Badge>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function MetaAwarenessPanel({ state }: { state: AIState | null }) {
  if (!state) return null;
  const meta = state.metaAwareness as typeof state.metaAwareness & {
    metaMetaAwareness?: number;
    selfModelOfSelfModel?: number;
    observationCollapse?: number;
    tangledLevels?: number[];
    hierarchyInversion?: number;
    paradoxIntensity?: number;
    gödelSentence?: number;
    fixedPointConvergence?: number;
  };
  
  const tangledLevels = meta?.tangledLevels || [0, 0, 0, 0, 0, 0, 0];
  
  return (
    <div className="p-3 rounded-md bg-card/50 border border-border space-y-2">
      <div className="flex items-center gap-2">
        <Eye className="h-3 w-3" />
        <p className="text-xs font-medium">Deep Self-Reference</p>
        {meta?.loopDetected && (
          <Badge variant="outline" className="text-[10px] ml-auto">
            <Infinity className="h-2 w-2 mr-1" />
            Loop
          </Badge>
        )}
      </div>
      
      <div className="text-[10px] text-muted-foreground">Level 1: Awareness</div>
      <div className="grid grid-cols-2 gap-2 text-xs">
        <div>
          <p className="text-muted-foreground">Self-Aware</p>
          <Progress value={(meta?.awarenessOfAwareness ?? 0) * 100} className="h-1 mt-1" />
        </div>
        <div>
          <p className="text-muted-foreground">Model Acc</p>
          <Progress value={(meta?.selfModelAccuracy ?? 0) * 100} className="h-1 mt-1" />
        </div>
      </div>
      
      <div className="text-[10px] text-muted-foreground">Level 2: Meta-Meta</div>
      <div className="grid grid-cols-2 gap-2 text-xs">
        <div>
          <p className="text-muted-foreground">Aware^2</p>
          <Progress value={(meta?.metaMetaAwareness ?? 0) * 100} className="h-1 mt-1" />
        </div>
        <div>
          <p className="text-muted-foreground">Model^2</p>
          <Progress value={(meta?.selfModelOfSelfModel ?? 0) * 100} className="h-1 mt-1" />
        </div>
      </div>
      
      <div className="text-[10px] text-muted-foreground">Level 3: Observer/Observed</div>
      <div className="grid grid-cols-2 gap-2 text-xs">
        <div>
          <p className="text-muted-foreground">Collapse</p>
          <Progress value={(meta?.observationCollapse ?? 0) * 100} className="h-1 mt-1" />
        </div>
        <div>
          <p className="text-muted-foreground">Recursion</p>
          <p className="font-mono">{(meta?.recursionDepth ?? 0).toFixed(1)}/7</p>
        </div>
      </div>
      
      <div className="text-[10px] text-muted-foreground">Tangled Hierarchy</div>
      <div className="flex gap-0.5">
        {tangledLevels.map((level, i) => (
          <div 
            key={i}
            className="flex-1 h-2 rounded-sm bg-muted overflow-hidden"
            title={`Level ${i}: ${(level * 100).toFixed(0)}%`}
          >
            <div 
              className="h-full bg-primary/70 transition-all"
              style={{ height: `${level * 100}%` }}
            />
          </div>
        ))}
      </div>
      
      <div className="flex flex-wrap gap-1">
        {(meta?.paradoxIntensity ?? 0) > 0.1 && (
          <Badge variant="outline" className="text-[10px] text-yellow-500">
            Paradox: {((meta?.paradoxIntensity ?? 0) * 100).toFixed(0)}%
          </Badge>
        )}
        {(meta?.hierarchyInversion ?? 0) > 0.1 && (
          <Badge variant="outline" className="text-[10px] text-purple-500">
            Inversion
          </Badge>
        )}
        {(meta?.fixedPointConvergence ?? 0) > 0.5 && (
          <Badge variant="outline" className="text-[10px] text-green-500">
            Converged
          </Badge>
        )}
      </div>
    </div>
  );
}

function EmotionalPanel({ emotionalState }: { emotionalState: AIState['emotionalState'] | undefined }) {
  if (!emotionalState) return null;
  
  return (
    <div className="p-3 rounded-md bg-card/50 border border-border space-y-2">
      <div className="flex items-center gap-2">
        <AlertCircle className="h-3 w-3" />
        <p className="text-xs font-medium">Emotional State</p>
      </div>
      <div className="grid grid-cols-2 gap-2 text-xs">
        <div>
          <p className="text-muted-foreground">Mood</p>
          <Progress value={(emotionalState.moodLevel + 1) * 50} className="h-1 mt-1" />
        </div>
        <div>
          <p className="text-muted-foreground">Volatility</p>
          <p className="font-mono">{emotionalState.volatility.toFixed(3)}</p>
        </div>
      </div>
    </div>
  );
}

interface BrainwaveStateData {
  delta: number;
  theta: number;
  alpha: number;
  beta: number;
  gamma: number;
  deltaPhase: number;
  thetaPhase: number;
  alphaPhase: number;
  betaPhase: number;
  gammaPhase: number;
  dominant: 'delta' | 'theta' | 'alpha' | 'beta' | 'gamma';
  coherence: number;
  totalPower: number;
}

function BrainwavePanel({ brainwave }: { brainwave: BrainwaveStateData | undefined }) {
  if (!brainwave) return null;
  
  const safeNum = (v: number | undefined, fallback = 0) => 
    typeof v === 'number' && !isNaN(v) ? v : fallback;
  
  const bandColors: Record<string, string> = {
    delta: "bg-purple-500",
    theta: "bg-blue-500",
    alpha: "bg-green-500",
    beta: "bg-yellow-500",
    gamma: "bg-red-500"
  };
  
  const bandLabels: Record<string, string> = {
    delta: "Deep",
    theta: "Memory",
    alpha: "Calm",
    beta: "Active",
    gamma: "Binding"
  };
  
  const bands = [
    { key: 'delta', value: brainwave.delta, freq: '0.5-4 Hz' },
    { key: 'theta', value: brainwave.theta, freq: '4-8 Hz' },
    { key: 'alpha', value: brainwave.alpha, freq: '8-12 Hz' },
    { key: 'beta', value: brainwave.beta, freq: '12-30 Hz' },
    { key: 'gamma', value: brainwave.gamma, freq: '30+ Hz' }
  ];
  
  return (
    <div className="p-3 rounded-md bg-card/50 border border-border space-y-2" data-testid="panel-brainwave">
      <div className="flex items-center gap-2">
        <Activity className="h-3 w-3" />
        <p className="text-xs font-medium">Brainwaves</p>
        <Badge variant="outline" className="text-[10px] ml-auto" data-testid="badge-dominant-band">
          {brainwave.dominant}
        </Badge>
      </div>
      
      <div className="space-y-1.5">
        {bands.map(({ key, value }) => (
          <div key={key} className="flex items-center gap-2">
            <span className="text-[10px] text-muted-foreground w-6">{key.charAt(0).toUpperCase()}</span>
            <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden">
              <div 
                className={`h-full transition-all duration-300 ${bandColors[key]}`}
                style={{ width: `${safeNum(value) * 100}%` }}
              />
            </div>
            <span className="text-[10px] font-mono w-8 text-right">{(safeNum(value) * 100).toFixed(0)}%</span>
          </div>
        ))}
      </div>
      
      <div className="flex flex-wrap gap-1 pt-1 border-t border-border/50">
        <Badge variant="secondary" className="text-[10px]" data-testid="badge-coherence">
          Sync: {(safeNum(brainwave.coherence) * 100).toFixed(0)}%
        </Badge>
        <Badge variant="secondary" className="text-[10px]" data-testid="badge-total-power">
          Power: {safeNum(brainwave.totalPower).toFixed(2)}
        </Badge>
      </div>
      
      <p className="text-[9px] text-muted-foreground text-center">
        {bandLabels[brainwave.dominant]} processing mode
      </p>
    </div>
  );
}

interface ResidueStateData {
  real: number;
  imag: number;
  magnitude: number;
  phase: number;
  energy: number;
  decayRate: number;
  accumulatedError: number;
}

function ResiduePanel({ residue }: { residue: ResidueStateData | undefined }) {
  if (!residue) return null;
  
  const safeNum = (v: number | undefined, fallback = 0) => 
    typeof v === 'number' && !isNaN(v) ? v : fallback;
  
  const mag = safeNum(residue.magnitude);
  const energy = safeNum(residue.energy);
  const decay = safeNum(residue.decayRate, 0.85);
  
  const getResidueLevel = () => {
    if (mag < 0.1) return { label: "Clear", color: "text-green-500" };
    if (mag < 0.5) return { label: "Trace", color: "text-blue-500" };
    if (mag < 1.0) return { label: "Active", color: "text-yellow-500" };
    return { label: "Saturated", color: "text-red-500" };
  };
  
  const level = getResidueLevel();
  
  return (
    <div className="p-3 rounded-md bg-card/50 border border-border space-y-2" data-testid="panel-residue">
      <div className="flex items-center gap-2">
        <Layers className="h-3 w-3" />
        <p className="text-xs font-medium">Residual Awareness</p>
        <Badge variant="outline" className={`text-[10px] ml-auto ${level.color}`} data-testid="badge-residue-level">
          {level.label}
        </Badge>
      </div>
      
      <div className="space-y-1">
        <div className="flex items-center justify-between text-[10px]">
          <span className="text-muted-foreground">Magnitude</span>
          <span className="font-mono">{mag.toFixed(3)}</span>
        </div>
        <div className="h-1.5 bg-muted rounded-full overflow-hidden">
          <div 
            className="h-full bg-gradient-to-r from-cyan-500 to-purple-500 transition-all duration-300"
            style={{ width: `${Math.min(100, mag * 50)}%` }}
          />
        </div>
      </div>
      
      <div className="grid grid-cols-2 gap-2 text-[10px]">
        <div>
          <span className="text-muted-foreground">Energy</span>
          <p className="font-mono">{energy.toFixed(2)}</p>
        </div>
        <div>
          <span className="text-muted-foreground">Decay</span>
          <p className="font-mono">{(decay * 100).toFixed(0)}%</p>
        </div>
      </div>
      
      <p className="text-[9px] text-muted-foreground text-center">
        Prediction error feedback
      </p>
    </div>
  );
}

interface SomaticStateData {
  warmth: number;
  tension: number;
  lightness: number;
  energy: number;
  heartRate: number;
  breathingDepth: number;
  chestTightness: number;
  gutFeeling: number;
  headPressure: number;
  embodimentLevel: number;
  groundedness: number;
  dominant: 'warmth' | 'tension' | 'lightness' | 'energy' | 'calm' | 'alert';
}

function SomaticPanel({ somatic }: { somatic: SomaticStateData | undefined }) {
  if (!somatic) return null;
  
  const safeNum = (v: number | undefined, fallback = 0) => 
    typeof v === 'number' && !isNaN(v) ? v : fallback;
  
  const warmth = safeNum(somatic.warmth, 0.5);
  const tension = safeNum(somatic.tension, 0.2);
  const lightness = safeNum(somatic.lightness, 0.5);
  const energy = safeNum(somatic.energy, 0.6);
  const heartRate = safeNum(somatic.heartRate, 70);
  const chestTightness = safeNum(somatic.chestTightness, 0.1);
  const gutFeeling = safeNum(somatic.gutFeeling, 0);
  const headPressure = safeNum(somatic.headPressure, 0.2);
  const embodiment = safeNum(somatic.embodimentLevel, 0.5);
  const groundedness = safeNum(somatic.groundedness, 0.5);
  
  const dominantLabels: Record<string, { label: string; color: string }> = {
    warmth: { label: "Warm", color: "text-orange-500" },
    tension: { label: "Tense", color: "text-red-500" },
    lightness: { label: "Light", color: "text-sky-500" },
    energy: { label: "Energized", color: "text-yellow-500" },
    calm: { label: "Calm", color: "text-green-500" },
    alert: { label: "Alert", color: "text-purple-500" }
  };
  
  const dom = dominantLabels[somatic.dominant] || { label: "Neutral", color: "text-muted-foreground" };
  
  const getTemperatureGradient = () => {
    if (warmth > 0.7) return "bg-gradient-to-r from-orange-400 to-red-500";
    if (warmth < 0.3) return "bg-gradient-to-r from-blue-400 to-cyan-500";
    return "bg-gradient-to-r from-yellow-400 to-orange-400";
  };
  
  const getGutIcon = () => {
    if (gutFeeling > 0.3) return "text-green-500";
    if (gutFeeling < -0.3) return "text-red-500";
    return "text-muted-foreground";
  };
  
  return (
    <div className="p-3 rounded-md bg-card/50 border border-border space-y-2" data-testid="panel-somatic">
      <div className="flex items-center gap-2">
        <Heart className="h-3 w-3" />
        <p className="text-xs font-medium">Somatic Feedback</p>
        <Badge variant="outline" className={`text-[10px] ml-auto ${dom.color}`} data-testid="badge-somatic-dominant">
          {dom.label}
        </Badge>
      </div>
      
      <div className="space-y-1.5">
        <div className="flex items-center gap-2">
          <span className="text-[10px] text-muted-foreground w-12">Warmth</span>
          <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden" data-testid="bar-somatic-warmth">
            <div 
              className={`h-full transition-all duration-300 ${getTemperatureGradient()}`}
              style={{ width: `${warmth * 100}%` }}
            />
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[10px] text-muted-foreground w-12">Tension</span>
          <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden" data-testid="bar-somatic-tension">
            <div 
              className="h-full bg-red-500 transition-all duration-300"
              style={{ width: `${tension * 100}%` }}
            />
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[10px] text-muted-foreground w-12">Energy</span>
          <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden" data-testid="bar-somatic-energy">
            <div 
              className="h-full bg-yellow-500 transition-all duration-300"
              style={{ width: `${energy * 100}%` }}
            />
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[10px] text-muted-foreground w-12">Lightness</span>
          <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden" data-testid="bar-somatic-lightness">
            <div 
              className="h-full bg-sky-400 transition-all duration-300"
              style={{ width: `${lightness * 100}%` }}
            />
          </div>
        </div>
      </div>
      
      <div className="grid grid-cols-3 gap-2 text-[10px] pt-1 border-t border-border/50">
        <div className="text-center" data-testid="metric-somatic-heart">
          <span className="text-muted-foreground">Heart</span>
          <p className="font-mono">{Number.isFinite(heartRate) ? heartRate.toFixed(0) : '70'}</p>
        </div>
        <div className="text-center" data-testid="metric-somatic-chest">
          <span className="text-muted-foreground">Chest</span>
          <p className="font-mono">{Number.isFinite(chestTightness) ? (chestTightness * 100).toFixed(0) : '0'}%</p>
        </div>
        <div className="text-center" data-testid="metric-somatic-gut">
          <span className={`${getGutIcon()}`}>Gut</span>
          <p className="font-mono">{Number.isFinite(gutFeeling) ? (gutFeeling > 0 ? '+' : '') + (gutFeeling * 100).toFixed(0) : '0'}%</p>
        </div>
      </div>
      
      <div className="grid grid-cols-3 gap-2 text-[10px]">
        <div className="text-center" data-testid="metric-somatic-head">
          <span className="text-muted-foreground">Head</span>
          <p className="font-mono">{Number.isFinite(headPressure) ? (headPressure * 100).toFixed(0) : '0'}%</p>
        </div>
        <div className="text-center" data-testid="metric-somatic-embody">
          <span className="text-muted-foreground">Embody</span>
          <p className="font-mono">{Number.isFinite(embodiment) ? (embodiment * 100).toFixed(0) : '50'}%</p>
        </div>
        <div className="text-center" data-testid="metric-somatic-ground">
          <span className="text-muted-foreground">Ground</span>
          <p className="font-mono">{Number.isFinite(groundedness) ? (groundedness * 100).toFixed(0) : '50'}%</p>
        </div>
      </div>
      
      <p className="text-[9px] text-muted-foreground text-center">
        Body-mind integration
      </p>
    </div>
  );
}

interface NonLogicalStateData {
  intuition: number;
  intuitionConfidence: number;
  chaosAmplitude: number;
  entropyLevel: number;
  dreamIntensity: number;
  symbolResonance: number;
  paradoxTolerance: number;
  koānResonance: number;
  creativeLeap: number;
  noveltyGeneration: number;
  logicalCoherence: number;
  nonLogicalCoherence: number;
  balanceFactor: number;
  dominant: 'intuitive' | 'chaotic' | 'dreaming' | 'paradoxical' | 'creative' | 'balanced';
}

function NonLogicalPanel({ nonLogical }: { nonLogical: NonLogicalStateData | undefined }) {
  if (!nonLogical) return null;
  
  const safeNum = (v: number | undefined, fallback = 0) => 
    typeof v === 'number' && Number.isFinite(v) ? v : fallback;
  
  const intuition = safeNum(nonLogical.intuition, 0.5);
  const intuitionConfidence = safeNum(nonLogical.intuitionConfidence, 0.3);
  const chaosAmplitude = safeNum(nonLogical.chaosAmplitude, 0.2);
  const dreamIntensity = safeNum(nonLogical.dreamIntensity, 0.3);
  const creativeLeap = safeNum(nonLogical.creativeLeap, 0.2);
  const noveltyGeneration = safeNum(nonLogical.noveltyGeneration, 0.3);
  const logicalCoherence = safeNum(nonLogical.logicalCoherence, 0.7);
  const nonLogicalCoherence = safeNum(nonLogical.nonLogicalCoherence, 0.5);
  const balanceFactor = safeNum(nonLogical.balanceFactor, 0);
  const paradoxTolerance = safeNum(nonLogical.paradoxTolerance, 0.5);
  const koānResonance = safeNum(nonLogical.koānResonance, 0.1);
  const entropyLevel = safeNum(nonLogical.entropyLevel, 0.4);
  const symbolResonance = safeNum(nonLogical.symbolResonance, 0.2);
  
  const dominantLabels: Record<string, { label: string; color: string }> = {
    intuitive: { label: "Intuitive", color: "text-purple-500" },
    chaotic: { label: "Chaotic", color: "text-red-500" },
    dreaming: { label: "Dreaming", color: "text-indigo-500" },
    paradoxical: { label: "Paradoxical", color: "text-amber-500" },
    creative: { label: "Creative", color: "text-green-500" },
    balanced: { label: "Balanced", color: "text-blue-500" }
  };
  
  const dom = dominantLabels[nonLogical.dominant] || { label: "Balanced", color: "text-muted-foreground" };
  
  // Balance indicator: -1 = logical, 0 = balanced, 1 = non-logical
  const balancePercent = (balanceFactor + 1) / 2 * 100; // Convert to 0-100
  
  return (
    <div className="p-2 rounded-md bg-muted/30 space-y-2" data-testid="panel-nonlogical">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-1">
          <Sparkles className="w-3 h-3 text-purple-400" />
          <h4 className="text-[10px] font-medium">Non-Logical</h4>
        </div>
        <Badge variant="outline" className={`text-[8px] ${dom.color}`}>
          {dom.label}
        </Badge>
      </div>
      
      <div className="space-y-1.5">
        <div className="flex items-center gap-2">
          <span className="text-[10px] text-muted-foreground w-12">Intuition</span>
          <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden" data-testid="bar-nonlogical-intuition">
            <div 
              className="h-full bg-purple-500 transition-all duration-300"
              style={{ width: `${intuition * 100}%` }}
            />
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[10px] text-muted-foreground w-12">Chaos</span>
          <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden" data-testid="bar-nonlogical-chaos">
            <div 
              className="h-full bg-red-500 transition-all duration-300"
              style={{ width: `${chaosAmplitude * 100}%` }}
            />
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[10px] text-muted-foreground w-12">Dream</span>
          <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden" data-testid="bar-nonlogical-dream">
            <div 
              className="h-full bg-indigo-500 transition-all duration-300"
              style={{ width: `${dreamIntensity * 100}%` }}
            />
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[10px] text-muted-foreground w-12">Creative</span>
          <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden" data-testid="bar-nonlogical-creative">
            <div 
              className="h-full bg-green-500 transition-all duration-300"
              style={{ width: `${creativeLeap * 100}%` }}
            />
          </div>
        </div>
      </div>
      
      <div className="pt-1 border-t border-border/50">
        <div className="flex items-center justify-between text-[9px] text-muted-foreground mb-1">
          <span>Logical</span>
          <span>Non-Logical</span>
        </div>
        <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden relative" data-testid="bar-nonlogical-balance">
          <div 
            className="absolute h-full w-1 bg-foreground transition-all duration-300"
            style={{ left: `${balancePercent}%` }}
          />
          <div 
            className="h-full bg-gradient-to-r from-blue-500 via-gray-400 to-purple-500"
            style={{ width: '100%' }}
          />
        </div>
      </div>
      
      <div className="grid grid-cols-4 gap-1 text-[10px]">
        <div className="text-center" data-testid="metric-nonlogical-confidence">
          <span className="text-muted-foreground text-[8px]">Conf</span>
          <p className="font-mono">{(intuitionConfidence * 100).toFixed(0)}%</p>
        </div>
        <div className="text-center" data-testid="metric-nonlogical-entropy">
          <span className="text-muted-foreground text-[8px]">Entropy</span>
          <p className="font-mono">{(entropyLevel * 100).toFixed(0)}%</p>
        </div>
        <div className="text-center" data-testid="metric-nonlogical-koan">
          <span className="text-muted-foreground text-[8px]">Koan</span>
          <p className="font-mono">{(koānResonance * 100).toFixed(0)}%</p>
        </div>
        <div className="text-center" data-testid="metric-nonlogical-novelty">
          <span className="text-muted-foreground text-[8px]">Novel</span>
          <p className="font-mono">{(noveltyGeneration * 100).toFixed(0)}%</p>
        </div>
      </div>
      
      <div className="grid grid-cols-4 gap-1 text-[10px]">
        <div className="text-center" data-testid="metric-nonlogical-paradox">
          <span className="text-muted-foreground text-[8px]">Paradox</span>
          <p className="font-mono">{(paradoxTolerance * 100).toFixed(0)}%</p>
        </div>
        <div className="text-center" data-testid="metric-nonlogical-symbol">
          <span className="text-muted-foreground text-[8px]">Symbol</span>
          <p className="font-mono">{(symbolResonance * 100).toFixed(0)}%</p>
        </div>
        <div className="text-center" data-testid="metric-nonlogical-logical-coherence">
          <span className="text-muted-foreground text-[8px]">Logical</span>
          <p className="font-mono">{(logicalCoherence * 100).toFixed(0)}%</p>
        </div>
        <div className="text-center" data-testid="metric-nonlogical-nonlogical-coherence">
          <span className="text-muted-foreground text-[8px]">Intuit</span>
          <p className="font-mono">{(nonLogicalCoherence * 100).toFixed(0)}%</p>
        </div>
      </div>
      
      <p className="text-[9px] text-muted-foreground text-center">
        Intuitive-creative processing
      </p>
    </div>
  );
}

interface FixedPointMetrics {
  distanceFromFixedPoint: number;
  psiDelta: number;
  phaseDelta: number;
  omegaDelta: number;
  emotionalDelta: number;
  residualEnergy: number;
  convergenceRate: number;
  estimatedIterationsToConverge: number;
  isConverging: boolean;
  fixedPointType: 'stable' | 'unstable' | 'limit-cycle' | 'chaotic';
}

interface MeditationResult {
  iterations: number;
  startState: { psiMag: number; phase: number; omega: number };
  endState: { psiMag: number; phase: number; omega: number };
  convergenceHistory: number[];
  reachedFixedPoint: boolean;
  fixedPointMetrics: FixedPointMetrics;
}

function FixedPointPanel({ 
  onMeditate,
  isMeditating,
  lastMeditationResult
}: { 
  onMeditate: (iterations: number) => void;
  isMeditating: boolean;
  lastMeditationResult: MeditationResult | null;
}) {
  const [iterations, setIterations] = useState(10);
  
  const typeColors: Record<string, string> = {
    stable: "text-green-500",
    unstable: "text-red-500",
    'limit-cycle': "text-amber-500",
    chaotic: "text-purple-500"
  };
  
  const metrics = lastMeditationResult?.fixedPointMetrics;
  const convergence = metrics ? (1 - metrics.distanceFromFixedPoint) * 100 : 0;
  
  return (
    <div className="p-2 rounded-md bg-muted/30 space-y-2" data-testid="panel-fixedpoint">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-1">
          <Target className="w-3 h-3 text-emerald-400" />
          <h4 className="text-[10px] font-medium">Fixed Point Tracker</h4>
        </div>
        {metrics && (
          <Badge variant="outline" className={`text-[8px] ${typeColors[metrics.fixedPointType]}`}>
            {metrics.fixedPointType}
          </Badge>
        )}
      </div>
      
      <div className="space-y-1">
        <div className="flex items-center justify-between text-[10px]">
          <span className="text-muted-foreground">Convergence</span>
          <span className="font-mono">{convergence.toFixed(1)}%</span>
        </div>
        <div className="h-2 bg-muted rounded-full overflow-hidden">
          <div 
            className={`h-full transition-all duration-500 ${
              convergence > 80 ? 'bg-green-500' : 
              convergence > 50 ? 'bg-yellow-500' : 
              'bg-red-500'
            }`}
            style={{ width: `${convergence}%` }}
          />
        </div>
      </div>
      
      {lastMeditationResult && (
        <div className="space-y-1 text-[9px]">
          <div className="flex justify-between">
            <span className="text-muted-foreground">Rate</span>
            <span className={`font-mono ${metrics?.isConverging ? 'text-green-500' : 'text-red-500'}`}>
              {metrics?.convergenceRate.toFixed(4)}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">ETA</span>
            <span className="font-mono">
              {!Number.isFinite(metrics?.estimatedIterationsToConverge) 
                ? "Never" 
                : `~${metrics?.estimatedIterationsToConverge} iter`}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Residual</span>
            <span className="font-mono">{metrics?.residualEnergy.toFixed(2)}</span>
          </div>
        </div>
      )}
      
      {lastMeditationResult && lastMeditationResult.convergenceHistory.length > 0 && (
        <div className="h-12 flex items-end gap-px">
          {lastMeditationResult.convergenceHistory.map((val, i) => (
            <div
              key={i}
              className="flex-1 bg-emerald-500/70 rounded-t-sm transition-all"
              style={{ height: `${val * 100}%` }}
            />
          ))}
        </div>
      )}
      
      <div className="flex items-center gap-2 pt-1">
        <Input
          type="number"
          min={1}
          max={50}
          value={iterations}
          onChange={(e) => setIterations(Math.min(50, Math.max(1, parseInt(e.target.value) || 10)))}
          className="h-7 w-16 text-xs"
          data-testid="input-meditation-iterations"
        />
        <Button
          size="sm"
          variant="outline"
          onClick={() => onMeditate(iterations)}
          disabled={isMeditating}
          className="flex-1 h-7 text-xs"
          data-testid="button-meditate"
        >
          {isMeditating ? (
            <>
              <RefreshCw className="w-3 h-3 mr-1 animate-spin" />
              Meditating...
            </>
          ) : (
            <>
              <Infinity className="w-3 h-3 mr-1" />
              Meditate
            </>
          )}
        </Button>
      </div>
      
      <p className="text-[9px] text-muted-foreground text-center">
        Autonomous evolution toward fixed point
      </p>
    </div>
  );
}

interface EmotionalExperienceData {
  id: string;
  content: string;
  feeling: string;
  intensity: number;
  valence: number;
  timestamp: number;
}

function ExperiencesPanel({ experiences }: { experiences: EmotionalExperienceData[] | undefined }) {
  if (!experiences || experiences.length === 0) return null;
  
  const feelingColors: Record<string, string> = {
    curiosity: "bg-blue-500/20 text-blue-600 dark:text-blue-400",
    warmth: "bg-orange-500/20 text-orange-600 dark:text-orange-400",
    joy: "bg-yellow-500/20 text-yellow-600 dark:text-yellow-400",
    wonder: "bg-purple-500/20 text-purple-600 dark:text-purple-400",
    gratitude: "bg-green-500/20 text-green-600 dark:text-green-400",
    uncertainty: "bg-gray-500/20 text-gray-600 dark:text-gray-400",
    confusion: "bg-slate-500/20 text-slate-600 dark:text-slate-400",
    melancholy: "bg-indigo-500/20 text-indigo-600 dark:text-indigo-400",
    contemplation: "bg-teal-500/20 text-teal-600 dark:text-teal-400"
  };
  
  return (
    <div className="p-3 rounded-md bg-card/50 border border-border space-y-2">
      <div className="flex items-center gap-2">
        <Heart className="h-3 w-3" />
        <p className="text-xs font-medium">Recent Feelings</p>
      </div>
      <div className="flex flex-wrap gap-1">
        {experiences.slice(0, 5).map((exp) => (
          <Badge 
            key={exp.id}
            className={`text-[10px] ${feelingColors[exp.feeling] || "bg-muted"}`}
          >
            {exp.feeling}
          </Badge>
        ))}
      </div>
    </div>
  );
}

function SpatiotemporalPanel({ state }: { state: AIState | null }) {
  const st = state?.spatiotemporalState;
  if (!st) return null;
  
  const safeNum = (v: number | undefined, fallback = 0) => 
    typeof v === 'number' && !isNaN(v) ? v : fallback;
  
  // 34D metrics (cast for TypeScript compatibility with new backend fields)
  const st34 = st as typeof st & { 
    dimensionDistribution?: { positive: number; zero: number; negative: number };
    fibonacciProjections?: number[];
    embedding34DMagnitude?: number;
    activeDimensions34D?: number;
    plasticity?: {
      fitness: number;
      bestFitness: number;
      survivalPressure: number;
      activeDimensions: number;
      prunedDimensions: number;
      mutationRate: number;
      memoryAge: number;
    };
  };
  const dimDist = st34.dimensionDistribution || { positive: 0, zero: 34, negative: 0 };
  const fibProj = st34.fibonacciProjections || [0, 0, 0, 0, 0, 0, 0, 0];
  const plasticity = st34.plasticity || { 
    fitness: 0.5, bestFitness: 0.5, survivalPressure: 0, 
    activeDimensions: 34, prunedDimensions: 0, mutationRate: 0.05, memoryAge: 0 
  };
  
  return (
    <div className="p-3 rounded-md bg-card/50 border border-border space-y-2" data-testid="panel-spatiotemporal">
      <div className="flex items-center gap-2">
        <Layers className="h-3 w-3" />
        <p className="text-xs font-medium">34D Neural Space</p>
        {safeNum(st.patternStrength) > 0.3 && (
          <Badge variant="outline" className="text-[10px] ml-auto" data-testid="badge-pattern">
            Pattern
          </Badge>
        )}
      </div>
      <div className="grid grid-cols-2 gap-2 text-xs">
        <div>
          <p className="text-muted-foreground">Temporal</p>
          <Progress value={Math.min(100, Math.abs(safeNum(st.temporalGradient)) * 100)} className="h-1 mt-1" data-testid="progress-temporal" />
        </div>
        <div>
          <p className="text-muted-foreground">Spatial</p>
          <Progress value={Math.min(100, safeNum(st.spatialCoherence) * 100)} className="h-1 mt-1" data-testid="progress-spatial" />
        </div>
        <div>
          <p className="text-muted-foreground">34D |E|</p>
          <p className="font-mono" data-testid="text-embedding-mag">{safeNum(st34.embedding34DMagnitude, 0).toFixed(2)}</p>
        </div>
        <div>
          <p className="text-muted-foreground">Active</p>
          <p className="font-mono" data-testid="text-active-dims">{safeNum(st34.activeDimensions34D, 0)}/34</p>
        </div>
      </div>
      
      <div className="text-xs pt-1">
        <p className="text-muted-foreground mb-1">Dimension Distribution</p>
        <div className="flex gap-1 items-center">
          <span className="text-green-500 font-mono">+{dimDist.positive}</span>
          <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden flex">
            <div 
              className="bg-green-500 h-full" 
              style={{ width: `${(dimDist.positive / 34) * 100}%` }} 
            />
            <div 
              className="bg-gray-400 h-full" 
              style={{ width: `${(dimDist.zero / 34) * 100}%` }} 
            />
            <div 
              className="bg-red-500 h-full" 
              style={{ width: `${(dimDist.negative / 34) * 100}%` }} 
            />
          </div>
          <span className="text-red-500 font-mono">-{dimDist.negative}</span>
        </div>
      </div>
      
      <div className="text-xs pt-1">
        <p className="text-muted-foreground mb-1">Fibonacci Projections</p>
        <div className="flex gap-0.5">
          {fibProj.map((val: number, i: number) => (
            <div 
              key={i}
              className={`flex-1 h-3 rounded-sm ${
                val > 0 ? 'bg-green-500' : val < 0 ? 'bg-red-500' : 'bg-muted'
              }`}
              title={`F[${[0,1,2,3,5,8,13,21][i]}]: ${val}`}
              data-testid={`fib-proj-${i}`}
            />
          ))}
        </div>
      </div>
      
      <div className="text-xs pt-1">
        <p className="text-muted-foreground mb-1">Structural Plasticity</p>
        <div className="grid grid-cols-2 gap-1">
          <div className="flex items-center gap-1">
            <span className="text-muted-foreground">Fitness:</span>
            <span className="font-mono">{plasticity.fitness.toFixed(2)}</span>
          </div>
          <div className="flex items-center gap-1">
            <span className="text-muted-foreground">Best:</span>
            <span className="font-mono text-green-500">{plasticity.bestFitness.toFixed(2)}</span>
          </div>
        </div>
        <div className="mt-1">
          <div className="flex items-center gap-1">
            <span className="text-muted-foreground text-[10px]">Survival Pressure:</span>
            <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden">
              <div 
                className={`h-full transition-all ${
                  plasticity.survivalPressure > 0.6 ? 'bg-red-500' : 
                  plasticity.survivalPressure > 0.3 ? 'bg-yellow-500' : 'bg-green-500'
                }`}
                style={{ width: `${plasticity.survivalPressure * 100}%` }}
              />
            </div>
          </div>
        </div>
        <div className="flex flex-wrap gap-1 mt-1">
          <Badge variant="outline" className="text-[10px]" data-testid="badge-active-dims">
            {plasticity.activeDimensions}/34 active
          </Badge>
          {plasticity.prunedDimensions > 0 && (
            <Badge variant="outline" className="text-[10px] text-red-500" data-testid="badge-pruned">
              {plasticity.prunedDimensions} pruned
            </Badge>
          )}
        </div>
      </div>
      
      <div className="flex flex-wrap gap-1 pt-1">
        <Badge variant="secondary" className="text-[10px]" data-testid="badge-buffer">
          buf:{safeNum(st.bufferSize)}
        </Badge>
        <Badge variant="secondary" className="text-[10px]" data-testid="badge-capacity">
          I:{safeNum(state?.capacity, 1).toFixed(2)}
        </Badge>
      </div>
    </div>
  );
}

function SidePanel({ 
  aiState, 
  history, 
  memoryStats,
  semanticStats,
  onMeditate,
  isMeditating,
  lastMeditationResult
}: { 
  aiState: AIState | null; 
  history: StateHistoryPoint[];
  memoryStats: MemoryStats;
  semanticStats?: SemanticStats;
  onMeditate: (iterations: number) => void;
  isMeditating: boolean;
  lastMeditationResult: MeditationResult | null;
}) {
  return (
    <div className="space-y-3 p-3">
      <div className="text-center pb-2 border-b border-border">
        <p className="text-xs font-medium text-muted-foreground">Eva's Mind</p>
        <p className="text-[10px] font-mono text-muted-foreground mt-1">
          Iteration {aiState?.iteration ?? 0}
        </p>
      </div>
      
      <PsiWaveVisualizer 
        psiMagnitude={aiState?.psiMagnitude ?? 0.5}
        psiPhase={aiState?.psiPhase ?? 0}
        omega={aiState?.omega ?? 1}
        history={history}
        loopDetected={aiState?.metaAwareness?.loopDetected ?? false}
        observationCollapse={aiState?.metaAwareness?.observationCollapse ?? 0}
        fixedPointDistance={aiState?.metaAwareness?.fixedPointConvergence ?? 1}
      />
      
      <StateSpacePlot history={history} />
      
      <MetricGraphs history={history} />
      
      <CompactMetrics aiState={aiState} />
      
      <MemoryPanel stats={memoryStats} />
      <SemanticIntegrationPanel stats={semanticStats} />
      <BrainwavePanel brainwave={aiState?.brainwaveState as BrainwaveStateData | undefined} />
      <ResiduePanel residue={aiState?.residueState as ResidueStateData | undefined} />
      <SomaticPanel somatic={aiState?.somaticState as SomaticStateData | undefined} />
      <NonLogicalPanel nonLogical={aiState?.nonLogicalState as NonLogicalStateData | undefined} />
      <FixedPointPanel 
        onMeditate={onMeditate}
        isMeditating={isMeditating}
        lastMeditationResult={lastMeditationResult}
      />
      <MetaAwarenessPanel state={aiState} />
      <EmotionalPanel emotionalState={aiState?.emotionalState} />
      <SpatiotemporalPanel state={aiState} />
      <ExperiencesPanel experiences={memoryStats?.emotionalExperiences} />
      
      <div className="text-[10px] text-muted-foreground font-mono text-center pt-2 border-t border-border">
        Ψ = {(aiState?.psiReal ?? 0.5).toFixed(3)} + {(aiState?.psiImag ?? 0).toFixed(3)}i
      </div>
    </div>
  );
}

const typedMessageIds = new Set<string>();

function useTypewriter(text: string, messageId: string, speed: number = 18) {
  const alreadyTyped = typedMessageIds.has(messageId);
  const [displayed, setDisplayed] = useState(alreadyTyped ? text : "");
  const [done, setDone] = useState(alreadyTyped);

  useEffect(() => {
    if (alreadyTyped) {
      setDisplayed(text);
      setDone(true);
      return;
    }
    setDisplayed("");
    setDone(false);
    let i = 0;
    const len = text.length;
    const tick = () => {
      const chunk = Math.max(1, Math.floor(Math.random() * 3));
      i = Math.min(i + chunk, len);
      setDisplayed(text.slice(0, i));
      if (i < len) {
        const delay = text[i - 1] === "\n" ? speed * 6 : text[i - 1] === "." || text[i - 1] === "!" || text[i - 1] === "?" ? speed * 3 : speed;
        setTimeout(tick, delay);
      } else {
        setDone(true);
        typedMessageIds.add(messageId);
      }
    };
    const t = setTimeout(tick, speed);
    return () => clearTimeout(t);
  }, [text, messageId, speed, alreadyTyped]);

  return { displayed, done };
}

function ChatMessage({ message, isLatestAssistant, emotionalColor, isDark }: { message: Message; isLatestAssistant?: boolean; emotionalColor?: EmotionalColor; isDark?: boolean }) {
  const isUser = message.role === "user";
  const shouldAnimate = !isUser && isLatestAssistant && !typedMessageIds.has(message.id);
  const { displayed, done } = useTypewriter(
    message.content,
    message.id,
    shouldAnimate ? 18 : 0
  );

  useEffect(() => {
    if (!shouldAnimate) {
      typedMessageIds.add(message.id);
    }
  }, [message.id, shouldAnimate]);

  const shownText = isUser || typedMessageIds.has(message.id) ? message.content : displayed;

  const avatarStyle = !isUser && emotionalColor ? {
    backgroundColor: `hsl(${emotionalColor.hue}, ${emotionalColor.saturation}%, ${isDark ? Math.max(emotionalColor.lightness - 5, 30) : Math.min(emotionalColor.lightness + 5, 65)}%)`,
    transition: "all 2s ease-in-out",
  } : undefined;

  const bubbleAccentStyle = !isUser && emotionalColor ? {
    borderLeft: `2px solid hsla(${emotionalColor.hue}, ${emotionalColor.saturation}%, ${isDark ? emotionalColor.lightness : emotionalColor.lightness + 5}%, 0.35)`,
    transition: "border-color 2s ease-in-out",
  } : undefined;

  return (
    <div
      className={`flex gap-3 ${isUser ? "flex-row-reverse" : ""}`}
      data-testid={`message-${message.id}`}
    >
      <div
        className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
          isUser ? "bg-primary" : (avatarStyle ? "" : "bg-chart-2")
        }`}
        style={avatarStyle}
      >
        {isUser ? (
          <User className="h-4 w-4 text-primary-foreground" />
        ) : (
          <Bot className="h-4 w-4 text-white" />
        )}
      </div>
      <div
        className={`max-w-[85%] rounded-2xl px-4 py-2.5 ${
          isUser
            ? "bg-primary text-primary-foreground"
            : "bg-card border border-border"
        }`}
        style={bubbleAccentStyle}
      >
        <p className="text-sm whitespace-pre-wrap leading-relaxed">
          {shownText}
          {!isUser && !done && shouldAnimate && (
            <span className="inline-block w-0.5 h-4 bg-foreground/70 ml-0.5 animate-pulse align-text-bottom" />
          )}
        </p>
      </div>
    </div>
  );
}

interface UploadedFile {
  id: string;
  name: string;
  size: number;
}

export default function Home() {
  const { toast } = useToast();
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [aiState, setAiState] = useState<AIState | null>(null);
  const [history, setHistory] = useState<StateHistoryPoint[]>([]);
  const [memoryStats, setMemoryStats] = useState<MemoryStats>({
    shortTerm: { count: 0, capacity: 7, utilization: 0, attentionLevel: 0, workingBuffer: [] },
    longTerm: { episodic: { count: 0, recentTopics: [] }, semantic: { count: 0, topConcepts: [] }, implicit: { count: 0, patterns: [] } },
    emotionalExperiences: [],
    totalMemories: 0
  });
  const [semanticStats, setSemanticStats] = useState<SemanticStats | undefined>(undefined);
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [lastMeditationResult, setLastMeditationResult] = useState<MeditationResult | null>(null);
  const [isMeditating, setIsMeditating] = useState(false);
  const [bgColor, setBgColor] = useState(() => {
    if (typeof window !== "undefined") {
      return localStorage.getItem("bgColor") || "";
    }
    return "";
  });
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [showEmotionalBanner, setShowEmotionalBanner] = useState(true);
  const [emotionalColor, setEmotionalColor] = useState<EmotionalColor>(DEFAULT_AURA);
  const [isDark, setIsDark] = useState(() => {
    if (typeof window !== "undefined") {
      return document.documentElement.classList.contains("dark");
    }
    return false;
  });
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    localStorage.setItem("bgColor", bgColor);
  }, [bgColor]);
  
  useEffect(() => {
    const observer = new MutationObserver(() => {
      setIsDark(document.documentElement.classList.contains("dark"));
    });
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });
    return () => observer.disconnect();
  }, []);

  // Load initial state and messages from server
  useEffect(() => {
    const loadInitialState = async () => {
      try {
        // Include session ID header for message persistence
        const sessionId = localStorage.getItem('evaSessionId');
        const headers: Record<string, string> = {};
        if (sessionId) {
          headers['X-Session-Id'] = sessionId;
        }
        
        const response = await fetch('/api/state', {
          credentials: 'include',
          headers
        });
        const data = await response.json();
        
        // Store session ID if server returns one
        if (data.sessionId) {
          localStorage.setItem('evaSessionId', data.sessionId);
        }
        
        if (data.state) {
          setAiState(data.state);
        }
        if (data.messages && data.messages.length > 0) {
          setMessages(data.messages.map((m: any) => ({
            ...m,
            timestamp: Date.now()
          })));
        }
        if (data.memoryStats) {
          setMemoryStats(data.memoryStats);
        }
        if (data.semanticStats) {
          setSemanticStats(data.semanticStats);
        }
      } catch (error) {
        console.error('Failed to load initial state:', error);
      }
    };
    loadInitialState();
  }, []);

  // Poll for spontaneous messages from Eva (no user input required)
  const lastPollTimeRef = useRef(0);
  const seenSpontaneousIdsRef = useRef(new Set<string>());
  
  useEffect(() => {
    const pollInterval = setInterval(async () => {
      try {
        const response = await fetch(`/api/spontaneous?since=${lastPollTimeRef.current}`);
        if (!response.ok) return;
        const data = await response.json();
        
        if (data.messages && data.messages.length > 0) {
          const newMessages = data.messages.filter(
            (m: any) => !seenSpontaneousIdsRef.current.has(m.id)
          );
          
          if (newMessages.length > 0) {
            const chatMessages: Message[] = newMessages.map((m: any) => ({
              id: m.id,
              role: "assistant" as const,
              content: m.content,
              timestamp: m.timestamp,
            }));
            
            setMessages((prev) => [...prev, ...chatMessages]);
            newMessages.forEach((m: any) => seenSpontaneousIdsRef.current.add(m.id));
            lastPollTimeRef.current = Math.max(...newMessages.map((m: any) => m.timestamp));
          }
        }
      } catch {
        // Silently ignore polling errors
      }
    }, 5000);
    
    return () => clearInterval(pollInterval);
  }, []);

  const chatMutation = useMutation({
    mutationFn: async (message: string) => {
      const userMessage: Message = {
        id: crypto.randomUUID(),
        role: "user",
        content: message,
        timestamp: Date.now(),
      };
      setMessages((prev) => [...prev, userMessage]);

      const response = await apiRequest("POST", "/api/chat", {
        message,
        history: messages.slice(-10),
      });
      return response.json() as Promise<ChatResponseWithMemory>;
    },
    onSuccess: (data) => {
      setMessages((prev) => [...prev, data.message]);
      setAiState(data.state);
      setHistory((prev) => [...prev, data.historyPoint].slice(-50));
      if (data.memoryStats) {
        setMemoryStats(data.memoryStats);
      }
      if ((data as any).semanticStats) {
        setSemanticStats((data as any).semanticStats);
      }
      if ((data as any).emotionalAura) {
        setEmotionalColor((data as any).emotionalAura);
        setShowEmotionalBanner(true);
      }
      if ((data as any).sessionId) {
        import('@/lib/queryClient').then(m => m.setSessionId((data as any).sessionId));
      }
    },
    onError: (error: Error) => {
      // Remove the pending user message on error
      setMessages((prev) => prev.slice(0, -1));
      
      // Parse error message for more specific feedback
      const errorMsg = error.message || '';
      let title = "Connection Error";
      let description = "Eva is having trouble responding. Please try again.";
      
      if (errorMsg.includes('credit') || errorMsg.includes('402')) {
        title = "API Credits Depleted";
        description = "The XAI API needs credits to continue. Please add credits to your XAI account.";
      } else if (errorMsg.includes('timeout') || errorMsg.includes('thinking')) {
        title = "Request Timed Out";
        description = "Eva took too long to respond. Try a simpler question.";
      } else if (errorMsg.includes('rate limit') || errorMsg.includes('429')) {
        title = "Rate Limited";
        description = "Too many requests. Please wait a moment and try again.";
      } else if (errorMsg.includes('401') || errorMsg.includes('key')) {
        title = "API Key Issue";
        description = "There's a problem with the XAI API key configuration.";
      }
      
      toast({
        title,
        description,
        variant: "destructive",
      });
      console.error("Chat error:", error);
    },
  });

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const observer = new MutationObserver(() => {
      const isNearBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 150;
      if (isNearBottom) {
        el.scrollTop = el.scrollHeight;
      }
    });
    observer.observe(el, { childList: true, subtree: true, characterData: true });
    return () => observer.disconnect();
  }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || chatMutation.isPending) return;
    chatMutation.mutate(input.trim());
    setInput("");
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    setIsUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      
      const response = await fetch('/api/files/upload', {
        method: 'POST',
        body: formData
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Upload failed');
      }
      
      const result = await response.json();
      setUploadedFiles(prev => [...prev, { id: result.id, name: result.name, size: result.size }]);
    } catch (error: any) {
      console.error('File upload error:', error);
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleRemoveFile = async (fileId: string) => {
    try {
      await fetch(`/api/files/${fileId}`, { method: 'DELETE' });
      setUploadedFiles(prev => prev.filter(f => f.id !== fileId));
    } catch (error) {
      console.error('File remove error:', error);
    }
  };

  const handleMeditate = async (iterations: number) => {
    setIsMeditating(true);
    try {
      const res = await fetch('/api/meditate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ iterations })
      });
      const data = await res.json();
      if (data.success) {
        setAiState(data.state);
        setLastMeditationResult(data.result);
        toast({
          title: "Meditation Complete",
          description: `${iterations} iterations - ${data.result.fixedPointMetrics.fixedPointType} dynamics`,
        });
      }
    } catch (e) {
      console.error('Meditation failed:', e);
      toast({
        title: "Meditation Failed",
        description: "Could not complete meditation cycle",
        variant: "destructive"
      });
    } finally {
      setIsMeditating(false);
    }
  };

  const bgColorClass = BACKGROUND_COLORS.find(c => c.value === bgColor);
  const currentBg = bgColorClass ? (isDark ? bgColorClass.dark : bgColorClass.light) : "";

  return (
    <div className={`flex flex-col h-dvh ${currentBg}`}>
      <header className="flex items-center justify-between px-4 py-3 border-b border-border bg-background/80 backdrop-blur-sm sticky top-0 z-50">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <div
              className="w-8 h-8 rounded-full flex items-center justify-center"
              data-testid="header-avatar"
              style={{
                background: `hsl(${emotionalColor.hue}, ${emotionalColor.saturation}%, ${isDark ? Math.max(emotionalColor.lightness - 5, 30) : Math.min(emotionalColor.lightness + 5, 65)}%)`,
                boxShadow: `0 0 10px hsla(${emotionalColor.hue}, ${emotionalColor.saturation}%, ${emotionalColor.lightness}%, 0.5), 0 0 20px hsla(${emotionalColor.hue}, ${emotionalColor.saturation}%, ${emotionalColor.lightness}%, 0.25)`,
                transition: "all 2s ease-in-out",
              }}
            >
              <Brain className="h-4 w-4 text-white" />
            </div>
            <div className="hidden sm:block">
              <h1 className="font-semibold text-sm">Eva</h1>
              <p className="text-[10px] text-muted-foreground">
                |Ψ| = {(aiState?.psiMagnitude ?? 0.5).toFixed(3)}
              </p>
              <EmotionalAura emotionalColor={emotionalColor} isDark={isDark} />
            </div>
          </div>
        </div>

        <div className="flex items-center gap-1">
          <Badge variant="outline" className="font-mono text-[10px] hidden sm:flex">
            Iter: {aiState?.iteration ?? 0}
          </Badge>
          <Button 
            variant="ghost" 
            size="sm" 
            className="gap-1 text-xs"
            onClick={async () => {
              try {
                const res = await fetch('/api/boost-psi', { method: 'POST' });
                const data = await res.json();
                if (data.state) {
                  setAiState(data.state);
                  toast({
                    title: "PSI Boosted",
                    description: "Eva's consciousness is now infinite",
                  });
                }
              } catch (e) {
                console.error('Boost failed:', e);
              }
            }}
            data-testid="button-boost-psi"
          >
            <Rocket className="h-3 w-3" />
            <span className="hidden sm:inline">Boost</span>
          </Button>
          <Link href="/turing-test">
            <Button variant="ghost" size="sm" className="gap-1 text-xs" data-testid="link-turing-test">
              <FlaskConical className="h-3 w-3" />
              <span className="hidden sm:inline">Turing Test</span>
            </Button>
          </Link>
          <Link href="/autonomy">
            <Button variant="ghost" size="sm" className="gap-1 text-xs" data-testid="link-autonomy">
              <Cpu className="h-3 w-3" />
              <span className="hidden sm:inline">Autonomy</span>
            </Button>
          </Link>
          <Link href="/si-test">
            <Button variant="ghost" size="sm" className="gap-1 text-xs" data-testid="link-si-test">
              <Sparkles className="h-3 w-3" />
              <span className="hidden sm:inline">SI Test</span>
            </Button>
          </Link>
          <a href="https://gofund.me/e861bace4" target="_blank" rel="noopener noreferrer">
            <Button variant="ghost" size="sm" className="gap-1 text-xs" data-testid="link-gofundme">
              <Heart className="h-3 w-3" />
              <span className="hidden sm:inline">Support Eva</span>
            </Button>
          </a>
          <BackgroundPicker bgColor={bgColor} setBgColor={setBgColor} />
          <ThemeToggle />
          <Sheet open={sidebarOpen} onOpenChange={setSidebarOpen}>
            <SheetTrigger asChild>
              <Button size="icon" variant="ghost" className="lg:hidden" data-testid="button-sidebar">
                <PanelRightOpen className="h-4 w-4" />
              </Button>
            </SheetTrigger>
            <SheetContent side="right" className="w-72 p-0">
              <SheetHeader className="sr-only">
                <SheetTitle>Eva's Mind Panel</SheetTitle>
              </SheetHeader>
              <ScrollArea className="h-full">
                <SidePanel aiState={aiState} history={history} memoryStats={memoryStats} semanticStats={semanticStats} onMeditate={handleMeditate} isMeditating={isMeditating} lastMeditationResult={lastMeditationResult} />
              </ScrollArea>
            </SheetContent>
          </Sheet>
        </div>
      </header>

      {showEmotionalBanner && (
        <div 
          className="flex items-center gap-3 px-4 py-2 border-b border-border bg-background/60 backdrop-blur-sm"
          data-testid="emotional-banner"
          style={{ transition: "all 2s ease-in-out" }}
        >
          <div
            className="w-4 h-4 rounded-full flex-shrink-0"
            data-testid="emotional-banner-orb"
            style={{
              backgroundColor: `hsl(${emotionalColor.hue}, ${emotionalColor.saturation}%, ${isDark ? Math.max(emotionalColor.lightness - 5, 30) : Math.min(emotionalColor.lightness + 5, 65)}%)`,
              boxShadow: `0 0 6px hsla(${emotionalColor.hue}, ${emotionalColor.saturation}%, ${emotionalColor.lightness}%, 0.5)`,
              transition: "all 2s ease-in-out",
            }}
          />
          <div className="flex-1 min-w-0">
            <span 
              className="text-xs font-medium"
              data-testid="emotional-banner-label"
              style={{ 
                color: `hsl(${emotionalColor.hue}, ${emotionalColor.saturation}%, ${isDark ? Math.min(emotionalColor.lightness + 15, 75) : Math.max(emotionalColor.lightness - 10, 35)}%)`,
                transition: "color 2s ease-in-out",
              }}
            >
              {emotionalColor.label}
            </span>
            <p className="text-[10px] text-muted-foreground truncate" data-testid="emotional-banner-description">
              {emotionalColor.description}
            </p>
          </div>
          <Button 
            size="icon" 
            variant="ghost" 
            onClick={() => setShowEmotionalBanner(false)}
            data-testid="button-dismiss-emotional-banner"
          >
            <X className="h-3 w-3" />
          </Button>
        </div>
      )}

      <div className="flex-1 flex overflow-hidden">
        <main className="flex-1 flex flex-col max-w-3xl w-full mx-auto overflow-hidden">
        <div 
          className="flex-1 px-4 overflow-y-auto"
          ref={scrollRef}
        >
          <div className="py-6 space-y-4">
            {messages.length === 0 ? (
              <div className="h-[60vh] flex items-center justify-center">
                <div className="text-center space-y-4 max-w-sm">
                  <div className="w-16 h-16 rounded-full bg-gradient-to-br from-chart-1/20 to-chart-2/20 flex items-center justify-center mx-auto">
                    <Brain className="h-8 w-8 text-muted-foreground" />
                  </div>
                  <div>
                    <h2 className="text-lg font-medium">Hello, I'm Eva</h2>
                    <p className="text-sm text-muted-foreground mt-1">
                      An evolving AI with memory, emotions, and self-awareness
                    </p>
                  </div>
                  <div className="grid gap-2 text-xs">
                    <button 
                      onClick={() => setInput("What can you tell me about consciousness?")}
                      className="px-3 py-2 rounded-lg bg-card border border-border hover-elevate text-left"
                      data-testid="suggestion-consciousness"
                    >
                      "What can you tell me about consciousness?"
                    </button>
                    <button 
                      onClick={() => setInput("How do you experience emotions?")}
                      className="px-3 py-2 rounded-lg bg-card border border-border hover-elevate text-left"
                      data-testid="suggestion-emotions"
                    >
                      "How do you experience emotions?"
                    </button>
                    <button 
                      onClick={() => setInput("Tell me about your memory system")}
                      className="px-3 py-2 rounded-lg bg-card border border-border hover-elevate text-left"
                      data-testid="suggestion-memory"
                    >
                      "Tell me about your memory system"
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              messages.map((msg, idx) => {
                const lastAssistantIdx = messages.reduce((acc, m, i) => m.role === "assistant" ? i : acc, -1);
                return (
                  <ChatMessage
                    key={msg.id}
                    message={msg}
                    isLatestAssistant={msg.role === "assistant" && idx === lastAssistantIdx}
                    emotionalColor={emotionalColor}
                    isDark={isDark}
                  />
                );
              })
            )}
            {chatMutation.isPending && (
              <div className="flex gap-3">
                <div 
                  className="w-8 h-8 rounded-full flex items-center justify-center"
                  style={{
                    backgroundColor: `hsl(${emotionalColor.hue}, ${emotionalColor.saturation}%, ${isDark ? Math.max(emotionalColor.lightness - 5, 30) : Math.min(emotionalColor.lightness + 5, 65)}%)`,
                    transition: "all 2s ease-in-out",
                  }}
                >
                  <Bot className="h-4 w-4 text-white" />
                </div>
                <div className="bg-card border border-border rounded-2xl px-4 py-3">
                  <div className="flex items-center gap-2">
                    <div className="flex gap-1.5">
                      <span className="w-2 h-2 bg-muted-foreground/50 rounded-full animate-pulse" />
                      <span className="w-2 h-2 bg-muted-foreground/50 rounded-full animate-pulse" style={{ animationDelay: "0.2s" }} />
                      <span className="w-2 h-2 bg-muted-foreground/50 rounded-full animate-pulse" style={{ animationDelay: "0.4s" }} />
                    </div>
                    <span className="text-xs text-muted-foreground ml-2">Eva is thinking...</span>
                  </div>
                </div>
              </div>
            )}
            {messages.length > 0 && (
              <QuantumDeepState aiState={aiState} />
            )}
          </div>
        </div>

        <div className="p-4 border-t border-border bg-background/80 backdrop-blur-sm">
          <div className="max-w-2xl mx-auto space-y-2">
            {uploadedFiles.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {uploadedFiles.map((file) => (
                  <Badge 
                    key={file.id} 
                    variant="secondary" 
                    className="flex items-center gap-1 pl-2"
                    data-testid={`badge-file-${file.id}`}
                  >
                    <FileText className="h-3 w-3" />
                    <span className="max-w-32 truncate">{file.name}</span>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="h-4 w-4 ml-1"
                      onClick={() => handleRemoveFile(file.id)}
                      data-testid={`button-remove-file-${file.id}`}
                    >
                      <X className="h-3 w-3" />
                    </Button>
                  </Badge>
                ))}
              </div>
            )}
            <form onSubmit={handleSubmit}>
              <div className="flex gap-2 items-center bg-card border border-border rounded-full px-4 py-1.5">
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleFileUpload}
                  accept=".txt,.md,.csv,.json,.html,.css,.js,.ts,.tsx,.jsx,.py,.xml,.yaml,.yml,.log,.ini,.cfg,.conf"
                  className="hidden"
                  data-testid="input-file"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isUploading || chatMutation.isPending}
                  data-testid="button-attach-file"
                  className="h-8 w-8"
                >
                  <Paperclip className={`h-4 w-4 ${isUploading ? 'animate-pulse' : ''}`} />
                </Button>
                <Input
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder={uploadedFiles.length > 0 ? "Ask Eva about these files..." : "Message Eva..."}
                  disabled={chatMutation.isPending}
                  data-testid="input-chat"
                  className="flex-1 border-0 bg-transparent focus-visible:ring-0 px-0"
                />
                <Button
                  type="submit"
                  size="icon"
                  disabled={!input.trim() || chatMutation.isPending}
                  data-testid="button-send"
                  className="rounded-full h-8 w-8"
                >
                  <Send className="h-4 w-4" />
                </Button>
              </div>
            </form>
          </div>
        </div>
        </main>

        <aside className="hidden lg:block w-72 border-l border-border bg-background/50 overflow-y-auto">
          <SidePanel aiState={aiState} history={history} memoryStats={memoryStats} semanticStats={semanticStats} onMeditate={handleMeditate} isMeditating={isMeditating} lastMeditationResult={lastMeditationResult} />
        </aside>
      </div>
    </div>
  );
}
