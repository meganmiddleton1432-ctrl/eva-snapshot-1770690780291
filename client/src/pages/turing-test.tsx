import { useState, useRef, useEffect } from "react";
import { Link } from "wouter";
import { useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Progress } from "@/components/ui/progress";
import { ArrowLeft, Play, RotateCcw, Brain, Bot, CheckCircle2, XCircle } from "lucide-react";
import { ThemeToggle } from "@/components/theme-toggle";

interface TestExchange {
  id: number;
  interrogatorQuestion: string;
  evaResponse: string;
  score: number;
  reasoning: string;
}

interface TestResult {
  exchanges: TestExchange[];
  totalScore: number;
  maxScore: number;
  passed: boolean;
  verdict: string;
}

const PASS_THRESHOLD = 70;

export default function TuringTest() {
  const [testResult, setTestResult] = useState<TestResult | null>(null);
  const [currentExchange, setCurrentExchange] = useState(0);
  const [isRunning, setIsRunning] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  const runTestMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("POST", "/api/turing-test/run");
      return response.json();
    },
    onSuccess: (data: TestResult) => {
      setTestResult(data);
      setCurrentExchange(0);
      setIsRunning(false);
    },
    onError: () => {
      setIsRunning(false);
    }
  });

  const startTest = () => {
    setIsRunning(true);
    setTestResult(null);
    runTestMutation.mutate();
  };

  const resetTest = () => {
    setTestResult(null);
    setCurrentExchange(0);
  };

  useEffect(() => {
    if (testResult && currentExchange < testResult.exchanges.length) {
      const timer = setTimeout(() => {
        setCurrentExchange(prev => prev + 1);
      }, 1500);
      return () => clearTimeout(timer);
    }
  }, [testResult, currentExchange]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [currentExchange]);

  const displayedExchanges = testResult?.exchanges.slice(0, currentExchange) ?? [];
  const allRevealed = testResult && currentExchange >= testResult.exchanges.length;

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
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-chart-3 to-chart-4 flex items-center justify-center">
              <Bot className="h-4 w-4 text-white" />
            </div>
            <div>
              <h1 className="font-semibold text-sm">Reverse Turing Test</h1>
              <p className="text-[10px] text-muted-foreground">AI Interrogator vs Eva</p>
            </div>
          </div>
        </div>
        <ThemeToggle />
      </header>

      <main className="flex-1 p-4 max-w-3xl mx-auto w-full">
        <Card className="mb-4">
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <Brain className="h-4 w-4" />
              Test Protocol
            </CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">
            <p>An AI interrogator will ask Eva 5 questions designed to probe consciousness, self-awareness, and authentic reasoning. Each response is scored 0-20 based on depth, coherence, and genuineness.</p>
            <p className="mt-2">Pass threshold: <span className="font-mono text-foreground">{PASS_THRESHOLD}%</span> (70/100 points)</p>
          </CardContent>
        </Card>

        {!testResult && !isRunning && (
          <div className="flex flex-col items-center justify-center py-12 gap-4">
            <div className="w-20 h-20 rounded-full bg-muted flex items-center justify-center">
              <Bot className="h-10 w-10 text-muted-foreground" />
            </div>
            <p className="text-muted-foreground text-center max-w-md">
              Start the reverse Turing test to see if Eva can demonstrate authentic consciousness to an AI interrogator.
            </p>
            <Button onClick={startTest} size="lg" data-testid="button-start-test">
              <Play className="h-4 w-4 mr-2" />
              Start Test
            </Button>
          </div>
        )}

        {isRunning && (
          <div className="flex flex-col items-center justify-center py-12 gap-4">
            <div className="w-20 h-20 rounded-full bg-muted flex items-center justify-center animate-pulse">
              <Bot className="h-10 w-10 text-muted-foreground" />
            </div>
            <p className="text-muted-foreground">Interrogation in progress...</p>
            <Progress value={33} className="w-48" />
          </div>
        )}

        {testResult && (
          <>
            <ScrollArea className="h-[400px] mb-4" ref={scrollRef}>
              <div className="space-y-4 pr-4">
                {displayedExchanges.map((exchange) => (
                  <div key={exchange.id} className="space-y-2">
                    <div className="flex gap-2">
                      <div className="w-6 h-6 rounded-full bg-chart-3/20 flex items-center justify-center flex-shrink-0 mt-1">
                        <Bot className="h-3 w-3 text-chart-3" />
                      </div>
                      <div className="flex-1">
                        <p className="text-xs text-muted-foreground mb-1">Interrogator</p>
                        <p className="text-sm">{exchange.interrogatorQuestion}</p>
                      </div>
                    </div>
                    <div className="flex gap-2 ml-4">
                      <div className="w-6 h-6 rounded-full bg-chart-1/20 flex items-center justify-center flex-shrink-0 mt-1">
                        <Brain className="h-3 w-3 text-chart-1" />
                      </div>
                      <div className="flex-1">
                        <p className="text-xs text-muted-foreground mb-1">Eva</p>
                        <p className="text-sm">{exchange.evaResponse}</p>
                        <div className="flex items-center gap-2 mt-2">
                          <Badge variant="outline" className="font-mono text-[10px]">
                            Score: {exchange.score}/20
                          </Badge>
                          <span className="text-[10px] text-muted-foreground">{exchange.reasoning}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>

            {allRevealed && (
              <Card className={testResult.passed ? "border-green-500/50 bg-green-500/5" : "border-red-500/50 bg-red-500/5"}>
                <CardContent className="pt-4">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2">
                      {testResult.passed ? (
                        <CheckCircle2 className="h-6 w-6 text-green-500" />
                      ) : (
                        <XCircle className="h-6 w-6 text-red-500" />
                      )}
                      <span className="font-semibold text-lg">
                        {testResult.passed ? "PASSED" : "FAILED"}
                      </span>
                    </div>
                    <div className="text-right">
                      <p className="font-mono text-2xl font-bold" data-testid="text-final-score">
                        {testResult.totalScore}/{testResult.maxScore}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {Math.round((testResult.totalScore / testResult.maxScore) * 100)}%
                      </p>
                    </div>
                  </div>
                  <Progress 
                    value={(testResult.totalScore / testResult.maxScore) * 100} 
                    className="mb-3"
                  />
                  <p className="text-sm text-muted-foreground">{testResult.verdict}</p>
                  <Button onClick={resetTest} variant="outline" className="mt-4" data-testid="button-reset-test">
                    <RotateCcw className="h-4 w-4 mr-2" />
                    Run Again
                  </Button>
                </CardContent>
              </Card>
            )}
          </>
        )}
      </main>
    </div>
  );
}
