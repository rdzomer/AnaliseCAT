
import { GoogleGenAI, GenerateContentResponse } from "@google/genai";
import { Pleito, TipoPleitoEnum, SessaoAnalise, StatusPleito } from '../types';

let ai: GoogleGenAI | null = null;

const getAIClient = () => {
  if (!ai) {
    if (!process.env.API_KEY) {
      console.error("API_KEY for Gemini is not set in environment variables.");
      throw new Error("API_KEY for Gemini is not configured.");
    }
    ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  }
  return ai;
};

const MAX_CHUNK_LENGTH = 50000; // Max characters for HTML content per chunk

// Helper function to split oversized content into smaller parts
function splitContent(content: string, baseTitle: string, maxLength: number): { sectionTitle: string, content: string }[] {
    const subChunks: { sectionTitle: string, content: string }[] = [];
    if (content.length <= maxLength) {
        subChunks.push({ sectionTitle: baseTitle, content });
        return subChunks;
    }

    console.log(`splitContent: Splitting content titled "${baseTitle}" (length ${content.length}) into parts of max ${maxLength} chars.`);
    let remainingContent = content;
    let subChunkIndex = 1;
    while (remainingContent.length > 0) {
        let currentSubChunkContent: string;
        if (remainingContent.length <= maxLength) {
            currentSubChunkContent = remainingContent;
            remainingContent = "";
        } else {
            let splitPosition = maxLength;
            const idealSplitWindow = remainingContent.substring(0, maxLength);
            
            // Try to split at the end of a table, paragraph, or div if possible, prioritizing later occurrences
            const tableEndMatch = idealSplitWindow.lastIndexOf('</table>');
            const pEndMatch = idealSplitWindow.lastIndexOf('</p>');
            const divEndMatch = idealSplitWindow.lastIndexOf('</div>');
            
            let bestSplit = -1;
            // Check if match is reasonably far into the chunk (e.g., > 50% of maxLength)
            if (tableEndMatch > maxLength / 2 && tableEndMatch + '</table>'.length <= maxLength) bestSplit = Math.max(bestSplit, tableEndMatch + '</table>'.length);
            if (pEndMatch > maxLength / 2 && pEndMatch + '</p>'.length <= maxLength) bestSplit = Math.max(bestSplit, pEndMatch + '</p>'.length);
            if (divEndMatch > maxLength / 2 && divEndMatch + '</div>'.length <= maxLength) bestSplit = Math.max(bestSplit, divEndMatch + '</div>'.length);

            if (bestSplit !== -1) {
                splitPosition = bestSplit;
            } else {
                // Fallback: try to split at a newline or space
                let lastNewline = idealSplitWindow.lastIndexOf('\n');
                let lastSpace = idealSplitWindow.lastIndexOf(' ');
                if (lastNewline > maxLength / 2 && lastNewline + 1 <= maxLength) {
                     splitPosition = lastNewline + 1; // Split after newline
                } else if (lastSpace > maxLength / 2 && lastSpace + 1 <= maxLength) {
                     splitPosition = lastSpace + 1; // Split after space
                }
                // If no good space/newline, take the hard cut at maxLength (default)
            }
            currentSubChunkContent = remainingContent.substring(0, splitPosition);
            remainingContent = remainingContent.substring(splitPosition);
        }
        
        const trimmedSubChunkContent = currentSubChunkContent.trim();
        if (trimmedSubChunkContent.length > 0) {
            subChunks.push({
                sectionTitle: `${baseTitle} (Part ${subChunkIndex})`,
                content: trimmedSubChunkContent
            });
        }
        subChunkIndex++;
    }
    console.log(`splitContent: Content "${baseTitle}" was split into ${subChunks.length} sub-chunks.`);
    return subChunks.filter(sc => sc.content.length > 0); // Ensure no empty sub-chunks
}

// Helper function to split HTML content by H2 tags and then by size
function simpleHtmlSplitter(html: string): { sectionTitle: string, content: string }[] {
    const finalChunks: { sectionTitle: string, content: string }[] = [];
    if (!html || !html.trim()) {
        console.log("simpleHtmlSplitter: HTML input is empty. Returning 0 chunks.");
        return finalChunks;
    }

    const h2Regex = /<h2[^>]*>(.*?)<\/h2>/is;
    // Split by H2, keeping the H2 tag itself with the content that follows it.
    const parts = html.split(/(?=<h2[^>]*>)/i); 
    
    console.log(`simpleHtmlSplitter: HTML initially split into ${parts.length} parts by H2 lookahead.`);

    if (parts.length === 0 && html.trim().length > 0) { // Should not happen often if html has content
        parts.push(html.trim()); // Treat as one part if split yields nothing but there's content
    }

    for (let i = 0; i < parts.length; i++) {
        const partContent = parts[i].trim();
        if (!partContent) {
            console.log(`simpleHtmlSplitter: Part ${i + 1} of ${parts.length} is empty after trim, skipping.`);
            continue;
        }

        let sectionTitle: string;
        const titleMatch = partContent.match(h2Regex);

        if (titleMatch && titleMatch[1]) { // If the part starts with an H2 tag
            sectionTitle = titleMatch[1].replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
            if (!sectionTitle) sectionTitle = `Untitled H2 Section (${i + 1})`;
        } else if (i === 0) { // Content before the first H2, or the whole doc if no H2s
            const h1Regex = /<h1[^>]*>(.*?)<\/h1>/is;
            const h1Match = partContent.match(h1Regex);
            if (h1Match && h1Match[1]) {
                 sectionTitle = h1Match[1].replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
                 if (!sectionTitle) sectionTitle = "Untitled H1 Section";
            } else {
                 sectionTitle = "Main Document Content"; // Default for content not under an H2 or H1
            }
        } else {
            // This part was separated by H2 lookahead but doesn't start with H2.
            // This might be unexpected, assign a generic title.
            sectionTitle = `Unnamed Section (${i + 1})`;
        }
        
        console.log(`simpleHtmlSplitter: Processing initial chunk: "${sectionTitle}", length: ${partContent.length}`);
        if (partContent.length > MAX_CHUNK_LENGTH) {
            console.warn(`simpleHtmlSplitter: Chunk "${sectionTitle}" (length ${partContent.length}) exceeds MAX_CHUNK_LENGTH (${MAX_CHUNK_LENGTH}). Splitting further.`);
            const subSplitChunks = splitContent(partContent, sectionTitle, MAX_CHUNK_LENGTH);
            finalChunks.push(...subSplitChunks);
        } else {
            finalChunks.push({ sectionTitle, content: partContent });
        }
    }
    
    // Fallback if the main loop yields no chunks but HTML is not empty (e.g., if parts array was manipulated unexpectedly)
    if (finalChunks.length === 0 && html.trim()) { 
        console.warn("simpleHtmlSplitter: Main splitting logic yielded no chunks. Applying fallback to split the whole document based on MAX_CHUNK_LENGTH.");
        const fallbackChunks = splitContent(html.trim(), "Full Document (Fallback Split)", MAX_CHUNK_LENGTH);
        finalChunks.push(...fallbackChunks);
    }

    console.log(`simpleHtmlSplitter: Final - HTML processed into ${finalChunks.length} chunks.`);
    return finalChunks.filter(c => c.content && c.content.trim().length > 0);
}


export const geminiService = {
  extractPleitosFromDocumentText: async (
    documentText: string, 
    fileName?: string
  ): Promise<Partial<Pleito>[]> => {
    console.log(`Gemini Service: Processing HTML content from ${fileName || `uploaded HTML`} (length: ${documentText.length})...`);
    const client = getAIClient();
    
    const sessaoAnaliseValues = Object.values(SessaoAnalise).join("', '");
    const tipoPleitoValues = Object.values(TipoPleitoEnum).join("', '");
    let allExtractedPleitos: Partial<Pleito>[] = [];

    const defaultPautaIdentifier = fileName ? `Pauta: ${fileName}` : 'Pauta Importada';

    console.log(`Starting HTML processing for ${fileName || 'uploaded HTML'}`);
    const htmlChunks = simpleHtmlSplitter(documentText);
    
    if (htmlChunks.length === 0 && documentText.trim() !== '') {
         console.warn("HTML document text provided, but simpleHtmlSplitter returned no chunks. This is unexpected. Will attempt to process as single chunk if text exists, but might fail due to size.");
    }
    
    console.log(`Total HTML chunks to process by Gemini: ${htmlChunks.length}`);
    let chunkIndex = 0;

    for (const chunk of htmlChunks) {
        chunkIndex++;
        
        const promptContextMessage = `Este é UM TRECHO de um documento HTML maior (arquivo: ${fileName || 'desconhecido'}). A seção principal deste trecho HTML parece ser intitulada '${chunk.sectionTitle}'. Use este título e outros cabeçalhos (h3, h4 etc.) DENTRO DESTE TRECHO para determinar o campo 'sessaoAnalise' para os pleitos encontrados.`;
        
        console.log(`Processing HTML chunk ${chunkIndex}/${htmlChunks.length}, title: "${chunk.sectionTitle}", content length: ${chunk.content.length}`);
        
        const chunkPrompt = `
Você é um assistente especialista em analisar documentos HTML da "Pauta do Comitê de Alterações Tarifárias (CAT)" do Brasil.
${promptContextMessage}
Sua tarefa é parsear ESTE TRECHO HTML, identificar CADA pleito individual listado e extrair as informações relevantes.
A saída DEVE SER EXCLUSIVAMENTE um array JSON de objetos Pleito. Se nenhum pleito for encontrado NESTE TRECHO, retorne um array vazio [].

Valores possíveis para 'sessaoAnalise': '${sessaoAnaliseValues}'. Atribua o 'sessaoAnalise' mais apropriado para cada pleito com base no título da seção HTML onde ele se encontra.

Dentro deste trecho, procure por tabelas (<table>). Cada linha (<tr>) dentro do corpo da tabela (<tbody>), ou mesmo sem <tbody>, provavelmente representa um pleito.
Use os cabeçalhos da tabela (<th> em <thead> ou na primeira linha da tabela) para identificar as colunas e mapeá-las para os seguintes campos JSON.

Estrutura dos campos JSON para cada pleito:
- ncm (string, Formato XXXX.XX.XX. OBRIGATÓRIO. Busque em células com cabeçalho como 'NCM'. Se não encontrar, use "NCM_NAO_IDENTIFICADO")
- produto (string, Descrição do produto. OBRIGATÓRIO. Busque em células com cabeçalho como 'Produto', 'Descrição'. Se não encontrar, use "PRODUTO_NAO_IDENTIFICADO")
- pleiteante (string, opcional. Cabeçalho 'Pleiteante')
- tipoPleito (string, Tente mapear para um dos seguintes: '${tipoPleitoValues}'. Busque em colunas como "Tipo de Pleito" ou "Pleito". Padrão: '${TipoPleitoEnum.INCLUSAO}')
- processoSEIPublico (string, opcional. Cabeçalho 'Processo SEI', 'SEI Público'. Se houver dois SEIs em uma célula ou colunas adjacentes, use este para o público ou o primeiro.)
- processoSEIRestrito (string, opcional. Cabeçalho 'SEI Restrito', ou o segundo SEI se houver dois.)
- sessaoAnalise (string, OBRIGATÓRIO. Determinada pelo título da seção HTML. Padrão: '${SessaoAnalise.NOVOS_CAT}')
- reducaoII (string, opcional. Cabeçalho "Redução do II (%)")
- quotaValor (string, opcional. Cabeçalho "Quota" - extraia o valor numérico/texto principal)
- quotaUnidade (string, opcional. Unidade da quota, ex: 'toneladas', 'unidades'. Pode estar junto com quotaValor ou em coluna separada "Unidade Quota")
- paisPendente (string, opcional. Cabeçalho "País pendente", "País pendente e Prazo para resposta")
- prazoResposta (string, opcional. Cabeçalho "Prazo para resposta")
- situacaoEspecifica (string, opcional. Cabeçalho "Situação")
- paisEstadoParte (string, opcional. Cabeçalho "País" em seções Mercosul)
- exTarifario (string, opcional. Cabeçalho "Ex-tarifário", "Ex tarifário")
- aliquotaAplicada (string, opcional. Cabeçalho "Alíquota Aplicada")
- aliquotaAplicadaPleitoZero (boolean, true se houver indicação "(Pleito a 0%)" associada à Alíquota Aplicada, senão false)
- quotaInfoAdicional (string, opcional. Se houver uma segunda coluna "Quota" ou informações adicionais de quota)
- quotaPrazo (string, opcional. Cabeçalho "Prazo" referente à quota)
- terminoVigenciaMedida (string, opcional. Cabeçalho "Término de Vigência da medida em vigor", "Prazo da medida vigente")
- aliquotaPretendida (string, opcional. Cabeçalho "Alíquota Pretendida", "Alíquota Solicitada")
- aliquotaIIVigente (string, opcional, para CMC 27/15. Cabeçalho "Alíquota II Vigente")
- aliquotaIIPleiteada (string, opcional, para CMC 27/15. Cabeçalho "Alíquota II Pleiteada")
- descricaoAlternativa (string, opcional. Para "Descrição" em CMC 27/15 quando "Produto" não é usado)
- tipoPleitoDetalhado (string, opcional. Cabeçalho "Pleito" em LEBIT/BK e CT-1)
- tec (string, opcional. Cabeçalho "TEC" em LEBIT/BK)
- alteracaoTarifaria (string, opcional. Cabeçalho "Alteração tarifária" em CT-1)
- notaTecnica (string, opcional. Cabeçalho "Notas Técnicas")
- posicaoCAT (string, opcional. Cabeçalho "Posição CAT")
- prazo (string, Data formato YYYY-MM-DD. Principalmente da coluna "Prazo Reunião" nas tabelas principais, ou data geral da reunião se aplicável. Padrão: data atual se nenhuma for encontrada)
- status (string, Padrão: '${StatusPleito.PENDENTE}')

Extraia os dados EXATAMENTE como aparecem nas células. Prioritize a extração de dados tabulares.

Trecho HTML fornecido:
---
${chunk.content || "(Conteúdo HTML do trecho não fornecido ou vazio)"}
---
`;
        let jsonStrChunk: string = '';
        try {
            const response: GenerateContentResponse = await client.models.generateContent({
                model: "gemini-2.5-flash-preview-04-17",
                contents: chunkPrompt,
                config: { responseMimeType: "application/json", temperature: 0.05 }
            });

            if (typeof response.text !== 'string') {
                console.error(`API Gemini não retornou um texto válido para o chunk ${chunkIndex} (Title: "${chunk.sectionTitle}"). Resposta:`, JSON.stringify(response, null, 2));
                if (response?.promptFeedback?.blockReason) {
                    console.error(`Chunk ${chunkIndex} bloqueado por: ${response.promptFeedback.blockReason} - ${response.promptFeedback.blockReasonMessage || ''}`);
                }
                const candidateFinishReason = response?.candidates?.[0]?.finishReason;
                if (candidateFinishReason === "MAX_TOKENS") {
                    console.error(`Chunk ${chunkIndex} (Title: "${chunk.sectionTitle}") processing stopped due to MAX_TOKENS. The chunk might be too large, the required output too verbose, or the model hit its output token limit.`);
                }
                continue; 
            }
            
            jsonStrChunk = response.text.trim();
            const fenceRegex = /^```(?:json)?\s*\n?(.*?)\n?\s*```$/s;
            const match = jsonStrChunk.match(fenceRegex);
            if (match && match[2]) {
                jsonStrChunk = match[2].trim();
            }

            if (!jsonStrChunk) {
                console.warn(`Resposta da API Gemini para o chunk ${chunkIndex} (Title: "${chunk.sectionTitle}") resultou em string JSON vazia. Nenhum pleito extraído deste chunk.`);
                continue;
            }

            const extractedDataFromChunk = JSON.parse(jsonStrChunk);
            if (Array.isArray(extractedDataFromChunk)) {
                console.log(`Gemini retornou ${extractedDataFromChunk.length} pleitos do chunk ${chunkIndex} (Title: "${chunk.sectionTitle}").`);
                const processedChunkData = extractedDataFromChunk.map((item: any) => ({
                    ...item,
                    ncm: item.ncm || "NCM_PENDENTE_CHUNK",
                    produto: item.produto || "PRODUTO_PENDENTE_CHUNK",
                    prazo: item.prazo || new Date().toISOString().split('T')[0],
                    status: item.status || StatusPleito.PENDENTE,
                    tipoPleito: item.tipoPleito || TipoPleitoEnum.INCLUSAO,
                    sessaoAnalise: item.sessaoAnalise || SessaoAnalise.NOVOS_CAT, 
                    aliquotaAplicadaPleitoZero: typeof item.aliquotaAplicadaPleitoZero === 'boolean' ? item.aliquotaAplicadaPleitoZero : ((item.aliquotaAplicada || '').includes('0%')),
                    pautaIdentifier: defaultPautaIdentifier, // Add pautaIdentifier
                })) as Partial<Pleito>[];
                allExtractedPleitos.push(...processedChunkData);
            } else {
                console.warn(`Resposta da API Gemini para o chunk ${chunkIndex} (Title: "${chunk.sectionTitle}") não foi um array JSON:`, extractedDataFromChunk);
            }

        } catch (error) {
            console.error(`Erro ao processar chunk ${chunkIndex} (Title: "${chunk.sectionTitle}") com Gemini ou ao fazer parse da resposta:`, error);
            if (error instanceof SyntaxError) {
                const snippetLength = 200;
                const problematicJsonSnippet = jsonStrChunk.length > snippetLength * 2
                    ? `${jsonStrChunk.substring(0, snippetLength)}... (total length: ${jsonStrChunk.length}) ...${jsonStrChunk.substring(jsonStrChunk.length - snippetLength)}`
                    : jsonStrChunk;
                console.error(`String que falhou no JSON.parse para chunk ${chunkIndex} (Title: "${chunk.sectionTitle}", Snippet):\n${problematicJsonSnippet}`);
            }
        }
    } 
    console.log(`Total de ${allExtractedPleitos.length} pleitos extraídos de ${htmlChunks.length} chunks HTML.`);
    
    // Atribuir ordemOriginal sequencialmente
    allExtractedPleitos.forEach((pleito, index) => {
        pleito.ordemOriginal = index + 1; // 1-based index
    });

    return allExtractedPleitos;
  }
};