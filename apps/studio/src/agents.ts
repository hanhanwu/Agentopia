export type AgentId = 'personal-assistant' | 'bookings-service';
export type AgentAccent = 'user-white' | 'orange';

export type Agent = {
  id: AgentId;
  name: string;
  role: string;
  shortRole: string;
  status: string;
  description: string;
  location: string;
  accent: AgentAccent;
};

export const agents: Record<AgentId, Agent> = {
  'personal-assistant': {
    id: 'personal-assistant',
    name: 'Mochi',
    role: 'Your personal assistant',
    shortRole: 'Personal Agent',
    status: 'Ready for a task',
    description: 'Works on your behalf and asks before taking consequential actions.',
    location: 'Town square',
    accent: 'user-white',
  },
  'bookings-service': {
    id: 'bookings-service',
    name: 'Bookings',
    role: 'Meeting scheduling agent',
    shortRole: 'Service Agent',
    status: 'Reported by AgentCensus',
    description: 'Publishes meeting-scheduling capabilities through discovery metadata.',
    location: 'bookings.darknetian.com',
    accent: 'orange',
  },
};

export const isAgentId = (value: string | undefined): value is AgentId =>
  value === 'personal-assistant' || value === 'bookings-service';
