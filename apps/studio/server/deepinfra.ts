import { loadEnv } from 'vite';
import { LocalAPIError } from './local-api.ts';

export type DeepInfraConfig = { model: string; apiKey: string; maxAttempts?: 1 | 2 };
export type DeepInfraMessage = { role: 'system' | 'user' | 'assistant'; content: string };

export function loadDeepInfraConfig(root: string | false, mode = 'development'): DeepInfraConfig {
  // Load credentials only on the server; never expose this object to Vite's client env.
  const env = root === false ? process.env : loadEnv(mode, root, '');
  return { model: env.LLM_MODEL?.trim() ?? '', apiKey: env.deepinfra_api_key?.trim() ?? '',
    maxAttempts: env.DEEPINFRA_REASON_RETRIES === '1' ? 2 : 1 };
}

async function boundedJSON(response: Response): Promise<unknown> {
  if (!response.body) throw new Error('Empty response');
  const reader = response.body.getReader();
  const chunks: Uint8Array[] = []; let size = 0;
  try {
    while (true) {
      const { done, value } = await reader.read(); if (done) break;
      size += value.length;
      if (size > 65536) { await reader.cancel(); throw new Error('Oversized response'); }
      chunks.push(value);
    }
    return JSON.parse(Buffer.concat(chunks).toString('utf8'));
  } finally { reader.releaseLock(); }
}

/** One bounded provider request; callers own deadlines, validation and any retry policy. */
export async function requestDeepInfraJSON(config: DeepInfraConfig, messages: DeepInfraMessage[],
  signal: AbortSignal, maxTokens: number, failureMessage: string, fetcher: typeof fetch = fetch): Promise<unknown> {
  signal.throwIfAborted();
  const response = await fetcher('https://api.deepinfra.com/v1/openai/chat/completions', {
    method: 'POST', signal, redirect: 'error',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${config.apiKey}` },
    body: JSON.stringify({ model: config.model, temperature: 0, max_tokens: maxTokens,
      response_format: { type: 'json_object' }, messages }),
  });
  if (!response.ok) {
    await response.body?.cancel();
    throw new LocalAPIError(502, failureMessage);
  }
  return boundedJSON(response);
}
