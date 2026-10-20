import { EventEmitter } from 'node:events';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({ launch: vi.fn(), exists: vi.fn(), spawn: vi.fn() }));
vi.mock('playwright', () => ({ chromium: { launch: mocks.launch, executablePath: () => '/capture/chromium' } }));
vi.mock('node:fs', async (original) => ({ ...await original<typeof import('node:fs')>(), existsSync: mocks.exists }));
vi.mock('node:child_process', () => ({ spawn: mocks.spawn }));
import { launchCaptureBrowser } from './capture-browser.ts';

beforeEach(() => {
  vi.resetAllMocks();
  vi.stubEnv('AGENTOPIA_CHROME_PATH', '');
  mocks.launch.mockResolvedValue({});
  mocks.exists.mockReturnValue(true);
  mocks.spawn.mockImplementation(() => {
    const child = new EventEmitter();
    queueMicrotask(() => child.emit('exit', 0));
    return child;
  });
});
afterEach(() => vi.unstubAllEnvs());

describe('automatic GIF capture browser setup', () => {
  it('uses installed Chrome without a download or setup command', async () => {
    await launchCaptureBrowser(new AbortController().signal);
    expect(mocks.launch).toHaveBeenCalledWith({ headless: true, channel: 'chrome' });
    expect(mocks.spawn).not.toHaveBeenCalled();
  });

  it('falls back to an already downloaded Chromium when Chrome is unavailable', async () => {
    mocks.launch.mockRejectedValueOnce(new Error('Chrome is not installed'));
    await launchCaptureBrowser(new AbortController().signal);
    expect(mocks.launch).toHaveBeenLastCalledWith({ headless: true, executablePath: '/capture/chromium' });
    expect(mocks.spawn).not.toHaveBeenCalled();
  });

  it('downloads Chromium automatically only if no capture browser is available', async () => {
    mocks.launch.mockRejectedValueOnce(new Error('Chrome is not installed'));
    mocks.exists.mockReturnValue(false);
    await launchCaptureBrowser(new AbortController().signal);
    expect(mocks.spawn).toHaveBeenCalledWith(process.execPath, [expect.stringMatching(/cli\.js$/), 'install', '--no-shell', 'chromium'], expect.objectContaining({ signal: expect.any(AbortSignal) }));
    expect(mocks.launch).toHaveBeenLastCalledWith({ headless: true, executablePath: '/capture/chromium' });
  });

  it('lets a failed download be retried without requiring another command', async () => {
    mocks.launch.mockRejectedValueOnce(new Error('Chrome is not installed'));
    mocks.exists.mockReturnValue(false);
    mocks.spawn.mockImplementationOnce(() => {
      const child = new EventEmitter();
      queueMicrotask(() => child.emit('exit', 1));
      return child;
    });
    const output = vi.spyOn(console, 'error').mockImplementation(() => {});
    try {
      await expect(launchCaptureBrowser(new AbortController().signal)).rejects.toThrow('Check network access and retry');
      mocks.launch.mockRejectedValueOnce(new Error('Chrome is not installed'));
      await expect(launchCaptureBrowser(new AbortController().signal)).resolves.toBeDefined();
      expect(mocks.spawn).toHaveBeenCalledTimes(2);
    } finally { output.mockRestore(); }
  });

  it('does not launch or install a browser for a cancelled export', async () => {
    const abort = new AbortController();
    abort.abort();
    await expect(launchCaptureBrowser(abort.signal)).rejects.toThrow();
    expect(mocks.launch).not.toHaveBeenCalled();
    expect(mocks.spawn).not.toHaveBeenCalled();
  });
});
