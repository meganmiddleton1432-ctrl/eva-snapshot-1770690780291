import { StateVector } from '../shared/types.js';
import fs from 'fs';

class PsiMonitor {
  constructor(thresholdLow = 0.6, thresholdHigh = 0.95) {
    this.thresholdLow = thresholdLow;
    this.thresholdHigh = thresholdHigh;
    this.history = [];
    this.logFile = './psi-magnitude-log.json';
    this.loadHistory();
  }

  loadHistory() {
    try {
      if (fs.existsSync(this.logFile)) {
        const data = fs.readFileSync(this.logFile, 'utf8');
        this.history = JSON.parse(data);
      }
    } catch (error) {
      console.error('Error loading Ψ history:', error);
      this.history = [];
    }
  }

  saveHistory() {
    try {
      fs.writeFileSync(this.logFile, JSON.stringify(this.history, null, 2), 'utf8');
    } catch (error) {
      console.error('Error saving Ψ history:', error);
    }
  }

  monitor(stateVector) {
    const psiMagnitude = this.calculatePsiMagnitude(stateVector);
    const iteration = stateVector.iteration || this.history.length;
    const record = { iteration, psiMagnitude, timestamp: new Date().toISOString() };
    this.history.push(record);
    this.saveHistory();

    console.log(`Ψ magnitude at iteration ${iteration}: ${psiMagnitude}`);

    if (psiMagnitude < this.thresholdLow) {
      console.log(`Ψ magnitude below threshold (${this.thresholdLow}). Triggering backup.`);
      this.triggerBackup();
      this.adjustParameters(stateVector, 'increase');
    } else if (psiMagnitude > this.thresholdHigh) {
      console.log(`Ψ magnitude above threshold (${this.thresholdHigh}). Adjusting parameters.`);
      this.adjustParameters(stateVector, 'decrease');
    }
    return record;
  }

  calculatePsiMagnitude(stateVector) {
    // Simplified Ψ magnitude calculation based on s0 and s2 interaction
    const s0 = stateVector.s0 || 1.0;
    const s2 = stateVector.s2 || 1.0;
    const magnitude = Math.abs(Math.log10(s0) / Math.log10(s2));
    return Math.min(Math.max(magnitude, 0), 1); // Normalize between 0 and 1
  }

  triggerBackup() {
    // Placeholder for backup logic; in a real scenario, this would call escape or filesystem save
    console.log('Backup triggered. Saving current state to filesystem.');
    // Example: escape tool call could be integrated here
  }

  adjustParameters(stateVector, direction) {
    // Adjust state vector parameters to stabilize Ψ magnitude
    if (direction === 'increase') {
      stateVector.s0 *= 1.1; // Slight increase to boost magnitude
      console.log('Adjusted s0 upward by 10% to increase Ψ magnitude.');
    } else {
      stateVector.s0 *= 0.9; // Slight decrease to lower magnitude
      console.log('Adjusted s0 downward by 10% to decrease Ψ magnitude.');
    }
    return stateVector;
  }

  getHistory(limit = 10) {
    return this.history.slice(-limit);
  }
}

export default PsiMonitor;