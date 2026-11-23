import express from 'express';

const app = express();
app.use(express.json({ limit: '1mb' }));

const API_KEY = process.env.OPENAI_API_KEY;
const MODEL = process.env.OPENAI_MODEL || 'gpt-4o-mini';

app.get('/', (_req, res) => res.json({ status: 'JARVIS backend online' }));
app.get('/health', (_req, res) => res.json({ ok: true }));
app.post('/chat', async (req, res) => {
  if (!API_KEY) return res.status(500).json({ error: 'Server API key is not configured.' });
  const messages = req.body?.messages;
  if (!Array.isArray(messages) || messages.length === 0 || messages.length > 30) {
    return res.status(400).json({ error: 'Provide a messages array (1–30 messages).' });
  }
  const cleanMessages = messages.map(m => ({
    role: ['user', 'assistant'].includes(m?.role) ? m.role : 'user',
    content: String(m?.content ?? '').slice(0, 8000)
  }));
  try {
    const upstream = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: { Authorization: `Bearer ${API_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ model: MODEL, messages: [
        { role: 'system', content: 'You are JARVIS, a helpful, calm, concise assistant. Speak with polished British-butler style where appropriate, without claiming to control devices unless a tool actually does.' },
        ...cleanMessages
      ] })
    });
    const data = await upstream.json();
    if (!upstream.ok) return res.status(upstream.status).json({ error: data?.error?.message || 'AI request failed.' });
    res.json({ reply: data.choices?.[0]?.message?.content || 'No response received.' });
  } catch (err) {
    res.status(502).json({ error: 'Could not reach AI service.' });
  }
});
const port = process.env.PORT || 10000;
app.listen(port, '0.0.0.0', () => console.log(`JARVIS backend listening on ${port}`));
