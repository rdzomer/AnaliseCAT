// netlify/functions/gemini.ts

import { Handler } from '@netlify/functions';
import { GoogleGenerativeAI } from "@google/generative-ai";
import { decode } from "html-entities";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "");

const handler: Handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      body: JSON.stringify({ error: 'Method Not Allowed' })
    };
  }

  try {
    const { documentText, fileName } = JSON.parse(event.body || '{}');

    const prompt = `Considere o documento HTML da pauta CAT que será apresentado a seguir. ... \n\n${documentText}`; // Insira aqui seu prompt completo (mantendo a estrutura atual)

    const model = genAI.getGenerativeModel({ model: "gemini-1.5-pro" });
    const result = await model.generateContent(prompt);
    const response = result.response;
    const rawText = response.text();

    // Tenta fazer parsing do JSON com correções automáticas
    let pleitos = [];
    try {
      const startIndex = rawText.indexOf('[');
      const endIndex = rawText.lastIndexOf(']') + 1;
      const jsonString = rawText.substring(startIndex, endIndex);
      pleitos = JSON.parse(jsonString);
    } catch (err) {
      return {
        statusCode: 500,
        body: JSON.stringify({ error: "Erro ao interpretar JSON do Gemini", rawText })
      };
    }

    // Decodifica entidades HTML
    const decodedPleitos = pleitos.map((pleito: any) => {
      const decodeAll = (str: string) => decode(str || "");
      return {
        ...pleito,
        produto: decodeAll(pleito.produto),
        justificativa: decodeAll(pleito.justificativa),
        detalhes: decodeAll(pleito.detalhes),
        empresa: decodeAll(pleito.empresa),
        sessaoAnalise: pleito.sessaoAnalise,
        pautaIdentifier: fileName
      };
    });

    return {
      statusCode: 200,
      body: JSON.stringify(decodedPleitos)
    };
  } catch (error) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Erro interno do servidor', details: String(error) })
    };
  }
};

export { handler };
