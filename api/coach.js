const MAX_TEXT = 500;
const clean = (value, max = MAX_TEXT) => String(value ?? '').trim().slice(0, max);

export default async function handler(request, response) {
  if (request.method !== 'POST') {
    response.setHeader('Allow', 'POST');
    return response.status(405).json({ error: 'Method not allowed.' });
  }

  const apiKey = process.env.OPENAI_API_KEY;
  const model = process.env.OPENAI_MODEL;
  if (!apiKey || !model) return response.status(503).json({ error: 'AI coach is not configured.' });

  const body = request.body || {};
  const safeContext = {
    question: clean(body.question, 300),
    profile: {
      firstName: clean(body.profile?.name, 40),
      primaryFocus: clean(body.profile?.primaryFocus, 40),
      biggestStress: clean(body.profile?.stressPoint, 240),
      weekdayMinutes: Number(body.profile?.availableTime || 0),
      energyLevel: clean(body.profile?.energyLevel, 20),
      payFrequency: clean(body.profile?.payFrequency, 30),
      currentRole: clean(body.profile?.currentRole, 80),
      careerGoal: clean(body.profile?.careerGoal, 100),
      ninetyDayOutcome: clean(body.profile?.ninetyDayGoal, 240)
    },
    money: {
      paycheck: Number(body.money?.paycheck || 0), essentials: Number(body.money?.essentials || 0),
      debt: Number(body.money?.debt || 0), savings: Number(body.money?.savings || 0), buffer: Number(body.money?.buffer || 0)
    },
    tasks: (body.tasks || []).slice(0, 15).map(t => ({ title: clean(t.title, 100), area: clean(t.area, 30), done: Boolean(t.done) })),
    goals: (body.goals || []).slice(0, 10).map(g => ({ name: clean(g.name, 160), current: Number(g.current||0), target: Number(g.target||0), deadline: clean(g.deadline, 20) })),
    milestones: (body.milestones || []).slice(0, 12).map(m => ({ title: clean(m.title, 120), done: Boolean(m.done) }))
  };

  const instructions = `You are Joye Life, a calm personal planning assistant. Recommend one realistic next action using only the supplied context. Explain the key facts used. Never claim to be a financial, medical, or legal professional. For money questions, provide educational planning guidance, preserve a user-defined safety buffer, and disclose uncertainty. Keep the action small enough for the user's available time and energy. Return JSON only with: headline (max 80 chars), action (max 240 chars), reasons (array of 2-3 concise strings), confidence (High, Medium, or Low), taskTitle (max 100 chars).`;

  try {
    const upstream = await fetch('https://api.openai.com/v1/responses', {
      method: 'POST',
      headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model,
        instructions,
        input: JSON.stringify(safeContext),
        text: { format: { type: 'json_object' } },
        max_output_tokens: 500
      })
    });
    if (!upstream.ok) {
      console.error('AI coach upstream error:', upstream.status, await upstream.text());
      return response.status(502).json({ error: 'AI coach is temporarily unavailable.' });
    }
    const data = await upstream.json();
    const output = data.output_text || data.output?.flatMap(x => x.content || []).find(x => x.type === 'output_text')?.text;
    const parsed = JSON.parse(output);
    return response.status(200).json(parsed);
  } catch (error) {
    console.error('AI coach error:', error);
    return response.status(500).json({ error: 'AI coach is temporarily unavailable.' });
  }
}
