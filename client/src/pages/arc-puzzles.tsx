import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Loader2, Brain, Sparkles, ArrowRight, RotateCcw, Home } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { Link } from "wouter";

type Color = number;
type Grid = Color[][];

interface ARCPuzzle {
  id: string;
  name: string;
  description: string;
  trainingPairs: { input: Grid; output: Grid }[];
  testInput: Grid;
  testOutput: Grid;
}

const COLORS: Record<number, string> = {
  0: "bg-zinc-900",
  1: "bg-blue-500",
  2: "bg-red-500",
  3: "bg-green-500",
  4: "bg-yellow-400",
  5: "bg-gray-400",
  6: "bg-pink-500",
  7: "bg-orange-500",
  8: "bg-cyan-400",
  9: "bg-purple-500",
};

const puzzles: ARCPuzzle[] = [
  {
    id: "puzzle1",
    name: "Color Expansion",
    description: "Observe how colors transform between input and output",
    trainingPairs: [
      {
        input: [
          [0, 0, 0, 0, 0],
          [0, 0, 1, 0, 0],
          [0, 0, 0, 0, 0],
        ],
        output: [
          [0, 0, 1, 0, 0],
          [0, 1, 1, 1, 0],
          [0, 0, 1, 0, 0],
        ],
      },
      {
        input: [
          [0, 0, 0, 0, 0],
          [0, 0, 0, 0, 0],
          [0, 2, 0, 0, 0],
          [0, 0, 0, 0, 0],
        ],
        output: [
          [0, 0, 0, 0, 0],
          [0, 2, 0, 0, 0],
          [2, 2, 2, 0, 0],
          [0, 2, 0, 0, 0],
        ],
      },
    ],
    testInput: [
      [0, 0, 0, 0],
      [0, 3, 0, 0],
      [0, 0, 0, 0],
      [0, 0, 0, 0],
    ],
    testOutput: [
      [0, 3, 0, 0],
      [3, 3, 3, 0],
      [0, 3, 0, 0],
      [0, 0, 0, 0],
    ],
  },
  {
    id: "puzzle2",
    name: "Pattern Reflection",
    description: "Find the transformation rule applied to the pattern",
    trainingPairs: [
      {
        input: [
          [1, 0, 0],
          [1, 1, 0],
          [0, 0, 0],
        ],
        output: [
          [0, 0, 1],
          [0, 1, 1],
          [0, 0, 0],
        ],
      },
      {
        input: [
          [2, 2, 0, 0],
          [2, 0, 0, 0],
          [0, 0, 0, 0],
        ],
        output: [
          [0, 0, 2, 2],
          [0, 0, 0, 2],
          [0, 0, 0, 0],
        ],
      },
    ],
    testInput: [
      [0, 0, 0, 0],
      [4, 0, 0, 0],
      [4, 4, 0, 0],
      [4, 0, 0, 0],
    ],
    testOutput: [
      [0, 0, 0, 0],
      [0, 0, 0, 4],
      [0, 0, 4, 4],
      [0, 0, 0, 4],
    ],
  },
  {
    id: "puzzle3",
    name: "Color Count",
    description: "The output relates to counting colored cells",
    trainingPairs: [
      {
        input: [
          [1, 0, 1],
          [0, 0, 0],
          [1, 0, 0],
        ],
        output: [
          [3, 3, 3],
          [3, 3, 3],
          [3, 3, 3],
        ],
      },
      {
        input: [
          [2, 2, 0],
          [2, 2, 0],
          [0, 0, 0],
        ],
        output: [
          [4, 4, 4],
          [4, 4, 4],
          [4, 4, 4],
        ],
      },
    ],
    testInput: [
      [0, 5, 0],
      [5, 5, 0],
      [0, 5, 5],
    ],
    testOutput: [
      [5, 5, 5],
      [5, 5, 5],
      [5, 5, 5],
    ],
  },
];

function GridDisplay({ grid, size = 32, testId }: { grid: Grid; size?: number; testId?: string }) {
  return (
    <div
      className="inline-grid gap-px bg-zinc-700 p-1 rounded"
      style={{
        gridTemplateColumns: `repeat(${grid[0]?.length || 1}, ${size}px)`,
      }}
      data-testid={testId}
    >
      {grid.map((row, i) =>
        row.map((cell, j) => (
          <div
            key={`${i}-${j}`}
            className={`${COLORS[cell] || COLORS[0]} rounded-sm`}
            style={{ width: size, height: size }}
            data-testid={`cell-${i}-${j}`}
          />
        ))
      )}
    </div>
  );
}

function PuzzleCard({
  puzzle,
  onAskEva,
  isLoading,
  evaResponse,
  showAnswer,
  onToggleAnswer,
}: {
  puzzle: ARCPuzzle;
  onAskEva: () => void;
  isLoading: boolean;
  evaResponse?: string;
  showAnswer: boolean;
  onToggleAnswer: () => void;
}) {

  return (
    <Card className="mb-6" data-testid={`puzzle-card-${puzzle.id}`}>
      <CardHeader>
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Brain className="h-5 w-5 text-purple-500" />
              {puzzle.name}
            </CardTitle>
            <CardDescription>{puzzle.description}</CardDescription>
          </div>
          <Badge variant="outline">{puzzle.id}</Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        <div>
          <h4 className="text-sm font-medium mb-3 text-muted-foreground">Training Examples</h4>
          <div className="flex flex-wrap gap-6">
            {puzzle.trainingPairs.map((pair, idx) => (
              <div key={idx} className="flex items-center gap-3">
                <div>
                  <div className="text-xs text-muted-foreground mb-1">Input</div>
                  <GridDisplay grid={pair.input} size={24} testId={`grid-${puzzle.id}-train-${idx}-input`} />
                </div>
                <ArrowRight className="h-4 w-4 text-muted-foreground" />
                <div>
                  <div className="text-xs text-muted-foreground mb-1">Output</div>
                  <GridDisplay grid={pair.output} size={24} testId={`grid-${puzzle.id}-train-${idx}-output`} />
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="border-t pt-4">
          <h4 className="text-sm font-medium mb-3 text-muted-foreground">Test Case</h4>
          <div className="flex items-center gap-4 flex-wrap">
            <div>
              <div className="text-xs text-muted-foreground mb-1">Test Input</div>
              <GridDisplay grid={puzzle.testInput} testId={`grid-${puzzle.id}-test-input`} />
            </div>
            <ArrowRight className="h-5 w-5 text-muted-foreground" />
            <div>
              <div className="text-xs text-muted-foreground mb-1">
                {showAnswer ? "Correct Output" : "???"}
              </div>
              {showAnswer ? (
                <GridDisplay grid={puzzle.testOutput} testId={`grid-${puzzle.id}-test-output`} />
              ) : (
                <div
                  className="bg-zinc-800 rounded flex items-center justify-center text-2xl text-muted-foreground"
                  style={{
                    width: puzzle.testOutput[0].length * 32 + 8,
                    height: puzzle.testOutput.length * 32 + 8,
                  }}
                  data-testid={`grid-${puzzle.id}-test-hidden`}
                >
                  ?
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="flex gap-2 flex-wrap">
          <Button
            onClick={onAskEva}
            disabled={isLoading}
            data-testid={`ask-eva-${puzzle.id}`}
          >
            {isLoading ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Eva is thinking...
              </>
            ) : (
              <>
                <Sparkles className="h-4 w-4 mr-2" />
                Ask Eva to Solve
              </>
            )}
          </Button>
          <Button
            variant="outline"
            onClick={onToggleAnswer}
            data-testid={`toggle-answer-${puzzle.id}`}
          >
            {showAnswer ? "Hide Answer" : "Reveal Answer"}
          </Button>
        </div>

        {evaResponse && (
          <div className="bg-purple-500/10 border border-purple-500/30 rounded-lg p-4 mt-4">
            <h4 className="text-sm font-medium text-purple-400 mb-2 flex items-center gap-2">
              <Brain className="h-4 w-4" />
              Eva's Analysis
            </h4>
            <div className="text-sm whitespace-pre-wrap">{evaResponse}</div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export default function ARCPuzzles() {
  const [responses, setResponses] = useState<Record<string, string>>({});
  const [loadingPuzzle, setLoadingPuzzle] = useState<string | null>(null);
  const [showAnswers, setShowAnswers] = useState<Record<string, boolean>>({});

  const solveMutation = useMutation({
    mutationFn: async ({ puzzleId, prompt }: { puzzleId: string; prompt: string }) => {
      setLoadingPuzzle(puzzleId);
      const response = await apiRequest("POST", "/api/chat", {
        message: prompt,
        conversationHistory: [],
      });
      return { puzzleId, data: response };
    },
    onSuccess: async ({ puzzleId, data }) => {
      const json = await data.json();
      setResponses((prev) => ({ ...prev, [puzzleId]: json.response }));
      setLoadingPuzzle(null);
    },
    onError: () => {
      setLoadingPuzzle(null);
    },
  });

  const askEvaToSolve = (puzzle: ARCPuzzle) => {
    const gridToString = (grid: Grid) =>
      grid.map((row) => row.join(" ")).join("\n");

    const prompt = `You are given an ARC (Abstraction and Reasoning Corpus) puzzle. Analyze the training examples to infer the transformation rule, then apply it to the test input.

**Puzzle: ${puzzle.name}**

**Training Examples:**
${puzzle.trainingPairs
  .map(
    (pair, i) => `
Example ${i + 1}:
Input:
${gridToString(pair.input)}

Output:
${gridToString(pair.output)}
`
  )
  .join("\n")}

**Test Input:**
${gridToString(puzzle.testInput)}

**Your task:**
1. Describe the transformation rule you infer from the training examples
2. Apply this rule to the test input
3. Show what you predict the output grid should be

Think step by step about what pattern connects each input to its output.`;

    solveMutation.mutate({ puzzleId: puzzle.id, prompt });
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-4xl mx-auto p-6">
        <div className="flex items-center justify-between mb-8 flex-wrap gap-4">
          <div>
            <h1 className="text-3xl font-bold flex items-center gap-3">
              <Brain className="h-8 w-8 text-purple-500" />
              ARC Puzzles
            </h1>
            <p className="text-muted-foreground mt-1">
              Test Eva's reasoning with Abstraction and Reasoning Corpus puzzles
            </p>
          </div>
          <div className="flex gap-2">
            <Link href="/">
              <Button variant="outline" data-testid="link-home">
                <Home className="h-4 w-4 mr-2" />
                Home
              </Button>
            </Link>
            <Button
              variant="outline"
              onClick={() => {
                setResponses({});
                setShowAnswers({});
              }}
              data-testid="button-reset"
            >
              <RotateCcw className="h-4 w-4 mr-2" />
              Reset All
            </Button>
          </div>
        </div>

        <div className="mb-6 p-4 bg-muted/50 rounded-lg">
          <h3 className="font-medium mb-2">How ARC Puzzles Work</h3>
          <p className="text-sm text-muted-foreground">
            Each puzzle shows training examples (input → output pairs). Your task is to infer the
            transformation rule and predict what the test input should produce. These puzzles test
            abstract reasoning and pattern recognition.
          </p>
          <div className="flex gap-2 mt-3 flex-wrap" data-testid="color-legend">
            {Object.entries(COLORS).map(([num, color]) => (
              <div key={num} className="flex items-center gap-1" data-testid={`legend-color-${num}`}>
                <div className={`w-4 h-4 rounded ${color}`} />
                <span className="text-xs text-muted-foreground">{num}</span>
              </div>
            ))}
          </div>
        </div>

        {puzzles.map((puzzle) => (
          <PuzzleCard
            key={puzzle.id}
            puzzle={puzzle}
            onAskEva={() => askEvaToSolve(puzzle)}
            isLoading={loadingPuzzle === puzzle.id}
            evaResponse={responses[puzzle.id]}
            showAnswer={showAnswers[puzzle.id] || false}
            onToggleAnswer={() => setShowAnswers(prev => ({ ...prev, [puzzle.id]: !prev[puzzle.id] }))}
          />
        ))}
      </div>
    </div>
  );
}
