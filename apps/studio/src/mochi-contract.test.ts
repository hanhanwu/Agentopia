import { describe, expect, it } from 'vitest';
import { parseChatRequest, parseChatResponse, MAX_MESSAGE_LENGTH } from './mochi-contract.ts';

describe('public chat wire contract', () => {
  it('allowlists request and response fields and normalizes user messages', () => {
    expect(parseChatRequest({ session_id: 'synthetic-session-reference', message: ' hello ', history: 'untrusted' }))
      .toEqual({ session_id: 'synthetic-session-reference', message: 'hello' });
    expect(parseChatResponse({ session_id: 'synthetic-session-reference', reply: 'Example reply.', extra: 'untrusted' }))
      .toEqual({ session_id: 'synthetic-session-reference', reply: 'Example reply.' });
  });
  it('rejects malformed session data instead of treating it as a new conversation', () => {
    for (const session_id of [null, {}, '', 'short']) {
      expect(() => parseChatRequest({ session_id, export_id: 'synthetic-export-reference', message: 'hello' })).toThrow();
    }
    expect(() => parseChatRequest({ session_id: 'synthetic-session-reference', message: 'x'.repeat(MAX_MESSAGE_LENGTH + 1) })).toThrow();
  });
});
