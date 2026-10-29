/** Public conversation wire contract, shared by the client and API adapter. */
export const MAX_MESSAGE_LENGTH = 2000;
const MAX_REPLY_LENGTH = 6000;
export type ChatRequest = { export_id: string } | { session_id: string; message: string };
export type ChatResponse = { session_id: string; reply: string };

export const isOpaqueReference = (value: unknown): value is string =>
  typeof value === 'string' && /^[a-zA-Z0-9_-]{16,128}$/u.test(value);
const record = (value: unknown): value is Record<string, unknown> =>
  !!value && typeof value === 'object' && !Array.isArray(value);

export function parseChatRequest(value: unknown): ChatRequest {
  if (!record(value)) throw new Error('Invalid conversation request.');
  if (value.session_id !== undefined) {
    if (!isOpaqueReference(value.session_id) || typeof value.message !== 'string'
        || !value.message.trim() || value.message.length > MAX_MESSAGE_LENGTH) throw new Error('Invalid message.');
    return { session_id: value.session_id, message: value.message.trim() };
  }
  if (!isOpaqueReference(value.export_id)) throw new Error('Invalid assessment reference.');
  return { export_id: value.export_id };
}

export function parseChatResponse(value: unknown): ChatResponse {
  if (!record(value) || !isOpaqueReference(value.session_id) || typeof value.reply !== 'string'
      || !value.reply.trim() || value.reply.length > MAX_REPLY_LENGTH) throw new Error('Invalid chat response.');
  return { session_id: value.session_id, reply: value.reply };
}
