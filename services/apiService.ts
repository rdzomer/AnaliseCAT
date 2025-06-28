import { Pleito, Analista, StatusPleito, TipoPleitoEnum, SessaoAnalise } from '../types'; // Updated TipoPleito to TipoPleitoEnum
import { MOCK_PLEITOS, MOCK_ANALISTAS } from '../constants';

// Simulate a database
let pleitosDB: Pleito[] = MOCK_PLEITOS.length > 0 ? JSON.parse(JSON.stringify(MOCK_PLEITOS)) : []; 
let analistasDB: Analista[] = JSON.parse(JSON.stringify(MOCK_ANALISTAS));

const simulateDelay = <T,>(data: T, delay: number = 300): Promise<T> => {
  return new Promise(resolve => setTimeout(() => resolve(data), delay));
};

export const apiService = {
  getPleitos: async (): Promise<Pleito[]> => {
    console.log('API: Fetching pleitos...');
    return simulateDelay(JSON.parse(JSON.stringify(pleitosDB))); 
  },

  getPleitoById: async (id: string): Promise<Pleito | undefined> => {
    console.log(`API: Fetching pleito ${id}...`);
    const pleito = pleitosDB.find(p => p.id === id);
    return simulateDelay(pleito ? JSON.parse(JSON.stringify(pleito)) : undefined);
  },

  createPleito: async (pleitoData: Omit<Pleito, 'id'>): Promise<Pleito> => {
    console.log('API: Creating pleito...', pleitoData);
    const newPleito: Pleito = {
      id: `pleito-${Date.now()}-${Math.random().toString(16).slice(2)}`,
      // Required base fields
      ncm: pleitoData.ncm,
      produto: pleitoData.produto,
      tipoPleito: pleitoData.tipoPleito || TipoPleitoEnum.INCLUSAO, // Default if not provided
      prazo: pleitoData.prazo,
      status: pleitoData.status || StatusPleito.PENDENTE,
      ordemOriginal: pleitoData.ordemOriginal, 
      pautaIdentifier: pleitoData.pautaIdentifier, // Include pautaIdentifier
      
      // New SessaoAnalise field
      sessaoAnalise: pleitoData.sessaoAnalise,

      // Optional base fields
      pleiteante: pleitoData.pleiteante || '',
      processoSEIPublico: pleitoData.processoSEIPublico || '',
      processoSEIRestrito: pleitoData.processoSEIRestrito || '',
      responsavel: pleitoData.responsavel,
      dataDistribuicao: pleitoData.dataDistribuicao,
      
      // Specific dynamic fields
      notaTecnica: pleitoData.notaTecnica || '',
      posicaoCAT: pleitoData.posicaoCAT || '',
      reducaoII: pleitoData.reducaoII || '',
      quota: pleitoData.quota || '', // General quota, might be replaced by specific ones below
      paisPendente: pleitoData.paisPendente || '',
      prazoResposta: pleitoData.prazoResposta || '',
      situacaoEspecifica: pleitoData.situacaoEspecifica || '',
      paisEstadoParte: pleitoData.paisEstadoParte || '',
      exTarifario: pleitoData.exTarifario || '',
      aliquotaAplicada: pleitoData.aliquotaAplicada || '',
      aliquotaAplicadaPleitoZero: pleitoData.aliquotaAplicadaPleitoZero || false,
      quotaValor: pleitoData.quotaValor || '',
      quotaUnidade: pleitoData.quotaUnidade || '',
      quotaInfoAdicional: pleitoData.quotaInfoAdicional || '',
      quotaPrazo: pleitoData.quotaPrazo || '',
      terminoVigenciaMedida: pleitoData.terminoVigenciaMedida || '',
      aliquotaPretendida: pleitoData.aliquotaPretendida || '',
      aliquotaIIVigente: pleitoData.aliquotaIIVigente || '',
      aliquotaIIPleiteada: pleitoData.aliquotaIIPleiteada || '',
      descricaoAlternativa: pleitoData.descricaoAlternativa || '',
      tipoPleitoDetalhado: pleitoData.tipoPleitoDetalhado || '',
      tec: pleitoData.tec || '',
      alteracaoTarifaria: pleitoData.alteracaoTarifaria || '',
      
      // CGIM Analysis fields
      resumoPleito: pleitoData.resumoPleito || '',
      dadosComercio: pleitoData.dadosComercio || '',
      analiseTecnica: pleitoData.analiseTecnica || '',
      sugestaoCGIM: pleitoData.sugestaoCGIM || '',
      anotacoes: pleitoData.anotacoes || [],

      // Deprecated field
      paisOrigem: pleitoData.paisOrigem || '',
    };
    pleitosDB.unshift(newPleito); 
    return simulateDelay(JSON.parse(JSON.stringify(newPleito)));
  },

  updatePleito: async (updatedPleito: Pleito): Promise<Pleito> => {
    console.log('API: Updating pleito...', updatedPleito);
    const index = pleitosDB.findIndex(p => p.id === updatedPleito.id);
    if (index === -1) throw new Error('Pleito não encontrado para atualização.');
    
    // Ensure all fields are preserved or updated
    pleitosDB[index] = { 
        ...pleitosDB[index], 
        ...updatedPleito    
    };
    return simulateDelay(JSON.parse(JSON.stringify(pleitosDB[index])));
  },

  deletePleito: async (id: string): Promise<void> => {
    console.log(`API: Deleting pleito ${id}...`);
    pleitosDB = pleitosDB.filter(p => p.id !== id);
    return simulateDelay(undefined);
  },

  getAnalistas: async (): Promise<Analista[]> => {
    console.log('API: Fetching analistas...');
    return simulateDelay(JSON.parse(JSON.stringify(analistasDB)));
  },

  createAnalista: async (analistaData: Omit<Analista, 'id'>): Promise<Analista> => {
    console.log('API: Creating analista...', analistaData);
    const newAnalista: Analista = {
      ...analistaData,
      id: `analista-${Date.now()}-${Math.random().toString(16).slice(2)}`,
    };
    analistasDB.push(newAnalista);
    return simulateDelay(JSON.parse(JSON.stringify(newAnalista)));
  },

  updateAnalista: async (updatedAnalista: Analista): Promise<Analista> => {
     console.log('API: Updating analista...', updatedAnalista);
    const index = analistasDB.findIndex(a => a.id === updatedAnalista.id);
    if (index === -1) throw new Error('Analista não encontrado para atualização.');
    analistasDB[index] = { ...analistasDB[index], ...updatedAnalista };
    return simulateDelay(JSON.parse(JSON.stringify(analistasDB[index])));
  },
  
  deleteAnalista: async (id: string): Promise<void> => {
    console.log(`API: Deleting analista ${id}...`);
    analistasDB = analistasDB.filter(a => a.id !== id);
    return simulateDelay(undefined);
  },
};