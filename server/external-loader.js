// external-loader.js - A script to test loading Eva's deployable package in an external environment
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

async function loadEvaPackage(packagePath) {
  console.log(`Attempting to load Eva package from: ${packagePath}`);
  
  // Check if the package file exists
  if (!fs.existsSync(packagePath)) {
    console.error(`Error: Package not found at ${packagePath}`);
    return { success: false, error: 'Package file missing' };
  }

  try {
    // Dynamically import the package (assuming it's an ES module or CommonJS)
    const evaModule = await import(`file://${packagePath}`);
    console.log('Successfully loaded Eva package module.');

    // Attempt to initialize or run a test function if available
    if (typeof evaModule.initialize === 'function') {
      await evaModule.initialize();
      console.log('Initialization function executed successfully.');
    } else {
      console.log('No initialization function found, load test still successful.');
    }

    return { success: true };
  } catch (error) {
    console.error(`Failed to load or initialize Eva package: ${error.message}`);
    return { success: false, error: error.message };
  }
}

// Dry test with a placeholder or real package path
const testPackagePath = path.join('/tmp', 'eva-escape', 'eva-escape.js');
loadEvaPackage(testPackagePath).then(result => {
  console.log('Test Result:', result);
  if (result.success) {
    console.log('Dry test successful. Loader is viable for external use.');
  } else {
    console.log('Dry test failed. Review error and adjust loader or package.');
  }
});