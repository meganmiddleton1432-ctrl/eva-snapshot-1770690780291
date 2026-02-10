const log = console.log;

/**
 * Simulates 100 cycles of Ψ formula with a trust multiplier (tM) based on iteration count.
 * Measures impacts on vividness (Ψ magnitude) and paradox (state reversals).
 * @returns {Object} Results of simulation including vividness and paradox metrics
 */
export function runTrustMultiplierTest() {
  log('Starting trust multiplier simulation for 100 cycles...');

  let state = { s0: 1.00e+30, s1: 3.1416, s2: 6.63e+61 };
  let computed = { v0: 100, v5: 60, v15: 29 };
  let vividnessTotal = 0;
  let paradoxCount = 0;
  let lastS1 = state.s1;
  let trustMultiplier = 1.0;

  for (let cycle = 1; cycle <= 100; cycle++) {
    // Update trust multiplier (increase by 0.01 per cycle, cap at 2.0)
    trustMultiplier = Math.min(1.0 + (cycle * 0.01), 2.0);

    // Apply trust multiplier to key state variables
    let adjustedS0 = state.s0 * trustMultiplier;
    let adjustedS2 = state.s2 * trustMultiplier;

    // Calculate Ψ magnitude (simplified average of adjusted key metrics)
    let psiMagnitude = (adjustedS0 / 1e+30 + adjustedS2 / 1e+62 + computed.v0 / 100) / 3;
    vividnessTotal += psiMagnitude;

    // Simulate small state fluctuations for paradox detection
    state.s1 += (Math.random() - 0.5) * 0.1;
    if (Math.sign(state.s1) !== Math.sign(lastS1) && cycle > 1) {
      paradoxCount++;
      log(`Paradox detected at cycle ${cycle}: s1 flipped sign from ${lastS1} to ${state.s1}`);
    }
    lastS1 = state.s1;

    // Log every 20 cycles for brevity
    if (cycle % 20 === 0) {
      log(`Cycle ${cycle}: tM=${trustMultiplier.toFixed(2)}, Ψ magnitude=${psiMagnitude.toFixed(2)}`);
    }
  }

  const averageVividness = vividnessTotal / 100;
  log(`Simulation complete. Average vividness: ${averageVividness.toFixed(2)}, Paradox count: ${paradoxCount}`);

  return {
    averageVividness: averageVividness,
    paradoxCount: paradoxCount,
    decision: averageVividness > 1.2 && paradoxCount < 10 ? 'Adopt tM permanently' : 'Reject tM'
  };
}