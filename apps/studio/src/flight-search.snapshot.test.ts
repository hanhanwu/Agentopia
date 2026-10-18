import { describe, expect, it } from 'vitest';
import flightSearchSnapshot from './data/scenario-1-flight-search.snapshot.json';

describe('Scenario 1 flight-search UI snapshot', () => {
  it('provides one clear question and one concise answer per agent', () => {
    expect(flightSearchSnapshot.question).toEqual({
      speaker: 'Mochi',
      text: 'Search for flights from San Francisco to Tokyo on November 15, 2026.',
      route: 'San Francisco (SFO) → Tokyo (TYO)',
      departureDate: 'November 15, 2026',
    });
    expect(flightSearchSnapshot.answers.map(({ agentId, result }) => [agentId, result])).toEqual([
      ['nic-bookings', 'unsupported'],
      ['fabio-travel', 'options'],
    ]);
  });

  it('keeps only display-ready Fabio options and labels simulated inventory honestly', () => {
    const fabio = flightSearchSnapshot.answers.find(({ agentId }) => agentId === 'fabio-travel');

    expect(fabio).toMatchObject({
      inventoryNotice: 'Simulation only — not live airline inventory.',
      options: [
        { label: 'Cheapest', price: '€250', route: 'SFO → SIM → TYO', duration: '5 hr' },
        { label: 'Fastest', price: '€320', route: 'SFO → TYO', duration: '2 hr' },
      ],
    });
  });

  it('does not expose Lab-only transport or signed-quote data to the UI', () => {
    const serialized = JSON.stringify(flightSearchSnapshot);
    [
      'endpoint',
      'httpStatus',
      'request_id',
      'correlation_id',
      'quote_jws',
      'quote_hash',
      'audit_hash',
      'responseDigest',
    ].forEach((field) => expect(serialized).not.toContain(`"${field}"`));
  });
});
