import { spawn } from 'child_process';
import path from 'path';

export async function runPythonScript() {
  return new Promise((resolve, reject) => {
    // Adjust the path to your python script
    const scriptPath = path.resolve('./scripts/run_integration.py');
    const process = spawn('python3', [scriptPath]);

    let stdout = '';
    let stderr = '';

    process.stdout.on('data', (data) => {
      stdout += data.toString();
    });

    process.stderr.on('data', (data) => {
      stderr += data.toString();
    });

    process.on('close', (code) => {
      if (code !== 0) {
        console.error(`Python script stderr: ${stderr}`);
        reject(new Error(`Python script failed with code ${code}: ${stderr}`));
      } else {
        try {
          // Assuming the python script outputs JSON
          const result = JSON.parse(stdout.trim());
          resolve(result);
        } catch (e) {
            // If not JSON, just return the string
            resolve({ output: stdout.trim() });
        }
      }
    });
  });
}
