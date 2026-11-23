# JARVIS AI Backend

Deploy this Node.js service on Render. It keeps the OpenAI API key on the server, not in the browser/app.


## Render settings
- Runtime: Node
- Build command: `npm install`
- Start command: `npm start`
- Environment variable: `OPENAI_API_KEY` = your secret API key
- Optional environment variable: `OPENAI_MODEL` (default `gpt-4o-mini`)

Once deployed, test `https://YOUR-SERVICE.onrender.com/` and expect `{ "status": "JARVIS backend online" }`.

POST `/chat` with JSON: `{ "messages": [{"role":"user","content":"Hello"}] }`.
