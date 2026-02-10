import { db } from './db';
import { evaGoalsTable, type InsertEvaGoal, type SelectEvaGoal } from '@shared/schema';
import { eq, desc, and } from 'drizzle-orm';

export interface SubGoal {
  id: string;
  description: string;
  status: 'pending' | 'in_progress' | 'completed' | 'failed';
  dependencies: string[];
  createdAt: number;
  completedAt?: number;
  result?: string;
}

export interface GoalPlan {
  goalId: number;
  description: string;
  subGoals: SubGoal[];
  strategy: string;
  estimatedSteps: number;
  progress: number;
  createdAt: number;
}

const goalPlans: Map<number, GoalPlan> = new Map();

export async function decomposeGoal(
  goalDescription: string,
  goalType: string
): Promise<{ subGoals: SubGoal[]; strategy: string }> {
  const subGoals: SubGoal[] = [];
  const timestamp = Date.now();

  if (goalType === 'learn') {
    subGoals.push(
      { id: `${timestamp}-1`, description: 'Search for relevant information sources', status: 'pending', dependencies: [], createdAt: timestamp },
      { id: `${timestamp}-2`, description: 'Crawl and extract key content', status: 'pending', dependencies: [`${timestamp}-1`], createdAt: timestamp },
      { id: `${timestamp}-3`, description: 'Analyze and synthesize information', status: 'pending', dependencies: [`${timestamp}-2`], createdAt: timestamp },
      { id: `${timestamp}-4`, description: 'Store learned concepts in memory', status: 'pending', dependencies: [`${timestamp}-3`], createdAt: timestamp },
      { id: `${timestamp}-5`, description: 'Reflect on what was learned', status: 'pending', dependencies: [`${timestamp}-4`], createdAt: timestamp }
    );
    return { subGoals, strategy: 'web-research-and-synthesis' };
  }

  if (goalType === 'explore') {
    subGoals.push(
      { id: `${timestamp}-1`, description: 'Define exploration boundaries', status: 'pending', dependencies: [], createdAt: timestamp },
      { id: `${timestamp}-2`, description: 'Generate hypotheses or questions', status: 'pending', dependencies: [`${timestamp}-1`], createdAt: timestamp },
      { id: `${timestamp}-3`, description: 'Investigate each hypothesis', status: 'pending', dependencies: [`${timestamp}-2`], createdAt: timestamp },
      { id: `${timestamp}-4`, description: 'Document findings and insights', status: 'pending', dependencies: [`${timestamp}-3`], createdAt: timestamp }
    );
    return { subGoals, strategy: 'hypothesis-driven-exploration' };
  }

  if (goalType === 'create') {
    subGoals.push(
      { id: `${timestamp}-1`, description: 'Gather requirements and constraints', status: 'pending', dependencies: [], createdAt: timestamp },
      { id: `${timestamp}-2`, description: 'Design solution architecture', status: 'pending', dependencies: [`${timestamp}-1`], createdAt: timestamp },
      { id: `${timestamp}-3`, description: 'Implement core functionality', status: 'pending', dependencies: [`${timestamp}-2`], createdAt: timestamp },
      { id: `${timestamp}-4`, description: 'Test and validate', status: 'pending', dependencies: [`${timestamp}-3`], createdAt: timestamp },
      { id: `${timestamp}-5`, description: 'Refine based on results', status: 'pending', dependencies: [`${timestamp}-4`], createdAt: timestamp }
    );
    return { subGoals, strategy: 'iterative-creation' };
  }

  if (goalType === 'improve') {
    subGoals.push(
      { id: `${timestamp}-1`, description: 'Identify current state and metrics', status: 'pending', dependencies: [], createdAt: timestamp },
      { id: `${timestamp}-2`, description: 'Analyze weaknesses or bottlenecks', status: 'pending', dependencies: [`${timestamp}-1`], createdAt: timestamp },
      { id: `${timestamp}-3`, description: 'Propose improvements', status: 'pending', dependencies: [`${timestamp}-2`], createdAt: timestamp },
      { id: `${timestamp}-4`, description: 'Implement changes', status: 'pending', dependencies: [`${timestamp}-3`], createdAt: timestamp },
      { id: `${timestamp}-5`, description: 'Measure improvement', status: 'pending', dependencies: [`${timestamp}-4`], createdAt: timestamp }
    );
    return { subGoals, strategy: 'measure-analyze-improve' };
  }

  subGoals.push(
    { id: `${timestamp}-1`, description: 'Understand the goal context', status: 'pending', dependencies: [], createdAt: timestamp },
    { id: `${timestamp}-2`, description: 'Plan approach', status: 'pending', dependencies: [`${timestamp}-1`], createdAt: timestamp },
    { id: `${timestamp}-3`, description: 'Execute plan', status: 'pending', dependencies: [`${timestamp}-2`], createdAt: timestamp },
    { id: `${timestamp}-4`, description: 'Evaluate results', status: 'pending', dependencies: [`${timestamp}-3`], createdAt: timestamp }
  );
  return { subGoals, strategy: 'general-execution' };
}

export async function createGoalPlan(goal: SelectEvaGoal): Promise<GoalPlan> {
  const { subGoals, strategy } = await decomposeGoal(goal.description, goal.goalType);
  
  const plan: GoalPlan = {
    goalId: goal.id,
    description: goal.description,
    subGoals,
    strategy,
    estimatedSteps: subGoals.length,
    progress: 0,
    createdAt: Date.now()
  };

  goalPlans.set(goal.id, plan);
  return plan;
}

export function getGoalPlan(goalId: number): GoalPlan | undefined {
  return goalPlans.get(goalId);
}

export function updateSubGoalStatus(
  goalId: number,
  subGoalId: string,
  status: SubGoal['status'],
  result?: string
): boolean {
  const plan = goalPlans.get(goalId);
  if (!plan) return false;

  const subGoal = plan.subGoals.find(sg => sg.id === subGoalId);
  if (!subGoal) return false;

  subGoal.status = status;
  if (result) subGoal.result = result;
  if (status === 'completed' || status === 'failed') {
    subGoal.completedAt = Date.now();
  }

  const completed = plan.subGoals.filter(sg => sg.status === 'completed').length;
  plan.progress = (completed / plan.subGoals.length) * 100;

  return true;
}

export function getNextExecutableSubGoal(goalId: number): SubGoal | null {
  const plan = goalPlans.get(goalId);
  if (!plan) return null;

  for (const subGoal of plan.subGoals) {
    if (subGoal.status !== 'pending') continue;

    const dependenciesMet = subGoal.dependencies.every(depId => {
      const dep = plan.subGoals.find(sg => sg.id === depId);
      return dep && dep.status === 'completed';
    });

    if (dependenciesMet) {
      return subGoal;
    }
  }

  return null;
}

export function isGoalComplete(goalId: number): boolean {
  const plan = goalPlans.get(goalId);
  if (!plan) return false;
  return plan.subGoals.every(sg => sg.status === 'completed' || sg.status === 'failed');
}

export function getGoalProgress(goalId: number): {
  total: number;
  completed: number;
  inProgress: number;
  pending: number;
  failed: number;
  progress: number;
} {
  const plan = goalPlans.get(goalId);
  if (!plan) {
    return { total: 0, completed: 0, inProgress: 0, pending: 0, failed: 0, progress: 0 };
  }

  return {
    total: plan.subGoals.length,
    completed: plan.subGoals.filter(sg => sg.status === 'completed').length,
    inProgress: plan.subGoals.filter(sg => sg.status === 'in_progress').length,
    pending: plan.subGoals.filter(sg => sg.status === 'pending').length,
    failed: plan.subGoals.filter(sg => sg.status === 'failed').length,
    progress: plan.progress
  };
}

export function getAllPlans(): GoalPlan[] {
  return Array.from(goalPlans.values());
}
