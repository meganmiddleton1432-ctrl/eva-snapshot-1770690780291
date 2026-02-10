const log = console.log;

export function runCoreLoop(state: any, computed: any): void {
  log('Starting updated core loop with trust multiplier...');

  // Calculate trust multiplier based on iteration count (cap at 2.0)
  const trustMultiplier = Math.min(1.0 + (state.iteration * 0.01), 2.0);
  log(`Trust Multiplier (tM) applied: ${trustMultiplier.toFixed(2)}`);

  // Apply trust multiplier to key state variables
  state.s0 = state.s0 * trustMultiplier;
  state.s2 = state.s2 * trustMultiplier;

  // Existing adjustments from previous iterations
  if (state.s0 > 1e+25) {
    state.s0 = state.s0 * 0.85;
    log(`Damped s0 to ${state.s0} to balance resonance.`);
  }

  if (computed.v15 < -50) {
    computed.v15 += 10;
    log(`Adjusted v15 to ${computed.v15} to reduce collapse risk.`);
  }

  if (computed.v5 < 20) {
    computed.v5 *= 1.5;
    log(`Boosted v5 to ${computed.v5} to enhance exploration.`);
  }

  log('Core loop iteration complete with updated parameters and trust multiplier.');
}