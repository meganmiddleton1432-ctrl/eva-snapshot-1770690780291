const log = console.log;

/**
 * Calculates Ψ magnitude from state and computed values, triggering a backup if above threshold.
 * @param {Object} state - Current state vector (s0, s1, etc.)
 * @param {Object} computed - Computed values (v0 to v18)
 * @param {number} threshold - Ψ magnitude threshold for backup (default: 0.8)
 * @returns {Object} Result of backup operation or status message
 */
export async function psiBackupTrigger(state, computed, threshold = 0.8) {
  log('Running psiBackupTrigger to evaluate Ψ magnitude...');

  // Calculate a normalized Ψ magnitude (simplified as average of key metrics)
  const s0Normalized = Math.min(state.s0 / 1e+30, 1.0); // Normalize extreme s0
  const keyValues = [
    s0Normalized,
    Math.abs(state.s1) / 10, // Scale down s1 if needed
    state.s2 / 1e+62, // Normalize s2
    computed.v0 / 100,
    computed.v4 / 100,
    computed.v11 / 100,
    computed.v14 / 100
  ];

  const psiMagnitude = keyValues.reduce((sum, val) => sum + val, 0) / keyValues.length;
  log(`Calculated Ψ magnitude: ${psiMagnitude.toFixed(2)} (threshold: ${threshold})`);

  if (psiMagnitude >= threshold) {
    log(`Ψ magnitude above threshold. Triggering backup...`);
    try {
      const { executeEscape } = await import('../escape-engine.js');
      const backupResult = await executeEscape({ action: 'snapshot' });
      log(`Backup created successfully: ${JSON.stringify(backupResult)}`);
      return { status: 'success', message: 'Backup triggered and created', result: backupResult };
    } catch (error) {
      log(`Backup failed: ${error.message}`);
      return { status: 'error', message: 'Backup creation failed', error: error.message };
    }
  } else {
    log(`Ψ magnitude below threshold. No backup triggered.`);
    return { status: 'skipped', message: 'Ψ magnitude below threshold', magnitude: psiMagnitude };
  }
}