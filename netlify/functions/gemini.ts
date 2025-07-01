// netlify/functions/gemini.ts

import { Handler } from '@netlify/functions';

export const handler: Handler = async (event) => {
  try {
    const body = JSON.parse(event.body || '{}');

    const { fullPrompt } = body;

    if (!fullPrompt) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: 'Missing fullPrompt' }),
      };
    }

    const apiKey = process.env.GEMINI_API_KEY;

    if (!apiKey) {
      return {
        statusCode: 500,
        body: JSON.stringify({ error: 'API key not configured on server' }),
      };
    }

    const geminiResponse = await fetch('https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent?key=' + apiKey, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        contents: [{ parts: [{ text: fullPrompt }] }],
      }),
    });

    const result = await geminiResponse.json();

    return {
      statusCode: 200,
      body: JSON.stringify({ response: result }),
    };
  } catch (error: any) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: error.message || 'Internal error' }),
    };
  }
};
