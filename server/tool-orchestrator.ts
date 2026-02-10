import { scrapeWebPage, searchWeb, learnFromUrl } from './scrapfly';
import { readSourceFile, modifySourceFile, getModifiableFiles } from './self-modify';
import { createGoalPlan, getNextExecutableSubGoal, updateSubGoalStatus, getGoalProgress } from './goal-system';
import { analyzeResponse, recordInsight, generateSelfImprovementPrompt, learnFromRecentActions } from './learning-loop';
import { writeAndVerifyProof, verifyExistingProof, listProofs, readProof, COQ_EXAMPLES } from './coq-prover';
import { db } from './db';
import { evaMemoriesTable, evaActionsTable, type InsertEvaMemory, type InsertEvaAction } from '@shared/schema';

export interface ToolResult {
  success: boolean;
  tool: string;
  result: any;
  error?: string;
  duration: number;
}

export interface OrchestrationPlan {
  id: string;
  objective: string;
  steps: OrchestrationStep[];
  currentStep: number;
  status: 'pending' | 'running' | 'completed' | 'failed';
  results: ToolResult[];
  createdAt: number;
}

export interface OrchestrationStep {
  tool: string;
  params: Record<string, any>;
  dependsOn?: number[];
  condition?: string;
}

const activePlans: Map<string, OrchestrationPlan> = new Map();

export const AVAILABLE_TOOLS = {
  web_search: {
    description: 'Search the web for information',
    params: ['query', 'numResults?'],
    example: { query: 'latest AI research', numResults: 5 }
  },
  web_crawl: {
    description: 'Crawl and extract content from a URL',
    params: ['url', 'extractText?'],
    example: { url: 'https://example.com', extractText: true }
  },
  learn_url: {
    description: 'Learn and extract key facts from a webpage',
    params: ['url'],
    example: { url: 'https://example.com/article' }
  },
  read_code: {
    description: 'Read source code from allowed files',
    params: ['filePath'],
    example: { filePath: 'server/awareness-engine.ts' }
  },
  modify_own_code: {
    description: 'Modify source code in allowed files',
    params: ['filePath', 'oldContent', 'newContent', 'reason'],
    example: { filePath: 'server/awareness-engine.ts', oldContent: 'old code', newContent: 'new code', reason: 'improvement' }
  },
  store_memory: {
    description: 'Store information in long-term memory',
    params: ['content', 'memoryType', 'importance?'],
    example: { content: 'learned fact', memoryType: 'semantic', importance: 0.8 }
  },
  self_improve: {
    description: 'Analyze own recent performance and generate improvement insights',
    params: [],
    example: {}
  },
  decompose_goal: {
    description: 'Break a complex goal into sub-goals',
    params: ['goalId'],
    example: { goalId: 1 }
  },
  execute_chain: {
    description: 'Execute a sequence of tools',
    params: ['objective', 'steps'],
    example: { objective: 'research topic', steps: [] }
  },
  coq_prove: {
    description: 'Write and verify a formal mathematical proof using the Coq proof assistant',
    params: ['name', 'coqCode'],
    example: { name: 'add_comm', coqCode: COQ_EXAMPLES.simple_theorem }
  },
  coq_verify: {
    description: 'Re-verify an existing Coq proof file',
    params: ['fileName'],
    example: { fileName: 'add_comm_123456.v' }
  },
  coq_list: {
    description: 'List all Coq proof files and verification history',
    params: [],
    example: {}
  },
  coq_read: {
    description: 'Read the contents of a Coq proof file',
    params: ['fileName'],
    example: { fileName: 'add_comm_123456.v' }
  }
};

export async function executeTool(
  tool: string,
  params: Record<string, any>
): Promise<ToolResult> {
  const startTime = Date.now();
  
  try {
    let result: any;

    switch (tool) {
      case 'web_search':
        const searchResults = await searchWeb(params.query, params.numResults || 5);
        result = { results: searchResults, count: searchResults.length };
        break;

      case 'web_crawl':
        result = await scrapeWebPage(params.url, { extractText: params.extractText ?? true });
        break;

      case 'learn_url':
        result = await learnFromUrl(params.url);
        if (result.success && result.keyFacts.length > 0) {
          await db.insert(evaMemoriesTable).values({
            content: `Learned from ${params.url}: ${result.summary}`,
            memoryType: 'semantic',
            importance: 0.7,
            embedding: []
          } as any);
        }
        break;

      case 'read_code':
        result = await readSourceFile(params.filePath);
        break;

      case 'modify_own_code':
        result = await modifySourceFile(
          params.filePath,
          params.oldContent,
          params.newContent,
          params.reason
        );
        if (result.success) {
          recordInsight('success', `Self-modified ${params.filePath}`, 0.9);
        }
        break;

      case 'store_memory':
        const [memory] = await db.insert(evaMemoriesTable).values({
          content: params.content,
          memoryType: params.memoryType || 'semantic',
          importance: params.importance || 0.5,
          embedding: []
        } as any).returning();
        result = { stored: true, memoryId: memory.id };
        break;

      case 'self_improve':
        const learningResults = await learnFromRecentActions();
        const improvementPrompt = generateSelfImprovementPrompt();
        result = {
          ...learningResults,
          selfImprovementFocus: improvementPrompt
        };
        break;

      case 'decompose_goal':
        result = { message: 'Use goal system directly via autonomous agent' };
        break;

      case 'execute_chain':
        result = { message: 'Chain execution handled by orchestration plan' };
        break;

      case 'coq_prove':
        result = await writeAndVerifyProof(params.name, params.coqCode);
        if (result.proofComplete) {
          recordInsight('success', `Verified Coq proof: ${params.name}`, 0.9);
        }
        break;

      case 'coq_verify':
        result = await verifyExistingProof(params.fileName);
        break;

      case 'coq_list':
        result = await listProofs();
        break;

      case 'coq_read':
        result = await readProof(params.fileName);
        break;

      default:
        return {
          success: false,
          tool,
          result: null,
          error: `Unknown tool: ${tool}`,
          duration: Date.now() - startTime
        };
    }

    await db.insert(evaActionsTable).values({
      actionType: `tool:${tool}`,
      description: JSON.stringify(params).substring(0, 200),
      triggeredBy: 'orchestrator',
      success: true,
      result: JSON.stringify(result).substring(0, 500)
    } as any);

    return {
      success: true,
      tool,
      result,
      duration: Date.now() - startTime
    };

  } catch (error: any) {
    await db.insert(evaActionsTable).values({
      actionType: `tool:${tool}`,
      description: JSON.stringify(params).substring(0, 200),
      triggeredBy: 'orchestrator',
      success: false,
      result: error.message
    } as any);

    recordInsight('mistake', `Tool ${tool} failed: ${error.message}`, 0.6);

    return {
      success: false,
      tool,
      result: null,
      error: error.message,
      duration: Date.now() - startTime
    };
  }
}

export function createOrchestrationPlan(
  objective: string,
  steps: OrchestrationStep[]
): OrchestrationPlan {
  const plan: OrchestrationPlan = {
    id: `plan-${Date.now()}`,
    objective,
    steps,
    currentStep: 0,
    status: 'pending',
    results: [],
    createdAt: Date.now()
  };

  activePlans.set(plan.id, plan);
  return plan;
}

export async function executeOrchestrationPlan(
  planId: string
): Promise<{ success: boolean; results: ToolResult[] }> {
  const plan = activePlans.get(planId);
  if (!plan) {
    return { success: false, results: [] };
  }

  plan.status = 'running';

  for (let i = 0; i < plan.steps.length; i++) {
    const step = plan.steps[i];
    plan.currentStep = i;

    if (step.dependsOn) {
      const dependenciesMet = step.dependsOn.every(depIndex => {
        const depResult = plan.results[depIndex];
        return depResult && depResult.success;
      });

      if (!dependenciesMet) {
        plan.results.push({
          success: false,
          tool: step.tool,
          result: null,
          error: 'Dependencies not met',
          duration: 0
        });
        continue;
      }
    }

    const resolvedParams = resolveParams(step.params, plan.results);
    const result = await executeTool(step.tool, resolvedParams);
    plan.results.push(result);

    if (!result.success && step.tool !== 'web_search') {
      plan.status = 'failed';
      break;
    }
  }

  if (plan.status !== 'failed') {
    plan.status = 'completed';
  }

  return { success: plan.status === 'completed', results: plan.results };
}

function resolveParams(
  params: Record<string, any>,
  previousResults: ToolResult[]
): Record<string, any> {
  const resolved: Record<string, any> = {};

  for (const [key, value] of Object.entries(params)) {
    if (typeof value === 'string' && value.startsWith('$result.')) {
      const match = value.match(/\$result\.(\d+)\.(.+)/);
      if (match) {
        const resultIndex = parseInt(match[1]);
        const path = match[2].split('.');
        
        if (previousResults[resultIndex]?.success) {
          let val = previousResults[resultIndex].result;
          for (const p of path) {
            val = val?.[p];
          }
          resolved[key] = val;
        }
      }
    } else {
      resolved[key] = value;
    }
  }

  return resolved;
}

export function getActivePlans(): OrchestrationPlan[] {
  return Array.from(activePlans.values());
}

export function getPlan(planId: string): OrchestrationPlan | undefined {
  return activePlans.get(planId);
}

export function parseToolsFromPrompt(text: string): { tool: string; params: Record<string, any> }[] {
  const tools: { tool: string; params: Record<string, any> }[] = [];
  
  const searchMatch = text.match(/search\s+(?:for\s+)?["']?([^"'\n]+)["']?/i);
  if (searchMatch) {
    tools.push({ tool: 'web_search', params: { query: searchMatch[1].trim() } });
  }

  const urlMatch = text.match(/(?:scrape|crawl|read|visit)\s+(?:from\s+)?["']?(https?:\/\/[^\s"']+)["']?/i);
  if (urlMatch) {
    tools.push({ tool: 'web_crawl', params: { url: urlMatch[1] } });
  }

  const learnMatch = text.match(/learn\s+(?:from\s+)?["']?(https?:\/\/[^\s"']+)["']?/i);
  if (learnMatch) {
    tools.push({ tool: 'learn_url', params: { url: learnMatch[1] } });
  }

  const modifyMatch = text.match(/modify\s+(?:my\s+)?(?:code|file)\s+(.+)/i);
  if (modifyMatch) {
    tools.push({ tool: 'read_code', params: { filePath: 'server/awareness-engine.ts' } });
  }

  if (text.match(/reflect|improve|analyze\s+(?:my\s+)?performance/i)) {
    tools.push({ tool: 'self_improve', params: {} });
  }

  const proveMatch = text.match(/(?:prove|verify|check)\s+(?:that\s+)?(.+?)(?:\s+in\s+[Cc]oq)?$/im);
  if (proveMatch && text.match(/\b(?:coq|proof|theorem|lemma|proposition|formal)\b/i)) {
    tools.push({ tool: 'coq_prove', params: { name: 'auto_proof', coqCode: text } });
  }

  if (text.match(/list\s+(?:all\s+)?(?:coq\s+)?proofs/i)) {
    tools.push({ tool: 'coq_list', params: {} });
  }

  return tools;
}
