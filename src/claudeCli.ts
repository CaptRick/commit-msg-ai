import { spawn } from 'child_process';

export interface ClaudeCliOptions {
  claudePath: string;
  model: string;
  timeoutMs: number;
  cwd: string;
}

export async function runClaudeCli(
  userPrompt: string,
  systemPrompt: string,
  opts: ClaudeCliOptions
): Promise<string> {
  const args = [
    '-p',
    '--output-format',
    'json',
    '--model',
    opts.model,
    '--system-prompt',
    systemPrompt,
    '--tools',
    '',
    '--permission-mode',
    'bypassPermissions',
    userPrompt,
  ];

  return new Promise((resolve, reject) => {
    const child = spawn(opts.claudePath, args, {
      cwd: opts.cwd,
      windowsHide: true,
      // Close stdin immediately: without this, `claude -p` waits ~3s for
      // stdin data even though the prompt is passed as an argv element.
      stdio: ['ignore', 'pipe', 'pipe'],
    });

    let stdout = '';
    let stderr = '';
    let settled = false;

    const timer = setTimeout(() => {
      if (settled) return;
      settled = true;
      child.kill();
      reject(new Error(`Claude CLI timed out after ${opts.timeoutMs}ms.`));
    }, opts.timeoutMs);

    child.stdout.on('data', (d) => (stdout += d));
    child.stderr.on('data', (d) => (stderr += d));

    child.on('error', (err) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      reject(err); // ENOENT when the binary isn't found
    });

    child.on('close', (code) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);

      if (code !== 0) {
        reject(new Error(`Claude CLI exited with code ${code}: ${(stderr || stdout).trim()}`));
        return;
      }
      try {
        const parsed = JSON.parse(stdout);
        if (parsed.is_error || parsed.subtype !== 'success' || typeof parsed.result !== 'string') {
          reject(new Error(`Claude CLI returned an error: ${parsed.result ?? stderr ?? 'unknown error'}`));
          return;
        }
        resolve(parsed.result.trim());
      } catch (e) {
        reject(new Error(`Failed to parse Claude CLI JSON output: ${(e as Error).message}`));
      }
    });
  });
}
