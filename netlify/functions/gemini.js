// functions/gemini.js
const fetch = (...args) => import('node-fetch').then(({default: f}) => f(...args));

exports.handler = async function(event, context) {
  // Only allow POST
  if (event.httpMethod !== 'POST') return { statusCode: 405, body: 'Method Not Allowed' };

  // parse body
  let body;
  try {
    body = JSON.parse(event.body || '{}');
  } catch (e) {
    return { statusCode: 400, body: 'Invalid JSON' };
  }

  const prompt = (body.prompt || '').trim();
  if (!prompt) return { statusCode: 400, body: JSON.stringify({ error: 'Empty prompt' }) };

  // Read API key from env var — set this in Netlify settings (GEMINI_API_KEY).
  const API_KEY = process.env.GEMINI_API_KEY;
  if (!API_KEY) return { statusCode: 500, body: JSON.stringify({ error: 'Server misconfigured: GEMINI_API_KEY missing' }) };

  try {
    // Example URL — update if Google changes endpoints. Refer to Gemini quickstart for exact path & params.
    const url = 'https://api.generativeai.google/v1beta/models/gemini-2.5/outputs:generate';
    const payload = {
      prompt: {
        text: prompt
      },
      // adjust params as needed; many Gemini endpoints accept different JSON shapes.
      // If using Vertex AI, you might use `instances` or `input` depending on API variant.
      maxOutputTokens: 800
    };

    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${API_KEY}` // or `x-api-key` depending on Google API type
      },
      body: JSON.stringify(payload),
      // optionally set a timeout in your environment/platform
    });

    if (!res.ok) {
      const t = await res.text();
      return { statusCode: res.status, body: JSON.stringify({ error: t }) };
    }

    const data = await res.json();

    // Try to extract generated text — shape depends on API; adapt to your response.
    // Example (pseudo): data.output[0].content[0].text
    let text = '';
    if (data?.candidates?.length) {
      text = data.candidates.map(c=>c.output || c.text || '').join('\n').trim();
    } else if (data?.output?.[0]?.content) {
      // fallback parsing
      text = data.output[0].content.map(c => c.text || c).join('\n');
    } else {
      text = JSON.stringify(data).slice(0, 2000);
    }

    return {
      statusCode: 200,
      body: JSON.stringify({ text })
    };

  } catch (err) {
    return { statusCode: 500, body: JSON.stringify({ error: err.message || String(err) }) };
  }
};