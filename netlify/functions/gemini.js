// netlify/functions/gemini.js

export async function handler(event) {
  if (event.httpMethod !== "POST") {
    return { statusCode: 405, body: "Method Not Allowed" };
  }

  let body;
  try {
    body = JSON.parse(event.body || "{}");
  } catch {
    return { statusCode: 400, body: "Invalid JSON" };
  }

  const prompt = (body.prompt || "").trim();
  if (!prompt) {
    return {
      statusCode: 400,
      body: JSON.stringify({ error: "Empty prompt" }),
    };
  }

  const API_KEY = process.env.GEMINI_API_KEY;
  if (!API_KEY) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: "Missing GEMINI_API_KEY" }),
    };
  }

  try {
    const url =
      "https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash-latest:generateContent";

    const payload = {
      contents: [
        {
          parts: [{ text: prompt }],
        },
      ],
    };

    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${API_KEY}`,
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const errText = await response.text();
      return {
        statusCode: response.status,
        body: JSON.stringify({ error: errText }),
      };
    }

    const data = await response.json();
    let output = "";

    if (
      data &&
      data.candidates &&
      data.candidates[0] &&
      data.candidates[0].content
    ) {
      const parts = data.candidates[0].content.parts;
      output = parts.map((p) => p.text || "").join("\n").trim();
    } else {
      output = "No text response from Gemini API.";
    }

    return {
      statusCode: 200,
      body: JSON.stringify({ text: output }),
    };
  } catch (err) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: err.message }),
    };
  }
      }
