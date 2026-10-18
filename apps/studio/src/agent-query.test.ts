import { describe, expect, it } from 'vitest';
import flightSearchSnapshot from './data/scenario-1-flight-search.snapshot.json';
import { projectAgentQuery } from './agent-query.ts';

describe('Step 8 agent-query projection', () => {
  it('projects the travel agent’s unique A2A and MCP answers with the selected MCP tool', () => {
    const projection = projectAgentQuery(flightSearchSnapshot, 'fabio');

    expect(projection).toMatchObject({
      agentName: 'Travel Service Agent',
      accent: 'violet',
    });
    expect(projection.rows).toEqual([
      {
        protocol: 'A2A', endpoint: 'https://travel.agenthaven.dev/a2a', selectedTool: null,
        heading: 'Found 2 flight options:',
        lines: ['€250 · 1 stop · 5 hr', '€320 · nonstop · 2 hr'],
      },
      {
        protocol: 'MCP', endpoint: 'https://travel.agenthaven.dev/mcp', selectedTool: 'search_flights',
        heading: 'Found 2 flight options:',
        lines: ['€250 · 1 stop · 5 hr', '€320 · nonstop · 2 hr'],
      },
    ]);
  });

  it('keeps the bookings agent’s unsupported endpoint in the same display model', () => {
    expect(projectAgentQuery(flightSearchSnapshot, 'bookings')).toMatchObject({
      agentName: 'Bookings Service Agent',
      accent: 'orange',
      rows: [{
        protocol: 'A2A',
        endpoint: 'https://bookings.darknetian.com/a2a',
        heading: 'Unable to search flights',
        lines: ["I can't search for flights. I can only handle your meeting requests."],
      }],
    });
  });

  it('deduplicates repeated endpoint responses', () => {
    const duplicate = structuredClone(flightSearchSnapshot);
    duplicate.answers[1].responses.push({ ...duplicate.answers[1].responses[0] });
    expect(projectAgentQuery(duplicate, 'fabio').rows).toHaveLength(2);
  });
});
