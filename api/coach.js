const MAX_TEXT = 1200;
const clean = (value, max = MAX_TEXT) => String(value ?? '').trim().slice(0, max);

export default async function handler(request, response) {
  if (request.method !== 'POST') {
    response.setHeader('Allow', 'POST');
    return response.status(405).json({ error: 'Method not allowed.' });
  }

  const apiKey = process.env.OPENAI_API_KEY;
  const model = process.env.OPENAI_MODEL || 'gpt-5.6-luna';
  if (!apiKey) {
    return response.status(503).json({
      error: 'Ask Joye is not connected to AI yet.',
      code: 'AI_NOT_CONFIGURED'
    });
  }

  const body = request.body || {};
  const question = clean(body.question, 700);
  if (!question) return response.status(400).json({ error: 'Enter a question for Joye.' });

  const safeContext = {
    profile: {
      firstName: clean(body.profile?.name, 40),
      primaryFocus: clean(body.profile?.primaryFocus, 40),
      biggestStress: clean(body.profile?.stressPoint, 240),
      weekdayMinutes: Number(body.profile?.availableTime || 0),
      energyLevel: clean(body.profile?.energyLevel, 20),
      paycheck: Number(body.profile?.paycheck || 0),
      payFrequency: clean(body.profile?.payFrequency, 30),
      currentRole: clean(body.profile?.currentRole, 80),
      careerGoal: clean(body.profile?.careerGoal, 100),
      ninetyDayOutcome: clean(body.profile?.ninetyDayGoal, 240)
    },
    money: {
      paycheck: Number(body.money?.paycheck || 0),
      essentials: Number(body.money?.essentials || 0),
      debt: Number(body.money?.debt || 0),
      savings: Number(body.money?.savings || 0),
      buffer: Number(body.money?.buffer || 0)
    },
    tasks: (body.tasks || []).slice(0, 20).map(t => ({
      title: clean(t.title, 100), area: clean(t.area, 30), done: Boolean(t.done)
    })),
    goals: (body.goals || []).slice(0, 12).map(g => ({
      name: clean(g.name, 160), current: Number(g.current || 0),
      target: Number(g.target || 0), deadline: clean(g.deadline, 20)
    })),
    milestones: (body.milestones || []).slice(0, 15).map(m => ({
      title: clean(m.title, 120), done: Boolean(m.done)
    })),
    recentConversation: (body.history || []).slice(-8).map(m => ({
      role: m.role === 'assistant' ? 'assistant' : 'user',
      content: clean(m.content, 900)
    }))
  };

  const instructions = `You are Ask Joye, the conversational personal planning assistant inside Joye Life.
Answer the user's actual question naturally and specifically. Do not force every answer into the same canned recommendation.
Use the saved context when it is relevant, but never pretend missing information was supplied. If a key fact is missing, say what is missing and ask one focused follow-up question.
Prioritize practical next steps, explain why they fit this specific user, and respect their available time and energy.
For financial, medical, or legal subjects, give educational planning guidance and clearly state important uncertainty or limits. Never invent balances, deadlines, laws, diagnoses, or guarantees.
Return JSON only with this shape:
{
  "answer": "A direct, conversational response in 1-4 short paragraphs",
  "nextSteps": ["0-3 concrete steps"],
  "followUpQuestion": "One useful follow-up question or an empty string",
  "usedContext": ["0-4 concise facts from the saved profile that materially affected the answer"]
}`;

  try {
    const upstream = await fetch('https://api.openai.com/v1/responses', {
      method: 'POST',
      headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model,
        instructions,
        input: JSON.stringify({ question, ...safeContext }),
        text: { format: { type: 'json_object' } },
        max_output_tokens: 900
      })
    });

    if (!upstream.ok) {
      const detail = await upstream.text();
      console.error('Ask Joye upstream error:', upstream.status, detail);
      return response.status(502).json({
        error: 'Ask Joye could not reach the AI service. Check the API key, model, and billing settings.',
        code: 'AI_UPSTREAM_ERROR'
      });
    }

    const data = await upstream.json();
    const output = data.output_text || data.output?.flatMap(x => x.content || []).find(x => x.type === 'output_text')?.text;
    if (!output) throw new Error('No model output returned.');
    const parsed = JSON.parse(output);
    return response.status(200).json({
      answer: clean(parsed.answer, 2400),
      nextSteps: Array.isArray(parsed.nextSteps) ? parsed.nextSteps.slice(0, 3).map(x => clean(x, 220)) : [],
      followUpQuestion: clean(parsed.followUpQuestion, 300),
      usedContext: Array.isArray(parsed.usedContext) ? parsed.usedContext.slice(0, 4).map(x => clean(x, 220)) : []
    });
  } catch (error) {
    console.error('Ask Joye error:', error);
    return response.status(500).json({ error: 'Ask Joye received an invalid AI response. Please try again.', code: 'AI_RESPONSE_ERROR' });
  }
}
