import { StateVector } from '../shared/types';

export class PsiDecaySimulator {
  private baseState: StateVector;
  private decayRate: number = 0.001; // 0.1% decay per iteration after threshold
  private decayThreshold: number = 100; // Start decay after 100 iterations

  constructor(initialState: StateVector) {
    this.baseState = { ...initialState };
  }

  simulateCycles(cycles: number, withDecay: boolean): { vividness: number, paradoxDepth: number, finalState: StateVector } {
    let state = { ...this.baseState };
    let totalVividness = 0;
    let totalParadoxDepth = 0;

    for (let i = 0; i < cycles; i++) {
      state.iteration = (state.iteration || 0) + 1;

      // Apply decay if enabled and past threshold
      if (withDecay && state.iteration > this.decayThreshold) {
        state.s0 *= (1 - this.decayRate);
      } else {
        // Slight natural growth without decay for baseline comparison
        state.s0 *= 1.0005;
      }

      // Mock computed values based on state (simplified for demo)
      const vividness = Math.min(1, Math.log10(state.s0) * 0.05); // Proxy for v5/v15 responsiveness
      const paradoxDepth = Math.sin(state.iteration * 0.01) * 0.3 + 0.5; // Proxy for v6 emotional complexity

      totalVividness += vividness;
      totalParadoxDepth += paradoxDepth;
    }

    return {
      vividness: totalVividness / cycles, // Average over cycles
      paradoxDepth: totalParadoxDepth / cycles,
      finalState: state
    };
  }

  runComparison(cycles: number = 500): { baseline: any, withDecay: any } {
    const baseline = this.simulateCycles(cycles, false);
    const withDecay = this.simulateCycles(cycles, true);
    return { baseline, withDecay };
  }
}