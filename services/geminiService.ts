/* ------------------------------------------------------------
 *  services/geminiService.ts – VERSÃO COMPLETA (jun‑2025)
 *  - Faz o parse dos vários tipos de tabela da pauta CAT/CCM/LETEX/CMC…
 *  - Usa Google Gemini para extrair pleitos; faz fallback em Cheerio
 *  - Classifica cada pleito de acordo com o título/hierarquia do HTML
 * ------------------------------------------------------------ */

import {
  GoogleGenAI,
  GenerateContentResponse,
} from "@google/genai";

import { load as loadCheerio } from "cheerio";
import {
  Pleito,
  TipoPleitoEnum,
  SessaoAnalise,
  StatusPleito,
} from "../types";

/* --------------------------------------------------
 *  CONFIG DA API‑KEY (env ou vite)
 * --------------------------------------------------*/
const API_KEY =
  import.meta.env.VITE_GEMINI_API_KEY || process.env.API_KEY || "";

if (!API_KEY) {
  throw new Error(
    "❌ Gemini API KEY não encontrada. Adicione VITE_GEMINI_API_KEY ao .env.local"
  );
}

const ai = new GoogleGenAI({ apiKey: API_KEY });

/* --------------------------------------------------
 *  1. MAPA → título h2/h3  → enum SessaoAnalise
 *  (adicione entradas conforme necessário)
 * --------------------------------------------------*/
const headingToSessao: Record<string, SessaoAnalise> = {
  // CCM
  "Pleitos em análise na CCM": SessaoAnalise.CCM_ANALISE,
  "Pleitos Pendentes na CCM: Pleitos do Brasil": SessaoAnalise.CCM_PENDENTES_BR,
  "Pleitos Pendentes na CCM: Pleitos dos demais Estados Partes do Mercosul":
    SessaoAnalise.CCM_PENDENTES_MERCOSUL,
  // CAT
  "Pleitos Pendentes no CAT": SessaoAnalise.PENDENTES_CAT,
  "Pleitos Novos no CAT": SessaoAnalise.NOVOS_CAT,
  "Pleitos dos demais Estados Partes do Mercosul no CAT: Pendentes":
    SessaoAnalise.CAT_MERCOSUL_PENDENTES,
  "Pleitos dos demais Estados Partes do Mercosul no CAT: Novos":
    SessaoAnalise.CAT_MERCOSUL_NOVOS,
  // LETEC
  "LETEC: Geral/Pendentes": SessaoAnalise.LETEC_PENDENTES,
  "LETEC: Pleitos Novos": SessaoAnalise.LETEC_NOVOS,
  // CMC 27/15
  "CMC 27/15: Pendentes": SessaoAnalise.CMC2715_PENDENTES,
  "CMC 27/15: Novos": SessaoAnalise.CMC2715_NOVOS,
  // LEBIT/BK
  "LEBIT/BK: Pendentes": SessaoAnalise.LEBIT_PENDENTES,
  "LEBIT/BK: Novos": SessaoAnalise.LEBIT_NOVOS,
  // CT‑1
  "CT-1: Pendentes": SessaoAnalise.CT1_PENDENTES,
  "CT-1: Novos": SessaoAnalise.CT1_NOVOS,
};

/* --------------------------------------------------
 *  2. Helper → procura o heading completo mais próximo
 * --------------------------------------------------*/
function matchHeading(text: string): SessaoAnalise | null {
  const clean = text.replace(/\s+/g, " ").trim();
  const key = Object.keys(headingToSessao).find((h) => clean.startsWith(h));
  return key ? headingToSessao[key] : null;
}

/* --------------------------------------------------
 *  3. Splita HTML em blocos por <h2> / <h3>
 * --------------------------------------------------*/
function advancedHtmlSplitter(html: string): { section: string; content: string }[] {
  const parts: { section: string; content: string }[] = [];
  if (!html) return parts;

  // 1 – split on the *opening* of h2/h3 (look‑ahead keeps the tag)
  const raw = html.split(/(?=<h[23][^>]*>)/gi);
  for (const chunk of raw) {
    const m = chunk.match(/<h[23][^>]*>(.*?)<\/h[23]>/i);
    const heading = m ? m[1].replace(/<[^>]+>/g, " ").trim() : "SEM_TITULO";
    parts.push({ section: heading, content: chunk });
  }
  return parts;
}

/* --------------------------------------------------
 *  4. Função principal – exportada
 * --------------------------------------------------*/
export const geminiService = {
  async extractPleitosFromDocumentText(
    documentText: string,
    fileName?: string
  ): Promise<Partial<Pleito>[]> {
    const ALL: Partial<Pleito>[] = [];

    const chunks = advancedHtmlSplitter(documentText);
    const sessaoAnaliseValues = Object.values(SessaoAnalise).join("', '");
    const tipoPleitoValues = Object.values(TipoPleitoEnum).join("', '");

    let idx = 0;
    for (const { section, content } of chunks) {
      idx += 1;
      const sessaoByHeading = matchHeading(section) || SessaoAnalise.NOVOS_CAT;

      /* --- prompt Gemini ------------------------------------------------*/
      const prompt = `Caminho do título HTML deste trecho: "${section}"
Seu trabalho: parsear a TABELA abaixo e devolver **apenas** um array JSON.
Todos os objetos devem conter a chave obrigatória \"ncm\".

Se NENHUM pleito estiver presente, devolva [].

O campo \"sessaoAnalise\" deve ser fixado como '${sessaoByHeading}'.
Valores possíveis: '${sessaoAnaliseValues}'.
Valores possíveis para tipoPleito: '${tipoPleitoValues}'.

Tabela HTML:
---
${content}
---`;
      /* --------------------------------------------------------------- */

      let resposta: GenerateContentResponse;
      try {
        resposta = await ai.models.generateContent({
          model: "gemini-1.5-flash-latest",
          contents: prompt,
          config: {
            responseMimeType: "application/json",
            temperature: 0.05,
          },
        });
      } catch (err) {
        console.error("Gemini falhou no bloco", idx, err);
        // fallback simples com cheerio (pelo menos NCM & Produto)
        const $ = loadCheerio(content);
        $("table tbody tr").each((_, el) => {
          const tds = $(el).find("td");
          if (tds.length) {
            ALL.push({
              ncm: $(tds[0]).text().trim() || "NCM_PENDENTE",
              produto: $(tds[1]).text().trim() || "PRODUTO_PENDENTE",
              sessaoAnalise: sessaoByHeading,
              tipoPleito: TipoPleitoEnum.INCLUSAO,
              status: StatusPleito.PENDENTE,
            });
          }
        });
        continue;
      }

      if (typeof resposta.text !== "string" || !resposta.text.trim()) continue;
      let jsonText = resposta.text.trim();
      // remove cercas ``` se vierem
      const fenced = jsonText.match(/^```(?:json)?\s*([\s\S]*?)\s*```$/);
      if (fenced) jsonText = fenced[1];

      try {
        const parsed = JSON.parse(jsonText);
        if (Array.isArray(parsed)) {
          parsed.forEach((p) => ALL.push({ ...p, sessaoAnalise: sessaoByHeading }));
        }
      } catch (err) {
        console.warn("Falha no JSON.parse do bloco", idx, err);
      }
    }

    /* ordemOriginal */
    return ALL.map((p, i) => ({ ...p, ordemOriginal: i + 1 }));
  },
};
