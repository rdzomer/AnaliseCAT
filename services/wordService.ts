

import { Pleito, SessaoAnalise } from '../types'; // Added SessaoAnalise
// Named imports from docx
import {
  Document,
  Packer,
  Paragraph,
  TextRun,
  HeadingLevel,
  AlignmentType,
  Table, 
  TableRow, 
  TableCell, 
  WidthType, 
  BorderStyle, 
  VerticalAlign, 
  PageBreak, 
  TabStopType,
  TabStopPosition,
  PageNumber,
  NumberFormat,
  Tab,
  Header,
  Footer,
  LeaderType
} from 'docx';
import { SESSAO_ANALISE_OPTIONS } from '../constants'; // For SessaoAnalise labels

// Define the desired display order for SessaoAnalise sections based on the user's image
const SESSAO_ANALISE_DISPLAY_ORDER: SessaoAnalise[] = [
  SessaoAnalise.BR_ANALISE_CCM,
  SessaoAnalise.PENDENTES_CCM_BR,
  SessaoAnalise.PENDENTES_CCM_MERCOSUL,
  SessaoAnalise.PENDENTES_CAT,
  SessaoAnalise.NOVOS_CAT,
  SessaoAnalise.MERCOSUL_CAT_PENDENTES,
  SessaoAnalise.MERCOSUL_CAT_NOVOS,
  SessaoAnalise.LETEC_PENDENTES,
  SessaoAnalise.LETEC_NOVOS,
  SessaoAnalise.CMC_27_15_PENDENTES,
  SessaoAnalise.CMC_27_15_NOVOS,
  SessaoAnalise.LEBIT_BK_PENDENTES,
  SessaoAnalise.LEBIT_BK_NOVOS,
  SessaoAnalise.CT1_PENDENTES,
  SessaoAnalise.CT1_NOVOS,
];


export const generateConsolidatedWordDoc = async (pleitos: Pleito[]): Promise<void> => {
  console.log('Generating Word document for pleitos:', pleitos.length);

  if (pleitos.length === 0) {
    alert('Nenhum pleito fornecido para gerar o documento.'); // User-friendly alert
    throw new Error('Nenhum pleito fornecido para gerar o documento.');
  }

  const hoje = new Date();
  const dataFormatada = hoje.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' });

  // Document title paragraphs
  const titleParagraphs: Paragraph[] = [ 
    new Paragraph({ text: "MINISTÉRIO DO DESENVOLVIMENTO, INDÚSTRIA, COMÉRCIO E SERVIÇOS", alignment: AlignmentType.CENTER, style: "Normal" }),
    new Paragraph({ text: "SECRETARIA DE DESENVOLVIMENTO INDUSTRIAL, INOVAÇÃO, COMÉRCIO E SERVIÇOS", alignment: AlignmentType.CENTER, style: "Normal" }),
    new Paragraph({ text: "COORDENAÇÃO-GERAL DAS INDÚSTRIAS DE METALURGIA E DE BASE FLORESTAL (CGIM)", alignment: AlignmentType.CENTER, style: "Normal" }),
    new Paragraph({ text: "", spacing: { after: 200 } }), 
    new Paragraph({ children: [new TextRun({ text: `SUBSÍDIOS TÉCNICOS PARA REUNIÃO DO COMITÊ DE ALTERAÇÕES TARIFÁRIAS (CAT)`, bold: true })], alignment: AlignmentType.CENTER, style: "Normal" }),
    new Paragraph({ text: `Data: ${dataFormatada}`, alignment: AlignmentType.CENTER, style: "Normal" }),
    new Paragraph({ text: "", pageBreakBefore: true }), 
  ];
  
  const children: (Paragraph | Table)[] = [...titleParagraphs]; // Initialize with title paragraphs

  // --- Sumário ---
  children.push(new Paragraph({ children: [new TextRun({ text: "SUMÁRIO", bold: true, size: 28 })], alignment: AlignmentType.CENTER, spacing: { after: 300, before: 200 }, style:"Heading1" })); 
  
  const pleitosAgrupados: { [key: string]: Pleito[] } = {};
  const sessaoAnaliseLabels: { [key: string]: string } = {};
    SESSAO_ANALISE_OPTIONS.forEach(opt => {
    if(opt.value) sessaoAnaliseLabels[opt.value as string] = opt.label;
  });

  pleitos.forEach(pleito => {
    const categoriaKey = pleito.sessaoAnalise && sessaoAnaliseLabels[pleito.sessaoAnalise] 
                       ? pleito.sessaoAnalise 
                       : 'SEM_SESSAO_ANALISE_VALIDA'; 
    
    if (!pleitosAgrupados[categoriaKey]) {
        pleitosAgrupados[categoriaKey] = [];
    }
    pleitosAgrupados[categoriaKey].push(pleito);
  });
  
  // Sort categoriaKeys based on the SESSAO_ANALISE_DISPLAY_ORDER constant
  const sortedCategoriaKeys = Object.keys(pleitosAgrupados).sort((keyA, keyB) => {
    const indexA = SESSAO_ANALISE_DISPLAY_ORDER.indexOf(keyA as SessaoAnalise);
    const indexB = SESSAO_ANALISE_DISPLAY_ORDER.indexOf(keyB as SessaoAnalise);

    // If both keys are in the display order, sort by their position in that order
    if (indexA !== -1 && indexB !== -1) {
        return indexA - indexB;
    }
    // If only keyA is in display order, it comes first
    if (indexA !== -1) {
        return -1;
    }
    // If only keyB is in display order, it comes first
    if (indexB !== -1) {
        return 1;
    }
    // If neither is in display order (e.g., new/unknown SessaoAnalise types),
    // sort them alphabetically by their label as a fallback.
    const labelA = (sessaoAnaliseLabels[keyA] || keyA.replace(/_/g, ' ')).toUpperCase();
    const labelB = (sessaoAnaliseLabels[keyB] || keyB.replace(/_/g, ' ')).toUpperCase();
    return labelA.localeCompare(labelB);
  });
  
  let globalPleitoCounterForSumario = 0;
  sortedCategoriaKeys.forEach(sessaoKey => {
    const sessaoLabel = (sessaoAnaliseLabels[sessaoKey] || sessaoKey.replace(/_/g, ' ')).toUpperCase();
    children.push(new Paragraph({ 
        children: [new TextRun({ text: sessaoLabel, bold: true, size: 24 })], 
        spacing: { before: 250, after: 100 },
        style: "Normal" 
    }));

    // Sort pleitos within this section by their original pauta order
    const pleitosDaSessao = pleitosAgrupados[sessaoKey].sort((p1, p2) => (p1.ordemOriginal || Infinity) - (p2.ordemOriginal || Infinity));

    pleitosDaSessao.forEach(pleito => {
        globalPleitoCounterForSumario++;
        const textoSumario = `${globalPleitoCounterForSumario}) NCM ${pleito.ncm} - ${pleito.produto.substring(0, 70)}${pleito.produto.length > 70 ? '...' : ''}`;
        children.push(
            new Paragraph({
                children: [
                    new TextRun(textoSumario),
                    new Tab(), 
                    new TextRun({ children: [PageNumber.CURRENT] }) 
                ],
                tabStops: [{ type: TabStopType.RIGHT, position: TabStopPosition.MAX, leader: LeaderType.DOT }],
                style: "Normal",
                indent: { left: 400 } 
            })
        );
    });
  });
  children.push(new Paragraph({ text: "", pageBreakBefore: true })); 

  // --- Conteúdo Detalhado ---
  let globalPleitoCounterForContent = 0;
  sortedCategoriaKeys.forEach(sessaoKey => { // Iterate in the predefined section order
    const sessaoLabel = (sessaoAnaliseLabels[sessaoKey] || sessaoKey.replace(/_/g, ' ')).toUpperCase();
    children.push(new Paragraph({ 
        children: [new TextRun({ text: sessaoLabel })], 
        heading: HeadingLevel.HEADING_1, 
        spacing: { before: 400, after: 200 } 
    }));
    
    // Sort pleitos within this section by their original pauta order
    const pleitosDaSessao = pleitosAgrupados[sessaoKey].sort((p1, p2) => (p1.ordemOriginal || Infinity) - (p2.ordemOriginal || Infinity));

    pleitosDaSessao.forEach((pleito) => {
      globalPleitoCounterForContent++;
      children.push(new Paragraph({ 
          children: [new TextRun({ text: `${globalPleitoCounterForContent}) NCM ${pleito.ncm}; Produto: ${pleito.produto}` })], 
          heading: HeadingLevel.HEADING_2, 
          spacing: { before: 300, after: 150 }
      }));
      
      const tableRows: TableRow[] = [];
      const addTableRowTo = (rowsArray: TableRow[], label: string, value?: string | null | number | boolean) => {
          if (value === undefined || value === null || (typeof value === 'string' && value.trim() === '')) {
              return; // Do not add row if value is not provided
          }
          
          const valueCellParagraphs: Paragraph[] = [];
          const stringValue = String(value);

          if (stringValue.includes('\n')) {
              stringValue.split('\n').forEach(line => {
                  valueCellParagraphs.push(new Paragraph({ children: [new TextRun(line.trim())], style: "Normal" }));
              });
          } else {
              valueCellParagraphs.push(new Paragraph({ children: [new TextRun(stringValue)], style: "Normal" }));
          }

          rowsArray.push(new TableRow({
              children: [
                  new TableCell({
                      children: [new Paragraph({ children: [new TextRun({ text: label, bold: true })], style: "Normal" })],
                      verticalAlign: VerticalAlign.TOP,
                      width: { size: 25, type: WidthType.PERCENTAGE } // Approx 25% for label column
                  }),
                  new TableCell({
                      children: valueCellParagraphs,
                      verticalAlign: VerticalAlign.TOP,
                      width: { size: 75, type: WidthType.PERCENTAGE } // Approx 75% for value column
                  }),
              ],
          }));
      };

      // Populate tableRows using the helper
      addTableRowTo(tableRows, "Pleiteante", pleito.pleiteante);
      addTableRowTo(tableRows, "Tipo de Pleito (Geral)", pleito.tipoPleito);
      
      addTableRowTo(tableRows, "Ex-tarifário", pleito.exTarifario);
      addTableRowTo(tableRows, "Alíquota Aplicada", pleito.aliquotaAplicada);
      if(pleito.aliquotaAplicadaPleitoZero) addTableRowTo(tableRows, "  (Obs: Alíquota Aplicada indica Pleito a 0%)", "Sim");
      addTableRowTo(tableRows, "Alíquota Pretendida/Solicitada", pleito.aliquotaPretendida);
      addTableRowTo(tableRows, "Quota (Valor)", pleito.quotaValor);
      addTableRowTo(tableRows, "Quota (Unidade)", pleito.quotaUnidade);
      addTableRowTo(tableRows, "Quota (Informação Adicional)", pleito.quotaInfoAdicional);
      addTableRowTo(tableRows, "Quota (Prazo)", pleito.quotaPrazo ? new Date(pleito.quotaPrazo + 'T00:00:00').toLocaleDateString('pt-BR') : undefined);
      addTableRowTo(tableRows, "Redução do II (%)", pleito.reducaoII);
      addTableRowTo(tableRows, "País (Estado Parte Mercosul)", pleito.paisEstadoParte);
      addTableRowTo(tableRows, "País Pendente (CCM)", pleito.paisPendente);
      addTableRowTo(tableRows, "Prazo para Resposta (CCM/Mercosul)", pleito.prazoResposta ? new Date(pleito.prazoResposta + 'T00:00:00').toLocaleDateString('pt-BR') : undefined);
      addTableRowTo(tableRows, "Situação Específica (CCM)", pleito.situacaoEspecifica);
      addTableRowTo(tableRows, "Término de Vigência da Medida em Vigor", pleito.terminoVigenciaMedida ? new Date(pleito.terminoVigenciaMedida + 'T00:00:00').toLocaleDateString('pt-BR') : undefined);
      addTableRowTo(tableRows, "Alíquota II Vigente (CMC 27/15)", pleito.aliquotaIIVigente);
      addTableRowTo(tableRows, "Alíquota II Pleiteada (CMC 27/15)", pleito.aliquotaIIPleiteada);
      addTableRowTo(tableRows, "Descrição Alternativa (CMC 27/15)", pleito.descricaoAlternativa);
      addTableRowTo(tableRows, "TEC (LEBIT/BK)", pleito.tec);
      addTableRowTo(tableRows, "Alteração Tarifária (CT-1)", pleito.alteracaoTarifaria);
      addTableRowTo(tableRows, "Tipo de Pleito Detalhado (LEBIT/BK, CT-1)", pleito.tipoPleitoDetalhado);
      
      addTableRowTo(tableRows, "Prazo (Reunião CAT)", new Date(pleito.prazo + 'T00:00:00').toLocaleDateString('pt-BR'));
      addTableRowTo(tableRows, "Processo SEI (Público)", pleito.processoSEIPublico);
      addTableRowTo(tableRows, "Processo SEI (Restrito)", pleito.processoSEIRestrito);
      if (pleito.responsavel) addTableRowTo(tableRows, "Analista Responsável (CGIM)", pleito.responsavel.nome);
      addTableRowTo(tableRows, "Status (CGIM)", pleito.status);
      if (pleito.dataDistribuicao) addTableRowTo(tableRows, "Data de Distribuição (CGIM)", new Date(pleito.dataDistribuicao + 'T00:00:00').toLocaleDateString('pt-BR'));

      addTableRowTo(tableRows, "Situação Atual / Resumo do Pleito", pleito.resumoPleito);
      addTableRowTo(tableRows, "Dados de Comércio (Importações, Exportações, Preços, etc.)", pleito.dadosComercio);
      addTableRowTo(tableRows, "Análise Técnica (Capacidade Nacional, Precedentes, etc.)", pleito.analiseTecnica);
      addTableRowTo(tableRows, "Notas Técnicas (CGIM)", pleito.notaTecnica); 
      addTableRowTo(tableRows, "Posição CAT (Registrada)", pleito.posicaoCAT);   
      addTableRowTo(tableRows, "Sugestão CGIM (Recomendação e Justificativa)", pleito.sugestaoCGIM);
      
      if (tableRows.length > 0) {
        const pleitoTable = new Table({
            rows: tableRows,
            width: {
                size: 9600, // Represents 100% of available width in standard page setup
                type: WidthType.DXA, // Using DXA for fixed total width that columns will share by percentage
            },
             // columnWidths: [2400, 7200], // Explicit DXA values for ~25% and ~75%
            borders: {
                top: { style: BorderStyle.SINGLE, size: 6, color: "auto" }, // size in 1/8th of a point
                bottom: { style: BorderStyle.SINGLE, size: 6, color: "auto" },
                left: { style: BorderStyle.SINGLE, size: 6, color: "auto" },
                right: { style: BorderStyle.SINGLE, size: 6, color: "auto" },
                insideHorizontal: { style: BorderStyle.SINGLE, size: 6, color: "auto" },
                insideVertical: { style: BorderStyle.SINGLE, size: 6, color: "auto" },
            },
        });
        children.push(pleitoTable);
        children.push(new Paragraph({text: "", spacing: { after: 300 }})); // Spacing after table
      }
    });
  });

  const doc = new Document({
    creator: "CGIM App",
    description: "Subsídios Técnicos para Reunião CAT",
    title: "Subsídios Técnicos CAT",
    styles: {
      paragraphStyles: [
        { id: "Normal", name: "Normal", run: { size: 22, font: "Arial" }, paragraph: { spacing: { line: 276, before:0, after: 80 } } }, 
        { id: "Heading1", name: "Heading 1", basedOn: "Normal", next: "Normal", run: { size: 28, bold: true, font: "Arial", color: "2E74B5" }, paragraph: { spacing: { before: 240, after: 120 }, keepLines: true, keepNext: true } }, 
        { id: "Heading2", name: "Heading 2", basedOn: "Normal", next: "Normal", run: { size: 24, bold: true, font: "Arial", color: "385723" }, paragraph: { spacing: { before: 200, after: 100 }, keepLines: true, keepNext: true } }, 
      ],
    },
    sections: [{
      properties: {
        page: {
            margin: { top: 1440, right: 1440, bottom: 1440, left: 1440 }, // 1 inch margins
             pageNumbers: {
                start: 1,
                formatType: NumberFormat.DECIMAL,
            },
        },
         titlePage: false, 
      },
      headers: {
        default: new Header({ 
            children: [new Paragraph({ children: [new TextRun("Subsídios Técnicos CGIM para CAT")], alignment: AlignmentType.RIGHT, style:"Normal" })],
        }),
      },
      footers: {
        default: new Footer({ 
            children: [
                new Paragraph({
                    children: [
                        new TextRun("Página "),
                        new TextRun({ children: [PageNumber.CURRENT] }),
                        new TextRun(" de "),
                        new TextRun({ children: [PageNumber.TOTAL_PAGES] }),
                    ],
                    alignment: AlignmentType.CENTER,
                    style:"Normal"
                }),
            ],
        }),
      },
      children: children,
    }],
  });

  Packer.toBlob(doc).then(blob => {
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `CGIM_Subsídios_CAT_${new Date().toISOString().split('T')[0]}.docx`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(link.href);
    console.log('Word document download initiated.');
    alert("Documento de Subsídios gerado e download iniciado.");
  }).catch(error => {
    console.error("Error generating DOCX:", error);
    alert("Erro ao gerar documento Word. Verifique o console para detalhes.");
  });
};


// generateSinglePleitoWordDoc remains largely unchanged but could be updated similarly if needed.
// For now, focusing on the consolidated document.
export const generateSinglePleitoWordDoc = async (pleito: Pleito): Promise<void> => {
    console.log(`Simulating Word document generation for pleito: ${pleito.id}`);
    
    const singleContent: Paragraph[] = [ 
        new Paragraph({children: [new TextRun({ text: "SUBSÍDIO INDIVIDUAL - CGIM", bold: true})], heading: HeadingLevel.HEADING_1, alignment: AlignmentType.CENTER }),
        new Paragraph({text: `NCM: ${pleito.ncm}`, style: "Normal"}),
        new Paragraph({text: `Produto: ${pleito.produto}`, style: "Normal"}),
        new Paragraph({text: `Pleiteante: ${pleito.pleiteante || 'N/A'}`, style: "Normal"}),
        new Paragraph({text: `Tipo de Alteração (Sessão): ${SESSAO_ANALISE_OPTIONS.find(o => o.value === pleito.sessaoAnalise)?.label || pleito.sessaoAnalise || 'N/A'}`, style: "Normal"}),
        new Paragraph({text: `Tipo de Pleito (Geral): ${pleito.tipoPleito}`, style: "Normal"}),
        new Paragraph({text: `Prazo (Reunião CAT): ${new Date(pleito.prazo + 'T00:00:00').toLocaleDateString('pt-BR')}`, style: "Normal"}),
        new Paragraph({text: `Status (CGIM): ${pleito.status}`, style: "Normal"}),
        
        new Paragraph({text: "", spacing: {after: 100}}),
        new Paragraph({children: [new TextRun({ text: "Situação Atual / Resumo do Pleito:", bold: true})], style: "Normal"}),
        ...(pleito.resumoPleito || 'Não informado.').split('\n').map(line => new Paragraph({text: line, style: "Normal"})),
        
        new Paragraph({text: "", spacing: {after: 100}}),
        new Paragraph({children: [new TextRun({ text: "Dados de Comércio:", bold: true})], style: "Normal"}),
        ...(pleito.dadosComercio || 'Não informado.').split('\n').map(line => new Paragraph({text: line, style: "Normal"})),

        new Paragraph({text: "", spacing: {after: 100}}),
        new Paragraph({children: [new TextRun({ text: "Análise Técnica:", bold: true})], style: "Normal"}),
        ...(pleito.analiseTecnica || 'Não informado.').split('\n').map(line => new Paragraph({text: line, style: "Normal"})),

        new Paragraph({text: "", spacing: {after: 100}}),
        new Paragraph({children: [new TextRun({ text: "Notas Técnicas (CGIM):", bold: true})], style: "Normal"}),
        ...(pleito.notaTecnica || 'Não informado.').split('\n').map(line => new Paragraph({text: line, style: "Normal"})),

        new Paragraph({text: "", spacing: {after: 100}}),
        new Paragraph({children: [new TextRun({ text: "Posição CAT (Registrada):", bold: true})], style: "Normal"}),
        ...(pleito.posicaoCAT || 'Não informado.').split('\n').map(line => new Paragraph({text: line, style: "Normal"})),

        new Paragraph({text: "", spacing: {after: 100}}),
        new Paragraph({children: [new TextRun({ text: "Sugestão CGIM:", bold: true})], style: "Normal"}),
        ...(pleito.sugestaoCGIM || 'Não informado.').split('\n').map(line => new Paragraph({text: line, style: "Normal"})),
    ];

    const doc = new Document({
        creator: "CGIM App",
        sections: [{ children: singleContent }],
         styles: {
          paragraphStyles: [
            { id: "Normal", name: "Normal", run: { size: 22, font: "Arial" }, paragraph: { spacing: { line: 276, after: 80 } } },
            { id: "Heading1", name: "Heading 1", basedOn: "Normal", next: "Normal", run: { size: 28, bold: true, font: "Arial", color: "2E74B5" }, paragraph: { spacing: { before: 240, after: 120 } } },
          ],
        },
    });

    Packer.toBlob(doc).then(blob => {
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = `Subsídio_${pleito.ncm.replace(/\./g,'')}_${(pleito.produto || 'produto').substring(0,10)}_${pleito.id.substring(0,5)}.docx`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(link.href);
        alert(`Documento Word para o pleito ${pleito.ncm} gerado e baixado.`);
    }).catch(error => {
        console.error("Error generating single DOCX:", error);
        alert("Erro ao gerar documento Word individual. Verifique o console.");
    });
};