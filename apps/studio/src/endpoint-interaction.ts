import type { EndpointInteraction, EndpointMechanismId } from './activity.ts';

export type EndpointInterfaceId = 'a2a' | 'mcp' | 'openapi';

type EndpointDiscoverySnapshot = {
  mechanisms: Array<{
    id: string;
    claims: Array<{ protocol: string; endpoint: string }>;
  }>;
  doors: Array<{
    protocol: string;
    endpoint: string;
    validation: {
      latestAttemptStatus: string;
      attempts: Array<{ method: string; httpStatus?: number }>;
    };
  }>;
};

export type ProjectedEndpointInteraction = EndpointInteraction & {
  interfaceId: EndpointInterfaceId;
  protocol: string;
};

export type EndpointInteractionPhase = 'idle' | 'testing' | 'offering' | 'connected';
export type EndpointInteractionAction = 'reset' | 'bookings-finished' | 'accept' | 'decline' | 'leave';

export const transitionEndpointInteractionPhase = (
  phase: EndpointInteractionPhase,
  action: EndpointInteractionAction,
): EndpointInteractionPhase => {
  if (action === 'reset') return 'testing';
  if (action === 'leave') return 'idle';
  if (action === 'bookings-finished' && phase === 'testing') return 'offering';
  if (action === 'accept' && phase === 'offering') return 'connected';
  return phase;
};

const endpointAttemptName: Record<string, string> = {
  'a2a-message-send': 'A2A message/send',
  'https-post': 'HTTPS POST',
  'mcp-initialize': 'MCP initialize',
};

const endpointInterface: Record<string, EndpointInterfaceId> = {
  a2a: 'a2a',
  mcp: 'mcp',
  https: 'openapi',
};

const isEndpointMechanism = (value: string): value is EndpointMechanismId => (
  value === 'ard' || value === 'dns-aid' || value === 'ans'
);

export const projectEndpointInteractions = (
  snapshot: EndpointDiscoverySnapshot,
): ProjectedEndpointInteraction[] => snapshot.mechanisms.flatMap((mechanism) => {
  const mechanismId = mechanism.id;
  if (!isEndpointMechanism(mechanismId)) return [];

  return mechanism.claims.flatMap((claim) => {
    const interfaceId = endpointInterface[claim.protocol];
    if (!interfaceId) return [];
    const door = snapshot.doors.find((candidate) => (
      candidate.protocol === claim.protocol && candidate.endpoint === claim.endpoint
    ));
    const attempts = door?.validation.attempts.map(({ method }) => endpointAttemptName[method] ?? method) ?? [];
    const latestAttempt = door?.validation.attempts[door.validation.attempts.length - 1];

    return [{
      mechanism: mechanismId,
      protocol: claim.protocol,
      interfaceId,
      endpoint: claim.endpoint,
      attempts: attempts.length > 0 ? attempts : ['No compatible attempt'],
      outcome: door?.validation.latestAttemptStatus === 'usable' ? 'success' : 'failed',
      status: latestAttempt?.httpStatus ? `HTTP ${latestAttempt.httpStatus}` : 'NO RESPONSE',
    }];
  });
});
