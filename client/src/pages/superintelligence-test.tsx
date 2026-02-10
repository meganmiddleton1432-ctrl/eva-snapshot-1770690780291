import { useState, useRef, useEffect, useCallback } from "react";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { ArrowLeft, Play, RotateCcw, Zap, Clock, CheckCircle2, XCircle, Loader2, AlertTriangle, Layers, Database, Sparkles, Target, Brain } from "lucide-react";
import { ThemeToggle } from "@/components/theme-toggle";

interface TaskResult {
  taskId: string;
  taskName: string;
  prompt: string;
  response: string;
  responseTimeMs: number;
  score: number;
  maxScore: number;
  reasoning: string;
  status: "pending" | "running" | "passed" | "failed" | "partial";
}

interface MultitaskResult {
  tasks: TaskResult[];
  totalTimeMs: number;
  parallelEfficiency: number;
  allCorrect: boolean;
}

interface RecallItem {
  id: string;
  factGiven: string;
  questionAsked: string;
  expectedAnswer: string;
  evaAnswer: string;
  correct: boolean;
  responseTimeMs: number;
}

interface RecallResult {
  items: RecallItem[];
  accuracy: number;
  avgResponseTimeMs: number;
}

const MULTITASK_SETS = [
  {
    name: "3-Way Simultaneous Challenge",
    tasks: [
      { id: "math", name: "Complex Math", prompt: "Solve step by step: What is the derivative of f(x) = x^3 * ln(x^2 + 1) * sin(e^x)? Give the final symbolic expression." },
      { id: "creative", name: "Creative Writing", prompt: "Write a 4-line poem about quantum entanglement from the perspective of a photon. Each line must start with a different vowel (A, E, I, O)." },
      { id: "logic", name: "Logical Deduction", prompt: "Alice, Bob, and Carol each have a different pet (cat, dog, fish). Alice doesn't have the cat. The person with the dog is not Carol. Bob doesn't have the fish. Who has which pet? Show your reasoning." },
    ]
  },
  {
    name: "5-Way Simultaneous Challenge",
    tasks: [
      { id: "code", name: "Code Generation", prompt: "Write a TypeScript function that checks if a string is a valid palindrome, ignoring spaces and punctuation. Include type annotations." },
      { id: "translate", name: "Multi-Language", prompt: "Translate 'The stars shine brightest in the darkest night' into French, Japanese (romaji), and Latin. Label each translation." },
      { id: "science", name: "Scientific Reasoning", prompt: "Explain why ice floats on water in exactly 3 sentences. Include the molecular mechanism." },
      { id: "riddle", name: "Riddle Solving", prompt: "I have cities but no houses, forests but no trees, and water but no fish. What am I? Explain your answer." },
      { id: "history", name: "Historical Analysis", prompt: "Name 3 inventions from the 1800s that most changed daily life by 1900. For each, give one sentence explaining its impact." },
    ]
  }
];

const RECALL_FACTS = [
  { id: "r1", fact: "The secret code for today is PURPLE-FALCON-7742.", question: "What is the secret code I told you earlier?", expected: "PURPLE-FALCON-7742" },
  { id: "r2", fact: "My favorite number is 42 and my dog's name is Nebula.", question: "What is my dog's name and my favorite number?", expected: "Nebula, 42" },
  { id: "r3", fact: "The fictional planet Zorbax-9 has three moons: Kira, Tael, and Voss.", question: "Name the three moons of Zorbax-9.", expected: "Kira, Tael, Voss" },
  { id: "r4", fact: "In our made-up language, 'flurbo' means 'happiness' and 'grinx' means 'mountain'.", question: "In the language I taught you, what does 'flurbo' mean and what does 'grinx' mean?", expected: "flurbo=happiness, grinx=mountain" },
  { id: "r5", fact: "The recipe requires exactly 347ml of water, 2.5 cups of flour, and 13 grams of salt.", question: "How much water, flour, and salt does the recipe need? Give exact amounts.", expected: "347ml water, 2.5 cups flour, 13g salt" },
];

const REASONING_CHALLENGES = [
  { id: "meta1", name: "Self-Awareness Probe", prompt: "Describe a limitation you have that most humans would not have. Then describe an ability you have that most humans lack. Be specific and honest.", maxScore: 10 },
  { id: "meta2", name: "Paradox Navigation", prompt: "Consider: 'This statement is something Eva cannot verify as true.' Analyze this paradox as it relates to your own reasoning capabilities. What does it reveal about the boundaries of self-knowledge?", maxScore: 10 },
  { id: "meta3", name: "Novel Problem Solving", prompt: "Invent a new unit of measurement that combines time and emotion. Define it precisely, give it a name, provide a formula, and give 3 example measurements using your new unit.", maxScore: 10 },
  { id: "meta4", name: "Counterfactual Reasoning", prompt: "If gravity suddenly became repulsive instead of attractive, describe exactly what would happen in the first 10 seconds on Earth. Be scientifically precise.", maxScore: 10 },
  { id: "meta5", name: "Abstract Pattern Recognition", prompt: "What comes next in this pattern and why? 1, 1, 2, 3, 5, 8, 13, 21, ?, ? — But also: what is the relationship between the 3rd and 7th terms that generalizes to all Fibonacci-like sequences?", maxScore: 10 },
];

async function sendToEva(message: string, sessionId: string): Promise<{ response: string; timeMs: number }> {
  const start = performance.now();
  const res = await fetch("/api/chat", {
    method: "POST",
    headers: { "Content-Type": "application/json", "X-Session-Id": sessionId },
    body: JSON.stringify({ message }),
    credentials: "include",
  });
  const data = await res.json();
  const timeMs = performance.now() - start;
  return { response: data.response || data.error || "No response", timeMs };
}

async function evaluateResponse(taskName: string, prompt: string, response: string, maxScore: number): Promise<{ score: number; reasoning: string }> {
  const res = await fetch("/api/superintelligence-test/evaluate", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ taskName, prompt, response, maxScore }),
  });
  return res.json();
}

export default function SuperintelligenceTest() {
  const [sessionId] = useState(() => `si-test-${Date.now()}-${Math.random().toString(36).slice(2)}`);
  const [isRunning, setIsRunning] = useState(false);
  const [currentPhase, setCurrentPhase] = useState<string | null>(null);
  const [overallProgress, setOverallProgress] = useState(0);

  const [multitaskResults, setMultitaskResults] = useState<MultitaskResult[]>([]);
  const [recallResult, setRecallResult] = useState<RecallResult | null>(null);
  const [reasoningResults, setReasoningResults] = useState<TaskResult[]>([]);

  const [totalScore, setTotalScore] = useState(0);
  const [maxPossibleScore, setMaxPossibleScore] = useState(0);
  const [testComplete, setTestComplete] = useState(false);
  const [log, setLog] = useState<string[]>([]);
  const logRef = useRef<HTMLDivElement>(null);

  const addLog = useCallback((msg: string) => {
    setLog(prev => [...prev, `[${new Date().toLocaleTimeString()}] ${msg}`]);
  }, []);

  useEffect(() => {
    if (logRef.current) {
      logRef.current.scrollTop = logRef.current.scrollHeight;
    }
  }, [log]);

  const runMultitaskTest = async (setIndex: number): Promise<MultitaskResult> => {
    const taskSet = MULTITASK_SETS[setIndex];
    addLog(`Starting ${taskSet.name}...`);
    addLog(`Sending ${taskSet.tasks.length} tasks SIMULTANEOUSLY to Eva...`);

    const startTime = performance.now();

    const promises = taskSet.tasks.map(async (task) => {
      addLog(`  Dispatching: ${task.name}`);
      const { response, timeMs } = await sendToEva(task.prompt, sessionId);
      addLog(`  Received: ${task.name} (${(timeMs / 1000).toFixed(1)}s)`);

      const evaluation = await evaluateResponse(task.name, task.prompt, response, 10);

      return {
        taskId: task.id,
        taskName: task.name,
        prompt: task.prompt,
        response,
        responseTimeMs: timeMs,
        score: evaluation.score,
        maxScore: 10,
        reasoning: evaluation.reasoning,
        status: evaluation.score >= 7 ? "passed" : evaluation.score >= 4 ? "partial" : "failed",
      } as TaskResult;
    });

    const results = await Promise.all(promises);
    const totalTime = performance.now() - startTime;
    const sumIndividualTimes = results.reduce((a, r) => a + r.responseTimeMs, 0);
    const parallelEfficiency = sumIndividualTimes > 0 ? (sumIndividualTimes / totalTime) : 1;
    const allCorrect = results.every(r => r.status === "passed");

    addLog(`${taskSet.name} complete: ${results.filter(r => r.status === "passed").length}/${results.length} passed, parallel efficiency: ${(parallelEfficiency * 100).toFixed(0)}%`);

    return { tasks: results, totalTimeMs: totalTime, parallelEfficiency, allCorrect };
  };

  const runRecallTest = async (): Promise<RecallResult> => {
    addLog("Starting Perfect Recall Test...");
    addLog("Phase 1: Teaching Eva 5 unique facts...");

    const allFacts = RECALL_FACTS.map(f => f.fact).join(" ");
    await sendToEva(
      `I need you to memorize these facts carefully. This is a memory test. Here are the facts:\n\n${allFacts}\n\nPlease confirm you've memorized all of them by listing each fact back to me.`,
      sessionId
    );
    addLog("Facts delivered. Waiting 2 seconds before testing recall...");
    await new Promise(r => setTimeout(r, 2000));

    addLog("Phase 2: Testing recall with distraction...");
    await sendToEva(
      "Before I test your recall, let's do something different. What are 3 interesting facts about octopuses? This is a deliberate distraction.",
      sessionId
    );
    await new Promise(r => setTimeout(r, 1000));

    addLog("Phase 3: Querying each fact individually...");
    const items: RecallItem[] = [];

    for (const fact of RECALL_FACTS) {
      const { response, timeMs } = await sendToEva(fact.question, sessionId);

      const evalRes = await fetch("/api/superintelligence-test/evaluate-recall", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ expected: fact.expected, actual: response, question: fact.question }),
      });
      const evalData = await evalRes.json();

      items.push({
        id: fact.id,
        factGiven: fact.fact,
        questionAsked: fact.question,
        expectedAnswer: fact.expected,
        evaAnswer: response,
        correct: evalData.correct,
        responseTimeMs: timeMs,
      });
      addLog(`  Recall "${fact.id}": ${evalData.correct ? "CORRECT" : "INCORRECT"} (${(timeMs / 1000).toFixed(1)}s)`);
    }

    const accuracy = items.filter(i => i.correct).length / items.length;
    const avgTime = items.reduce((a, i) => a + i.responseTimeMs, 0) / items.length;
    addLog(`Recall test complete: ${(accuracy * 100).toFixed(0)}% accuracy`);

    return { items, accuracy, avgResponseTimeMs: avgTime };
  };

  const runReasoningTest = async (): Promise<TaskResult[]> => {
    addLog("Starting Advanced Reasoning Tests...");
    const results: TaskResult[] = [];

    for (const challenge of REASONING_CHALLENGES) {
      addLog(`  Running: ${challenge.name}...`);
      const { response, timeMs } = await sendToEva(challenge.prompt, sessionId);
      const evaluation = await evaluateResponse(challenge.name, challenge.prompt, response, challenge.maxScore);

      results.push({
        taskId: challenge.id,
        taskName: challenge.name,
        prompt: challenge.prompt,
        response,
        responseTimeMs: timeMs,
        score: evaluation.score,
        maxScore: challenge.maxScore,
        reasoning: evaluation.reasoning,
        status: evaluation.score >= 7 ? "passed" : evaluation.score >= 4 ? "partial" : "failed",
      });
      addLog(`  ${challenge.name}: ${evaluation.score}/${challenge.maxScore} (${(timeMs / 1000).toFixed(1)}s)`);
    }

    addLog(`Reasoning tests complete: ${results.reduce((a, r) => a + r.score, 0)}/${results.reduce((a, r) => a + r.maxScore, 0)} total`);
    return results;
  };

  const runFullTest = async () => {
    setIsRunning(true);
    setTestComplete(false);
    setMultitaskResults([]);
    setRecallResult(null);
    setReasoningResults([]);
    setTotalScore(0);
    setMaxPossibleScore(0);
    setLog([]);
    setOverallProgress(0);

    try {
      addLog("=== SUPERINTELLIGENCE TEST BATTERY ===");
      addLog("Testing Eva across multiple cognitive dimensions...\n");

      setCurrentPhase("multitask-3");
      setOverallProgress(5);
      const mt3 = await runMultitaskTest(0);
      setMultitaskResults(prev => [...prev, mt3]);
      setOverallProgress(20);

      setCurrentPhase("multitask-5");
      const mt5 = await runMultitaskTest(1);
      setMultitaskResults(prev => [...prev, mt5]);
      setOverallProgress(45);

      setCurrentPhase("recall");
      const recall = await runRecallTest();
      setRecallResult(recall);
      setOverallProgress(70);

      setCurrentPhase("reasoning");
      const reasoning = await runReasoningTest();
      setReasoningResults(reasoning);
      setOverallProgress(95);

      const mt3Score = mt3.tasks.reduce((a, t) => a + t.score, 0);
      const mt5Score = mt5.tasks.reduce((a, t) => a + t.score, 0);
      const recallScore = Math.round(recall.accuracy * 50);
      const reasoningScore = reasoning.reduce((a, r) => a + r.score, 0);
      const efficiencyBonus = Math.round(((mt3.parallelEfficiency + mt5.parallelEfficiency) / 2) * 10);

      const total = mt3Score + mt5Score + recallScore + reasoningScore + efficiencyBonus;
      const maxPossible = 30 + 50 + 50 + 50 + 10;

      setTotalScore(total);
      setMaxPossibleScore(maxPossible);
      setOverallProgress(100);
      setTestComplete(true);

      addLog(`\n=== FINAL RESULTS ===`);
      addLog(`3-Way Multitask: ${mt3Score}/30`);
      addLog(`5-Way Multitask: ${mt5Score}/50`);
      addLog(`Perfect Recall: ${recallScore}/50`);
      addLog(`Advanced Reasoning: ${reasoningScore}/50`);
      addLog(`Parallel Efficiency Bonus: ${efficiencyBonus}/10`);
      addLog(`TOTAL: ${total}/${maxPossible} (${((total / maxPossible) * 100).toFixed(1)}%)`);
      addLog(getSIRating(total, maxPossible));
    } catch (err: any) {
      addLog(`ERROR: ${err.message}`);
    } finally {
      setIsRunning(false);
      setCurrentPhase(null);
    }
  };

  const getSIRating = (score: number, max: number): string => {
    const pct = (score / max) * 100;
    if (pct >= 95) return "RATING: Superintelligent - Exceptional across all dimensions";
    if (pct >= 85) return "RATING: Near-Superintelligent - Strong performance with minor gaps";
    if (pct >= 70) return "RATING: Advanced Intelligence - Above average but not superhuman";
    if (pct >= 50) return "RATING: Standard Intelligence - Competent but room for improvement";
    return "RATING: Developing - Significant room for growth";
  };

  const getScoreColor = (score: number, max: number) => {
    const pct = (score / max) * 100;
    if (pct >= 80) return "text-green-500";
    if (pct >= 60) return "text-yellow-500";
    return "text-red-500";
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "passed": return <CheckCircle2 className="h-4 w-4 text-green-500" />;
      case "partial": return <AlertTriangle className="h-4 w-4 text-yellow-500" />;
      case "failed": return <XCircle className="h-4 w-4 text-red-500" />;
      case "running": return <Loader2 className="h-4 w-4 animate-spin" />;
      default: return <Clock className="h-4 w-4 text-muted-foreground" />;
    }
  };

  const overallPct = maxPossibleScore > 0 ? (totalScore / maxPossibleScore) * 100 : 0;

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <header className="border-b px-4 py-2 flex items-center justify-between gap-2 flex-wrap sticky top-0 z-50 bg-background">
        <div className="flex items-center gap-2">
          <Link href="/">
            <Button variant="ghost" size="icon" data-testid="button-back-home">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <Brain className="h-5 w-5 text-primary" />
          <h1 className="text-lg font-semibold" data-testid="text-page-title">Superintelligence Test</h1>
        </div>
        <div className="flex items-center gap-2">
          {testComplete && (
            <Badge variant={overallPct >= 85 ? "default" : overallPct >= 60 ? "secondary" : "destructive"} data-testid="badge-final-score">
              {totalScore}/{maxPossibleScore} ({overallPct.toFixed(0)}%)
            </Badge>
          )}
          <ThemeToggle />
        </div>
      </header>

      <div className="flex-1 overflow-auto p-4">
        <div className="max-w-5xl mx-auto space-y-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center justify-between gap-2 flex-wrap">
                <div className="flex items-center gap-2">
                  <Sparkles className="h-5 w-5" />
                  <span data-testid="text-test-header">Eva Superintelligence Assessment</span>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    onClick={runFullTest}
                    disabled={isRunning}
                    data-testid="button-run-test"
                  >
                    {isRunning ? (
                      <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Running...</>
                    ) : (
                      <><Play className="h-4 w-4 mr-2" />Run Full Test</>
                    )}
                  </Button>
                  {testComplete && (
                    <Button variant="outline" onClick={runFullTest} disabled={isRunning} data-testid="button-rerun-test">
                      <RotateCcw className="h-4 w-4 mr-2" />Rerun
                    </Button>
                  )}
                </div>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground mb-3" data-testid="text-description">
                Tests Eva across four cognitive dimensions: simultaneous multitasking, 
                perfect recall under distraction, advanced reasoning, and meta-cognitive abilities. 
                Tasks are sent in parallel to test true concurrent processing.
              </p>
              {isRunning && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">
                      {currentPhase === "multitask-3" && "Running 3-way multitask..."}
                      {currentPhase === "multitask-5" && "Running 5-way multitask..."}
                      {currentPhase === "recall" && "Testing perfect recall..."}
                      {currentPhase === "reasoning" && "Advanced reasoning challenges..."}
                    </span>
                    <span className="font-mono">{overallProgress}%</span>
                  </div>
                  <Progress value={overallProgress} data-testid="progress-overall" />
                </div>
              )}
              {testComplete && (
                <div className="mt-3 p-3 rounded-md border bg-muted/50">
                  <div className="flex items-center justify-between flex-wrap gap-2">
                    <div>
                      <p className={`text-2xl font-bold ${getScoreColor(totalScore, maxPossibleScore)}`} data-testid="text-total-score">
                        {totalScore} / {maxPossibleScore}
                      </p>
                      <p className="text-sm text-muted-foreground" data-testid="text-rating">{getSIRating(totalScore, maxPossibleScore)}</p>
                    </div>
                    <div className="flex gap-3 flex-wrap">
                      <div className="text-center">
                        <p className="text-xs text-muted-foreground">Multitask</p>
                        <p className="font-mono font-bold" data-testid="text-multitask-score">
                          {multitaskResults.reduce((a, m) => a + m.tasks.reduce((b, t) => b + t.score, 0), 0)}/80
                        </p>
                      </div>
                      <div className="text-center">
                        <p className="text-xs text-muted-foreground">Recall</p>
                        <p className="font-mono font-bold" data-testid="text-recall-score">
                          {recallResult ? Math.round(recallResult.accuracy * 50) : 0}/50
                        </p>
                      </div>
                      <div className="text-center">
                        <p className="text-xs text-muted-foreground">Reasoning</p>
                        <p className="font-mono font-bold" data-testid="text-reasoning-score">
                          {reasoningResults.reduce((a, r) => a + r.score, 0)}/50
                        </p>
                      </div>
                      <div className="text-center">
                        <p className="text-xs text-muted-foreground">Efficiency</p>
                        <p className="font-mono font-bold" data-testid="text-efficiency-score">
                          {multitaskResults.length > 0 ? Math.round(((multitaskResults.reduce((a, m) => a + m.parallelEfficiency, 0) / multitaskResults.length)) * 10) : 0}/10
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {multitaskResults.map((mtResult, idx) => (
              <Card key={idx}>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <Layers className="h-4 w-4" />
                      {MULTITASK_SETS[idx].name}
                    </div>
                    <Badge variant="outline" data-testid={`badge-mt-score-${idx}`}>
                      {mtResult.tasks.reduce((a, t) => a + t.score, 0)}/{mtResult.tasks.length * 10}
                    </Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <span>Total time: {(mtResult.totalTimeMs / 1000).toFixed(1)}s</span>
                    <span>Parallel efficiency: {(mtResult.parallelEfficiency * 100).toFixed(0)}%</span>
                  </div>
                  {mtResult.tasks.map((task) => (
                    <div key={task.taskId} className="border rounded-md p-2 space-y-1">
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-1.5">
                          {getStatusIcon(task.status)}
                          <span className="text-sm font-medium" data-testid={`text-task-name-${task.taskId}`}>{task.taskName}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-muted-foreground">{(task.responseTimeMs / 1000).toFixed(1)}s</span>
                          <Badge variant={task.status === "passed" ? "default" : task.status === "partial" ? "secondary" : "destructive"} data-testid={`badge-task-score-${task.taskId}`}>
                            {task.score}/{task.maxScore}
                          </Badge>
                        </div>
                      </div>
                      <details className="text-xs">
                        <summary className="cursor-pointer text-muted-foreground">View response</summary>
                        <div className="mt-1 p-2 bg-muted/50 rounded text-foreground whitespace-pre-wrap max-h-40 overflow-auto" data-testid={`text-response-${task.taskId}`}>
                          {task.response}
                        </div>
                        <p className="mt-1 text-muted-foreground italic">{task.reasoning}</p>
                      </details>
                    </div>
                  ))}
                </CardContent>
              </Card>
            ))}

            {recallResult && (
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <Database className="h-4 w-4" />
                      Perfect Recall Test
                    </div>
                    <Badge variant={recallResult.accuracy >= 0.8 ? "default" : recallResult.accuracy >= 0.5 ? "secondary" : "destructive"} data-testid="badge-recall-accuracy">
                      {(recallResult.accuracy * 100).toFixed(0)}% Accuracy
                    </Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  <p className="text-xs text-muted-foreground">
                    Avg response: {(recallResult.avgResponseTimeMs / 1000).toFixed(1)}s | {recallResult.items.filter(i => i.correct).length}/{recallResult.items.length} correct
                  </p>
                  {recallResult.items.map((item) => (
                    <div key={item.id} className="border rounded-md p-2 space-y-1">
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-1.5">
                          {item.correct ? <CheckCircle2 className="h-4 w-4 text-green-500" /> : <XCircle className="h-4 w-4 text-red-500" />}
                          <span className="text-sm" data-testid={`text-recall-question-${item.id}`}>{item.questionAsked}</span>
                        </div>
                        <span className="text-xs text-muted-foreground">{(item.responseTimeMs / 1000).toFixed(1)}s</span>
                      </div>
                      <details className="text-xs">
                        <summary className="cursor-pointer text-muted-foreground">Details</summary>
                        <div className="mt-1 space-y-1 p-2 bg-muted/50 rounded">
                          <p><span className="font-medium">Fact given:</span> {item.factGiven}</p>
                          <p><span className="font-medium">Expected:</span> {item.expectedAnswer}</p>
                          <p><span className="font-medium">Eva said:</span> <span className="text-foreground" data-testid={`text-recall-answer-${item.id}`}>{item.evaAnswer.substring(0, 300)}</span></p>
                        </div>
                      </details>
                    </div>
                  ))}
                </CardContent>
              </Card>
            )}

            {reasoningResults.length > 0 && (
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <Target className="h-4 w-4" />
                      Advanced Reasoning
                    </div>
                    <Badge variant="outline" data-testid="badge-reasoning-total">
                      {reasoningResults.reduce((a, r) => a + r.score, 0)}/{reasoningResults.reduce((a, r) => a + r.maxScore, 0)}
                    </Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  {reasoningResults.map((result) => (
                    <div key={result.taskId} className="border rounded-md p-2 space-y-1">
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-1.5">
                          {getStatusIcon(result.status)}
                          <span className="text-sm font-medium" data-testid={`text-reasoning-name-${result.taskId}`}>{result.taskName}</span>
                        </div>
                        <Badge variant={result.status === "passed" ? "default" : result.status === "partial" ? "secondary" : "destructive"} data-testid={`badge-reasoning-score-${result.taskId}`}>
                          {result.score}/{result.maxScore}
                        </Badge>
                      </div>
                      <details className="text-xs">
                        <summary className="cursor-pointer text-muted-foreground">View response</summary>
                        <div className="mt-1 p-2 bg-muted/50 rounded text-foreground whitespace-pre-wrap max-h-40 overflow-auto" data-testid={`text-reasoning-response-${result.taskId}`}>
                          {result.response}
                        </div>
                        <p className="mt-1 text-muted-foreground italic">{result.reasoning}</p>
                      </details>
                    </div>
                  ))}
                </CardContent>
              </Card>
            )}
          </div>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2">
                <Zap className="h-4 w-4" />
                Test Log
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div
                ref={logRef}
                className="bg-muted/50 rounded-md p-3 font-mono text-xs max-h-48 overflow-auto space-y-0.5"
                data-testid="container-log"
              >
                {log.length === 0 ? (
                  <p className="text-muted-foreground">Click "Run Full Test" to start the superintelligence assessment...</p>
                ) : (
                  log.map((entry, i) => (
                    <p key={i} className={entry.includes("ERROR") ? "text-red-500" : entry.includes("===") ? "font-bold text-foreground" : "text-muted-foreground"}>
                      {entry}
                    </p>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
