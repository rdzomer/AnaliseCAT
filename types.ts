/* =======================================================
 *  DEFINIÇÕES E ENUMS CENTRAIS DA APLICAÇÃO CGIM
 * =======================================================
 *  Se adicionar campos novos aqui, lembre-se de
 *  atualizar também o geminiService e quaisquer
 *  formulários/páginas que dependam deles.
 * ------------------------------------------------------- */

/* ----------- PAPÉIS DE USUÁRIO (acesso) --------------- */
export enum Role {
  ANALISTA = 'ANALISTA',
  GESTOR   = 'GESTOR',
  ADMIN    = 'ADMIN',
}

/* ----------- CLASSIFICAÇÕES DE PLEITO ----------------- */
export enum TipoPleitoEnum {
  INCLUSAO       = 'Inclusão',
  REDUCAO        = 'Redução',
  AUMENTO        = 'Aumento',
  REMANEJAMENTO  = 'Remanejamento',
  RENOVACAO      = 'Renovação',
  OUTRO          = 'Outro',
}

export enum SessaoAnalise {
  ANALISE_CCM                   = 'Pleitos em análise na CCM',
  PENDENTES_CCM_BR              = 'Pleitos Pendentes na CCM: Pleitos do Brasil',
  PENDENTES_CCM_MERCOSUL        = 'Pleitos Pendentes na CCM: Pleitos dos demais Estados Partes do Mercosul',
  PENDENTES_CAT                 = 'Pleitos Pendentes no CAT',
  NOVOS_CAT                     = 'Pleitos Novos no CAT',
  PENDENTES_MERCOSUL_CAT        = 'Pleitos dos demais Estados Partes do Mercosul no CAT: Pendentes',
  NOVOS_MERCOSUL_CAT            = 'Pleitos dos demais Estados Partes do Mercosul no CAT: Novos',
  LETEC_GERAL                   = 'LETEC: Geral/Pendentes',
  LETEC_NOVOS                   = 'LETEC: Pleitos Novos',
  CMC_2715_PENDENTES            = 'CMC 27/15: Pendentes',
  CMC_2715_NOVOS                = 'CMC 27/15: Novos',
  LEBIT_BK_PENDENTES            = 'LEBIT/BK: Pendentes',
  LEBIT_BK_NOVOS                = 'LEBIT/BK: Novos',
  CT1_PENDENTES                 = 'CT-1: Pendentes',
  CT1_NOVOS                     = 'CT-1: Novos',
}

export enum StatusPleito {
  PENDENTE   = 'Pendente',
  DEFERIDO   = 'Deferido',
  INDEFERIDO = 'Indeferido',
  ANALISE    = 'Em Análise',
  ARQUIVADO  = 'Arquivado',
}

/* -------------- MODELAGEM DO PLEITO ------------------- */
export interface Pleito {
  /** Chave do documento no Firestore (opcional para novos) */
  id?: string;

  /* --- campos extraídos da pauta --- */
  ncm:                        string;
  produto:                    string;
  pleiteante?:                string;

  tipoPleito:                 TipoPleitoEnum;
  sessaoAnalise:              SessaoAnalise;
  status:                     StatusPleito;

  processoSEIPublico?:        string;
  processoSEIRestrito?:       string;
  reducaoII?:                 string;
  quotaValor?:                string;
  quotaUnidade?:              string;
  paisPendente?:              string;
  prazoResposta?:             string;
  situacaoEspecifica?:        string;
  paisEstadoParte?:           string;
  exTarifario?:               string;
  aliquotaAplicada?:          string;
  aliquotaAplicadaPleitoZero: boolean;
  quotaInfoAdicional?:        string;
  quotaPrazo?:                string;
  terminoVigenciaMedida?:     string;
  aliquotaPretendida?:        string;
  aliquotaIIVigente?:         string;
  aliquotaIIPleiteada?:       string;
  descricaoAlternativa?:      string;
  tipoPleitoDetalhado?:       string;
  tec?:                       string;
  alteracaoTarifaria?:        string;
  notaTecnica?:               string;
  posicaoCAT?:                string;

  /* --- metadados internos --- */
  prazo:            string;    /** ISO-date (yyyy-mm-dd)   */
  ordemOriginal:    number;    /** ordem que aparece na pauta */
  pautaIdentifier?: string;    /** “Pauta: arquivo.html” etc */
}
