# Game Scenarios

## Game Scenario 1 — One Agent, Different Doors

### Story goal

Show how Mochi finds one agent, discovers different endpoint claims for it, and
learns that a published endpoint is not necessarily an interactive endpoint.

### Example

Use the **Bookings** agent at `bookings.darknetian.com`, which can be found
through AgentCensus for meeting scheduling.

Its discovery mechanisms currently advertise different paths:

| Mechanism | Advertised endpoint | Interface |
|---|---|---|
| ARD | `https://bookings.darknetian.com/a2a` | A2A |
| ARD | `https://bookings.darknetian.com/mcp` | MCP |
| ARD | `https://bookings.darknetian.com/ask` | HTTPS |
| DNS-AID | `https://bookings.darknetian.com/` | Claims MCP |
| ANS | `https://bookings.darknetian.com/` | Claims MCP |

### Scenario steps

1. **The user asks for help**  
   The user asks Mochi to find an agent that can schedule a meeting.

2. **Mochi searches agent registries**  
   Agentopia shows Mochi searching sources such as AgentCensus, A2A Registry,
   and MCP Registry. Skynet shows which sources returned results or no result.

3. **One agent is selected**  
   Mochi selects the Bookings agent. The game shows its domain, claimed
   scheduling capabilities, and the sources that reported it. The rest of the
   scenario follows only this agent.

4. **Mochi discovers its endpoints**  
4.1 Mochi investigates the selected domain independently through ARD, DNS-AID,
   and ANS. Skynet shows the endpoint claimed by each mechanism without hiding
   missing or conflicting results.

    4.2.  Mochi select the valid and most voted door to enter.

5. **The endpoints become doors**  
   Each distinct endpoint appears as a door into the same agent. The ARD paths
   offer A2A, MCP, or HTTPS interaction, while the site-root endpoint advertised
   by DNS-AID and ANS produces no usable MCP interaction.

6. **Mochi represents the user to interact with the agent**  


* Mochi interact with the agent, making jusdement then send satisfying response to the suer
* We can show how does Mochi interact, make decisions behind the scene
