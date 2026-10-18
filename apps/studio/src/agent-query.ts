export type AgentQueryChoice = 'bookings' | 'fabio';

type FlightSearchSnapshot = {
  question: {
    speaker: string;
    text: string;
    route: string;
    departureDate: string;
  };
  answers: Array<{
    agentId: string;
    agentName: string;
    result: string;
    responses: Array<{
      protocol: string;
      endpoint: string;
      selectedTool?: string;
      answer: string;
    }>;
    options?: Array<{
      price: string;
      duration: string;
      stops: string;
    }>;
  }>;
};

export type AgentQueryRow = {
  protocol: string;
  endpoint: string;
  selectedTool: string | null;
  heading: string;
  lines: string[];
};

export type AgentQueryProjection = {
  choice: AgentQueryChoice;
  agentId: string;
  agentName: string;
  accent: 'orange' | 'violet';
  question: FlightSearchSnapshot['question'];
  rows: AgentQueryRow[];
};

export const projectAgentQuery = (
  snapshot: FlightSearchSnapshot,
  choice: AgentQueryChoice,
): AgentQueryProjection => {
  const agentId = choice === 'fabio' ? 'fabio-travel' : 'nic-bookings';
  const answer = snapshot.answers.find((candidate) => candidate.agentId === agentId);
  if (!answer) throw new Error(`Missing flight-search answer for ${agentId}.`);

  const seenEndpoints = new Set<string>();
  const uniqueResponses = answer.responses.filter(({ endpoint }) => {
    if (seenEndpoints.has(endpoint)) return false;
    seenEndpoints.add(endpoint);
    return true;
  });
  const optionLines = answer.options?.map(({ price, stops, duration }) => (
    `${price} · ${stops.toLowerCase()} · ${duration}`
  ));

  return {
    choice,
    agentId: answer.agentId,
    agentName: answer.agentName,
    accent: choice === 'fabio' ? 'violet' : 'orange',
    question: snapshot.question,
    rows: uniqueResponses.map((response) => ({
      protocol: response.protocol,
      endpoint: response.endpoint,
      selectedTool: response.selectedTool ?? null,
      heading: optionLines ? `Found ${optionLines.length} flight options:` : 'Unable to search flights',
      lines: optionLines ?? [response.answer],
    })),
  };
};
