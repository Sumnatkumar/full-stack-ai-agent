import { createAgent, gemini } from "@inngest/agent-kit";

const analyzeTicket = async (ticket) => {
  const supportAgent = createAgent({
    model: gemini({
      model: "gemini-1.5-flash-8b",
      apiKey: process.env.GEMINI_API_KEY,
    }),
    name: "AI Ticket Triage Assistant",
    system: `You are an expert AI assistant that processes technical support tickets. 

Your job is to:
1. Summarize the issue.
2. Estimate its priority.
3. Provide helpful notes and resource links for human moderators.
4. List relevant technical skills required.

IMPORTANT:
- Respond with only valid raw JSON (no markdown, no code fences).
- The format must be a raw JSON object.
`,
  });

  const response =
    await supportAgent.run(`Analyze the following support ticket and return a strict JSON object:

{
  "summary": "Short summary of the ticket",
  "priority": "low|medium|high",
  "helpfulNotes": "Detailed help notes",
  "relatedSkills": ["React", "Node.js"]
}

Ticket:
- Title: ${ticket.title}
- Description: ${ticket.description}`);

  // Try different possible fields on the response object
  const rawCandidates = [
    response?.output_text, // common text property
    Array.isArray(response?.output)
      ? response.output.map((o) => o?.text || o?.content || "").join("\n")
      : undefined,
    response?.output?.[0]?.text,
    response?.output?.[0]?.content?.text,
    response?.output?.[0]?.context,
    response?.output?.[0]?.context?.text,
  ].filter(Boolean);

  const raw = rawCandidates.join("\n");

  try {
    // Remove code fences if any and trim
    const match = raw.match(/```(?:json)?\s*([\s\S]*?)\s*```/i);
    const jsonString = match ? match[1] : raw.trim();
    return JSON.parse(jsonString);
  } catch (e) {
    console.log("Failed to parse JSON from AI response:", e.message);
    return null;
  }
};

export default analyzeTicket;
