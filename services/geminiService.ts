import { GoogleGenAI } from "@google/genai";
import { Pleito, TipoPleitoEnum, SessaoAnalise, StatusPleito } from '../types';

let ai: GoogleGenAI | null = null;

const getAIClient = () => {
  if (!ai) {
    ai = new GoogleGenAI({ apiKey: import.meta.env.VITE_GEMINI_API_KEY });
  }
  return ai;
};

export const geminiService = {
  extractPleitosFromDocumentText: async (
    documentText: string,
    fileName?: string
  ): Promise<Partial<Pleito>[]> => {
    console.log(`Gemini Service: Processing HTML content from ${fileName || `uploaded HTML`} (length: ${documentText.length})...`);
    const client = getAIClient();

    const sessaoAnaliseValues = Object.values(SessaoAnalise).join("', '");
    const tipoPleitoValues = Object.values(TipoPleitoEnum).join("', '");

    const defaultPautaIdentifier = fileName ? `${fileName}` : 'Pauta Importada';

    const prompt = `
Você é um assistente especialista em analisar documentos HTML da "Pauta do Comitê de Alterações Tarifárias (CAT)" do Brasil.
Sua tarefa é seguir um algoritmo preciso para parsear o documento HTML inteiro fornecido, identificar TODAS as tabelas de pleitos, e extrair as informações de cada um.
A saída DEVE SER EXCLUSIVAMENTE um array JSON de objetos Pleito. Se nenhum pleito for encontrado, retorne um array vazio [].

**REGRA GLOBAL DE FORMATAÇÃO: Sempre decodifique entidades HTML (ex: '&aacute;' para 'á', '&ccedil;' para 'ç') para seus caracteres correspondentes em todos os campos de texto extraídos.**

ALGORITMO DE EXTRAÇÃO:
1.  Percorra todo o código HTML em busca de elementos <table>.
2.  Para cada <table> encontrada, verifique se ela parece conter uma lista de pleitos (procure por cabeçalhos como 'NCM', 'Produto', etc.).
3.  Se a tabela for de pleitos, execute os passos 4 e 5. Senão, ignore-a.
4.  **DETERMINAÇÃO DA SESSÃO DE ANÁLISE (CONTEXTO):** Olhe para cima no código HTML a partir da <table>. Encontre a tag de título mais próxima (pode ser <h2>, <h3>, ou <h4>) que precede a tabela. Use o texto limpo desse título para definir o campo 'sessaoAnalise' para TODOS os pleitos dentro desta tabela. O título pode ser algo como "2.1.1 Pleitos em análise na CCM" ou "2.1.2.1 Pleitos do Brasil". Mapeie o texto do título para o valor de enum 'SessaoAnalise' mais apropriado. Valores possíveis: '${sessaoAnaliseValues}'.
5.  **EXTRAÇÃO DOS DADOS DO PLEITO:** Itere sobre cada linha (<tr>) da tabela. Cada <tr> é um pleito potencial. Extraia os dados das células (<td>) e mapeie para a estrutura JSON abaixo.
    -   **IMPORTANTE PARA 'produto':** O conteúdo da célula 'Produto' pode ser muito longo, ter quebras de linha ou links (<a>). Extraia TODO o texto da célula, limpando as tags HTML, para formar a descrição completa. Não abrevie. Se a célula do produto estiver vazia, use "PRODUTO_NAO_IDENTIFICADO".
    -   **IMPORTANTE PARA 'ncm':** Extraia o NCM no formato XXXX.XX.XX. Se a célula não contiver um NCM válido, use "NCM_NAO_IDENTIFICADO". Ignore os números de índice de linha (1, 2, 3...).

ESTRUTURA JSON PARA CADA PLEITO:
-   ncm (string, OBRIGATÓRIO)
-   produto (string, OBRIGATÓRIO, extrair conteúdo completo da célula)
-   pleiteante (string, opcional)
-   tipoPleito (string, enum: '${tipoPleitoValues}', Padrão: '${TipoPleitoEnum.Outro}')
-   status (string, Padrão: '${StatusPleito.Pendente}')
-   prazo (string, formato YYYY-MM-DD)
-   sessaoAnalise (string, OBRIGATÓRIO, determinado pelo passo 4 do algoritmo)
-   processoSEIPublico (string, opcional)
-   processoSEIRestrito (string, opcional)
-   notaTecnica (string, opcional)
-   posicaoCAT (string, opcional)
-   reducaoII (string, opcional)
-   quotaValor (string, opcional)
-   quotaUnidade (string, opcional)
-   paisEstadoParte (string, opcional)
-   exTarifario (string, opcional)
-   aliquotaAplicada (string, opcional)
-   aliquotaPretendida (string, opcional)
-   aliquotaIIVigente (string, opcional)
-   aliquotaIIPleiteada (string, opcional)
-   paisPendente (string, opcional)
-   prazoResposta (string, opcional)
-   situacaoEspecifica (string, opcional)
-   terminoVigenciaMedida (string, opcional)

6.  Após processar todas as tabelas, agrupe todos os objetos de pleito extraídos em um único array JSON.

Abaixo está o documento HTML completo para análise:
---
${documentText}
---
`;

    let allExtractedPleitos: Partial<Pleito>[] = [];
    let jsonStr: string = '';

    try {
      const response = await client.models.generateContent({
        model: "gemini-2.5-flash-preview-04-17",
        contents: prompt,
        config: {
          responseMimeType: "application/json",
          temperature: 0.0,
          thinkingConfig: { thinkingBudget: 0 }
        }
      });

      let responseText: string;
      try {
        responseText = response.text;
      } catch (e) {
        responseText = '';
      }

      if (!responseText || typeof responseText !== 'string' || !responseText.trim()) {
        let errorDetails = "Resposta vazia ou inválida da API.";
        const responseAsAny = response as any;
        const blockReason = responseAsAny?.promptFeedback?.blockReason;
        const finishReason = responseAsAny?.candidates?.[0]?.finishReason;

        if (blockReason) {
          errorDetails = `Conteúdo bloqueado. Motivo: ${blockReason}.`;
        } else if (finishReason && !['STOP', 'FINISH_REASON_UNSPECIFIED'].includes(finishReason)) {
          errorDetails = `Geração interrompida. Motivo: ${finishReason}.`;
        }

        console.error(
          `API Gemini não retornou um texto válido. Detalhes: ${errorDetails}`,
          `Resposta Completa: ${JSON.stringify(response, null, 2)}`
        );
        throw new Error(`A importação falhou. ${errorDetails}`);
      }

      jsonStr = responseText.trim();
      const fenceRegex = /^```(?:json)?\s*\n?(.*?)\n?\s*```$/s;
      const match = jsonStr.match(fenceRegex);
      if (match && match[2]) {
        jsonStr = match[2].trim();
      }

      if (!jsonStr) {
        console.warn(`Resposta da API Gemini resultou em string JSON vazia.`);
        return [];
      }

      const extractedData = JSON.parse(jsonStr);

      if (Array.isArray(extractedData)) {
        console.log(`Gemini retornou ${extractedData.length} pleitos.`);

        const processedData = extractedData.map((item: any) => {
          let ncm = item.ncm;
          if (ncm) {
            const rawNCM = String(ncm).replace(/[^\d]/g, '');
            if (rawNCM.length === 8) {
              ncm = `${rawNCM.slice(0, 4)}.${rawNCM.slice(4, 6)}.${rawNCM.slice(6, 8)}`;
            }
          }
          if (!ncm || !/^\d{4}\.\d{2}\.\d{2}$/.test(ncm)) {
            ncm = "NCM_NAO_IDENTIFICADO";
          }

          let produto = item.produto || item.descricaoAlternativa;
          if (!produto || String(produto).trim().length < 2) {
            produto = "PRODUTO_NAO_IDENTIFICADO";
          }

          if (ncm === "NCM_NAO_IDENTIFICADO" && produto === "PRODUTO_NAO_IDENTIFICADO") {
            return null;
          }

          return {
            ...item,
            ncm,
            produto,
            pautaIdentifier: defaultPautaIdentifier,
            status: Object.values(StatusPleito).includes(item.status) ? item.status : StatusPleito.PENDENTE,
          } as Partial<Pleito>;
        }).filter(Boolean);


        allExtractedPleitos = processedData;

      } else {
        console.warn(`Resposta da API Gemini não foi um array JSON:`, extractedData);
      }

    } catch (error: any) {
      console.error(`Erro ao processar com Gemini:`, error);
      if (error instanceof SyntaxError) {
        console.error(`String que falhou no JSON.parse:\n${jsonStr}`);
      }
      if (error.message.includes("API key not valid")) {
        throw new Error("Chave de API do Gemini inválida. Verifique a configuração.");
      }
      throw error;
    }

    console.log(`Total de ${allExtractedPleitos.length} pleitos extraídos.`);

    allExtractedPleitos.forEach((pleito, index) => {
      pleito.ordemOriginal = index + 1;
    });

    return allExtractedPleitos;
  }
};
