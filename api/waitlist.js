const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default async function handler(request, response) {
  if (request.method !== 'POST') {
    response.setHeader('Allow', 'POST');
    return response.status(405).json({ error: 'Method not allowed.' });
  }

  const { email = '', company = '', source = 'website' } = request.body || {};
  const normalizedEmail = String(email).trim().toLowerCase();

  // Honeypot: return success to bots without writing anything.
  if (company) return response.status(200).json({ message: 'Thanks for joining.' });
  if (!EMAIL_PATTERN.test(normalizedEmail) || normalizedEmail.length > 254) {
    return response.status(400).json({ error: 'Enter a valid email address.' });
  }

  const url = process.env.SUPABASE_URL;
  const secret = process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !secret) {
    console.error('Missing SUPABASE_URL or Supabase server key.');
    return response.status(503).json({ error: 'Waitlist setup is not complete yet.' });
  }

  try {
    const upstream = await fetch(`${url}/rest/v1/waitlist`, {
      method: 'POST',
      headers: {
        apikey: secret,
        Authorization: `Bearer ${secret}`,
        'Content-Type': 'application/json',
        Prefer: 'resolution=ignore-duplicates,return=minimal'
      },
      body: JSON.stringify({
        email: normalizedEmail,
        source: String(source).slice(0, 80),
        user_agent: String(request.headers['user-agent'] || '').slice(0, 500)
      })
    });

    if (!upstream.ok) {
      const detail = await upstream.text();
      console.error('Supabase waitlist insert failed:', upstream.status, detail);
      return response.status(502).json({ error: 'Unable to join right now. Please try again.' });
    }

    return response.status(200).json({ message: "You're on the founding waitlist. Welcome to JOYE." });
  } catch (error) {
    console.error('Waitlist function error:', error);
    return response.status(500).json({ error: 'Unable to join right now. Please try again.' });
  }
}
