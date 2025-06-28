/*  src/services/geminiService.ts
    ---------------------------------------------------------------
    Analisa pauta CAT com Gemini e faz fallback em Cheerio.
    Agora filtra tabelas irrelevantes e valida NCM!
------------------------------------------------------------------ */

import { GoogleGenAI, GenerateContentResponse } from "@google/genai";
import { load } from "cheerio";
import {
  Pleito,
  TipoPleitoEnum,
  SessaoAnalise,
  StatusPleito,
} from "../types";

/* -------------------- CONFIG DA API-KEY --------------------- */

const API_KEY =
  import.meta.env.VITE_GEMINI_API_KEY || process.env.API_KEY;

if (!API_KEY) {
  throw new Error(
    "❌ Gemini API-KEY não encontrada. Defina VITE_GEMINI_API_KEY no .env.local."
  );
}

let genAI: GoogleGenAI;
const getAI = () => (genAI ??= new GoogleGenAI({ apiKey: API_KEY }));

/* -------------------- CONSTANTES / UTILS -------------------- */

const MAX_CHUNK = 30_000;
const REGEX_NCM = /^\d{4}\.\d{2}\.\d{2}$/; // 0101.21.00
const sessoes = Object.values(SessaoAnalise).join("', '");
const tipos = Object.values(TipoPleitoEnum).join("', '");
const stripFence = (t: string) => t.replace(/^```(?:json)?\s*|\s*```$/g, "").trim();

/* ----------- SPLIT POR <h2> (c/ sub-chunk) ----------- */

function splitHtml(html: string) {
  const blocks: { title: string; content: string }[] = [];
  const parts = html.split(/(?=<h2[^>]*>)/i);
  const h2R = /<h2[^>]*>(.*?)<\/h2>/is;
  const h1R = /<h1[^>]*>(.*?)<\/h1>/is;

  parts.forEach((p, i) => {
    const body = p.trim();
    if (!body) return;

    let title = "";
    const h2 = body.match(h2R);
    if (h2?.[1]) title = h2[1].replace(/<[^>]+>/g, " ").trim();
    else if (i === 0) {
      const h1 = body.match(h1R);
      title = h1?.[1].replace(/<[^>]+>/g, " ").trim() || "Documento";
    } else title = `Bloco ${i + 1}`;

    for (let j = 0; j < body.length; j += MAX_CHUNK) {
      blocks.push({
        title: body.length > MAX_CHUNK ? `${title} (parte ${j / MAX_CHUNK + 1})` : title,
        content: body.slice(j, j + MAX_CHUNK),
      });
    }
  });
  return blocks;
}

/* ------- FALLBACK CHEERIO (agora com filtros) ------- */

function parseTableFallback(html: string): Partial<Pleito>[] {
  const $ = load(html);
  const out: Partial<Pleito>[] = [];

  $("table").each((_, tbl) => {
    const $tbl = $(tbl);
    const heads = $tbl
      .find("tr").first()
      .find("th,td")
      .toArray()
      .map((el) => $(el).text().toLowerCase().trim());

    if (!heads.some((h) => h.includes("ncm"))) return; // descarta tabelas sem NCM

    $tbl.find("tr").slice(1).each((_, tr) => {
      const tds = $(tr).find("td").toArray();
      if (tds.length < 2) return;

      const obj: any = {
        tipoPleito: TipoPleitoEnum.INCLUSAO,
        sessaoAnalise: SessaoAnalise.NOVOS_CAT,
        status: StatusPleito.PENDENTE,
      };

      tds.forEach((td, idx) => {
        const txt = $(td).text().trim();
        const head = heads[idx];

        if (head.includes("ncm")) obj.ncm = txt;
        else if (head.includes("produto") || head.includes("descr")) obj.produto = txt;
        else if (head.includes("pleiteante") || head.includes("requerente") || head.includes("solicitante"))
          obj.pleiteante = txt;
        else if (head.includes("tipo")) obj.tipoPleito = txt;
      });

      if (REGEX_NCM.test(obj.ncm ?? "")) out.push(obj);
    });
  });

  return out;
}

/* ------------------- SERVIÇO PRINCIPAL ------------------- */

export const geminiService = {
  extractPleitosFromDocumentText: async (
    html: string,
    fileName?: string
  ): Promise<Partial<Pleito>[]> => {
    const blocks = splitHtml(html);
    const ai = getAI();
    const todos: Partial<Pleito>[] = [];
    const pautaId = fileName ? `Pauta: ${fileName}` : "Pauta Importada";

    let idx = 0;
    for (const blk of blocks) {
      idx++;
      const prompt = `
Você recebe um trecho HTML intitulado "${blk.title}" de uma pauta CAT.
Extraia cada pleito como objeto JSON com:
ncm, produto, pleiteante, tipoPleito, sessaoAnalise, prazo, status.
Valores possíveis sessaoAnalise: '${sessoes}'
Valores possíveis tipoPleito: '${tipos}'
Responda apenas com um array JSON.
---
${blk.content}
---`;

      try {
        const resp: GenerateContentResponse = await ai.models.generateContent({
          model: "gemini-2.5-flash-preview-04-17",
          contents: prompt,
          config: { responseMimeType: "application/json", temperature: 0.05 },
        });

        const raw = stripFence(resp.text || "");
        const arr = JSON.parse(raw);

        if (!Array.isArray(arr) || arr.length === 0)
          throw new Error("gemini-empty");

        arr.forEach((p: any) => {
          if (REGEX_NCM.test(p.ncm ?? "")) {
            todos.push({
              ...p,
              pautaIdentifier: pautaId,
              ordemOriginal: todos.length + 1,
            });
          }
        });
      } catch {
        console.warn(`⚠️  Gemini falhou no bloco ${idx}. Usando fallback.`);
        parseTableFallback(blk.content).forEach((p) =>
          todos.push({ ...p, pautaIdentifier: pautaId, ordemOriginal: todos.length + 1 })
        );
      }
    }

    console.log(`✅ Total extraído (após filtros): ${todos.length} pleitos.`);
    return todos;
  },
};


