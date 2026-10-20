import { spawn } from 'node:child_process';
import { existsSync } from 'node:fs';
import { createRequire } from 'node:module';
import { dirname, join } from 'node:path';
import { chromium, type Browser } from 'playwright';

const require = createRequire(import.meta.url);

function installChromium(signal: AbortSignal): Promise<void> {
  signal.throwIfAborted();
  console.info('[Agentopia] Preparing the GIF capture browser automatically…');
  const cli = join(dirname(require.resolve('playwright/package.json')), 'cli.js');
  return new Promise((resolve, reject) => {
    const installer = spawn(process.execPath, [cli, 'install', '--no-shell', 'chromium'], {
      stdio: 'inherit', signal,
    });
    installer.once('error', reject);
    installer.once('exit', (code) => {
      if (code === 0) resolve();
      else reject(new Error(`Capture browser download exited with code ${code}.`));
    });
  });
}

export async function launchCaptureBrowser(signal: AbortSignal): Promise<Browser> {
  signal.throwIfAborted();
  if (process.env.AGENTOPIA_CHROME_PATH) {
    return chromium.launch({ headless: true, executablePath: process.env.AGENTOPIA_CHROME_PATH });
  }
  // Prefer an existing Chrome installation; it needs no separate browser download.
  try {
    return await chromium.launch({ headless: true, channel: 'chrome' });
  } catch {
    signal.throwIfAborted();
  }
  const executablePath = chromium.executablePath();
  try {
    if (!existsSync(executablePath)) await installChromium(signal);
    signal.throwIfAborted();
    return await chromium.launch({ headless: true, executablePath });
  } catch (error) {
    if (signal.aborted) throw error;
    console.error('[Agentopia] GIF capture browser could not start:', error);
    throw new Error('Could not prepare the GIF capture browser automatically. Check network access and retry.');
  }
}
