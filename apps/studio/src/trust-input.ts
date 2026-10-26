/** Input rules shared by the form and HTTP bridge; DNS checks stay in the worker. */
export type SubjectType = 'agent' | 'mcp';

export function resolveTrustInput(type: SubjectType, input: string):
  { status: 'ready'; endpoint: string } | { status: 'invalid' | 'unavailable'; message: string } {
  if (type === 'agent') return { status: 'unavailable', message: 'Agent scoring is not available yet.' };
  const identifier = input.trim();
  if (!identifier) return { status: 'invalid', message: 'Enter an MCP endpoint.' };
  if (identifier.length > 2048) return { status: 'invalid', message: 'The MCP endpoint exceeds 2048 characters.' };
  let endpoint: URL;
  try { endpoint = new URL(identifier); } catch {
    return { status: 'invalid', message: 'Enter an HTTP(S) MCP endpoint.' };
  }
  if (!['http:', 'https:'].includes(endpoint.protocol) || endpoint.username || endpoint.password || endpoint.hash || endpoint.port === '0') {
    return { status: 'invalid', message: 'Enter an HTTP(S) MCP endpoint without credentials or a fragment.' };
  }
  return { status: 'ready', endpoint: endpoint.href };
}
