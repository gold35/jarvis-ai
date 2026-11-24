import express from 'express';

const app = express();

app.use((req, res, next) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') return res.sendStatus(204);
  next();
});

app.use(express.json({ limit: '1mb' }));

const API_KEY = process.env.OPENAI_API_KEY;
const MODEL = process.env.OPENAI_MODEL || 'gpt-4o-mini';
const ELEVENLABS_API_KEY = process.env.ELEVENLABS_API_KEY;

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
      headers: { Authorization: 'Bearer ' + API_KEY, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: MODEL,
        messages: [
          {
            role: 'system',
            content: 'You are JARVIS, a helpful, calm, concise assistant. Speak with polished British-butler style where appropriate, without claiming to control devices unless a tool actually does.'
          },
          ...cleanMessages
        ]
      })
    });
    const data = await upstream.json();
    if (!upstream.ok) return res.status(upstream.status).json({ error: data?.error?.message || 'AI request failed.' });
    res.json({ reply: data.choices?.[0]?.message?.content || 'No response received.' });
  } catch (err) {
    res.status(502).json({ error: 'Could not reach AI service.' });
  }
});

app.post('/tts', async (req, res) => {
  if (!ELEVENLABS_API_KEY) {
    return res.status(500).json({ error: 'ElevenLabs API key is not configured on the server.' });
  }

  const text = String(req.body?.text ?? '').trim().slice(0, 5000);
  const voiceId = String(req.body?.voice_id ?? '').trim();
  const modelId = String(req.body?.model_id || 'eleven_flash_v2_5').trim();

  if (!text || !voiceId) {
    return res.status(400).json({ error: 'Text and voice_id are required.' });
  }

  try {
    const upstream = await fetch(
      'https://api.elevenlabs.io/v1/text-to-speech/' + encodeURIComponent(voiceId) + '?output_format=mp3_44100_128',
      {
        method: 'POST',
        headers: {
          'xi-api-key': ELEVENLABS_API_KEY,
          'Content-Type': 'application/json',
          'Accept': 'audio/mpeg'
        },
        body: JSON.stringify({
          text,
          model_id: modelId,
          voice_settings: {
            stability: 0.5,
            similarity_boost: 0.75
          }
        })
      }
    );

    if (!upstream.ok) {
      const errorText = await upstream.text();
      return res.status(upstream.status).json({ error: errorText || 'ElevenLabs speech request failed.' });
    }

    const audio = Buffer.from(await upstream.arrayBuffer());
    res.setHeader('Content-Type', 'audio/mpeg');
    res.setHeader('Content-Length', audio.length);
    res.setHeader('Cache-Control', 'no-store');
    return res.send(audio);
  } catch (err) {
    return res.status(502).json({ error: 'Could not reach ElevenLabs.' });
  }
});

const port = process.env.PORT || 10000;
app.listen(port, '0.0.0.0', () => console.log('JARVIS backend listening on ' + port));
