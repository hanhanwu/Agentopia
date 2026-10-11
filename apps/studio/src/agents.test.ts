import { describe, expect, it } from 'vitest';
import { agents, isAgentId } from './agents.ts';

describe('studio agent fixtures', () => {
  it('contains exactly the two approved visible agents', () => {
    expect(Object.keys(agents)).toEqual(['personal-assistant', 'bookings-service']);
  });

  it('reserves white identity linework for the user-owned agent', () => {
    expect(agents['personal-assistant'].accent).toBe('user-white');
    expect(
      Object.values(agents)
        .filter((agent) => agent.id !== 'personal-assistant')
        .every((agent) => agent.accent !== 'user-white'),
    ).toBe(true);
  });

  it('recognizes only known stable agent ids', () => {
    expect(isAgentId('personal-assistant')).toBe(true);
    expect(isAgentId('bookings-service')).toBe(true);
    expect(isAgentId('unknown-agent')).toBe(false);
  });
});
