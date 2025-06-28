// Will move TipoPleito enum here

export enum Role {
  ADMIN = 'Administrador', 
  ANALISTA = 'Analista',
  GESTOR = 'Gestor', // Changed from COORDENADOR_GERAL and 'Coordenador Geral'
}

export interface Usuario {
  id: string;
  nome: string;
  email: string;
  role: Role;
}

export interface Analista {
  id: string;
  nome: string;
  email?: string; 
}

export enum StatusPleito {
  PENDENTE = 'Pendente',
  EM_ANALISE = 'Em análise',
  AGUARDANDO_REUNIAO = 'Aguardando reunião',
  CONCLUIDO = 'Concluído',
}

// Moved from constants.ts to here to avoid circular dependencies if constants needs SessaoAnalise
export enum TipoPleitoEnum {
  INCLUSAO = 'Inclusão',
  EXCLUSAO = 'Exclusão',
  ELEVACAO = 'Elevação',
  REDUCAO = 'Redução',
  RENOVACAO = 'Renovação',
  RENOVACAO_FORA_PRAZO = 'Renovação fora do prazo',
}

export enum SessaoAnalise {
  // CCM
  BR_ANALISE_CCM = "Pleitos em análise na CCM", // Label atualizado
  PENDENTES_CCM_BR = "Pleitos Pendentes na CCM: Pleitos do Brasil",
  PENDENTES_CCM_MERCOSUL = "Pleitos Pendentes na CCM: Pleitos dos demais Estados Partes do Mercosul",
  // CAT
  PENDENTES_CAT = "Pleitos Pendentes no CAT",
  NOVOS_CAT = "Pleitos Novos no CAT",
  MERCOSUL_CAT_PENDENTES = "Pleitos dos demais Estados Partes do Mercosul no CAT: Pendentes",
  MERCOSUL_CAT_NOVOS = "Pleitos dos demais Estados Partes do Mercosul no CAT: Novos",
  // LETEC
  LETEC_PENDENTES = "LETEC: Geral/Pendentes",
  LETEC_NOVOS = "LETEC: Pleitos Novos",
  // CMC 27/15
  CMC_27_15_PENDENTES = "CMC 27/15: Pendentes",
  CMC_27_15_NOVOS = "CMC 27/15: Novos",
  // LEBIT/BK
  LEBIT_BK_PENDENTES = "LEBIT/BK: Pendentes",
  LEBIT_BK_NOVOS = "LEBIT/BK: Novos",
  // CT-1
  CT1_PENDENTES = "CT-1: Pendentes",
  CT1_NOVOS = "CT-1: Novos",
}


export interface Pleito {
  id: string;
  ncm: string; 
  produto: string;
  pleiteante?: string;
  tipoPleito: TipoPleitoEnum; // Changed to TipoPleitoEnum
  prazo: string; 
  responsavel?: Analista;
  dataDistribuicao?: string; 
  status: StatusPleito;
  ordemOriginal?: number; 
  pautaIdentifier?: string; // Novo campo para identificar a pauta de origem
  
  // Fields for dynamic forms based on SessaoAnalise
  sessaoAnalise?: SessaoAnalise;

  processoSEIPublico?: string; 
  processoSEIRestrito?: string; 
  
  // Common across many types, but placement varies
  notaTecnica?: string; 
  posicaoCAT?: string; 

  // Specific fields from headers
  reducaoII?: string;                 // "Redução do II (%)"
  quota?: string;                     // General quota field, can be used for "Quota"
  paisPendente?: string;              // "País pendente"
  prazoResposta?: string;             // "Prazo para resposta"
  situacaoEspecifica?: string;        // "Situação" (e.g. in CCM)
  paisEstadoParte?: string;           // "País" (Mercosul state)
  exTarifario?: string;               // "Ex tarifário" or "Ex-Tarifário"
  aliquotaAplicada?: string;          // "Alíquota Aplicada" or "Alíquota Aplicada (Pleito a 0%)"
  aliquotaAplicadaPleitoZero?: boolean; // For the "(Pleito a 0%)" part
  
  quotaValor?: string;                // Specific for "Quota" (value part)
  quotaUnidade?: string;              // "Unidade" for quota
  quotaInfoAdicional?: string;        // For the second "Quota" in CAT headers or other details
  quotaPrazo?: string;                // "Prazo" associated with quota in CAT headers

  terminoVigenciaMedida?: string;     // "Término de Vigência da medida em vigor"
  aliquotaPretendida?: string;        // "Alíquota Pretendida" or "Alíquota Solicitada"
  
  aliquotaIIVigente?: string;         // "Alíquota II Vigente" (CMC 27/15)
  aliquotaIIPleiteada?: string;       // "Alíquota II Pleiteada" (CMC 27/15)
  
  descricaoAlternativa?: string;      // "Descrição" (CMC 27/15 - if "Produto" is not used)
  
  tipoPleitoDetalhado?: string;       // "Pleito" (LEBIT/BK, CT-1) - Detailed description or type of claim
  tec?: string;                       // "TEC" (LEBIT/BK)
  alteracaoTarifaria?: string;        // "Alteração tarifária" (CT-1)
  
  // Original general analysis fields - may remain common at the bottom of the modal
  resumoPleito?: string;
  dadosComercio?: string;
  analiseTecnica?: string;
  sugestaoCGIM?: string;
  anotacoes?: Anotacao[];

  // Deprecated / Replaced by more specific fields above. Keep for now for data migration if any.
  paisOrigem?: string; // Potentially replaced by paisEstadoParte or paisPendente
}

export interface Anotacao {
  id: string;
  data: string; 
  texto: string;
  autor: string; 
}

export interface UploadedPautaFile {
  name: string;
  size: number;
  type: string;
}