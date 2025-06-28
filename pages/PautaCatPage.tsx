

import React, { useState, useMemo, useEffect, useCallback, useRef } from 'react';
import { Pleito, Analista, StatusPleito, UploadedPautaFile, TipoPleitoEnum, SessaoAnalise, Role } from '../types';
import { MOCK_ANALISTAS, STATUS_OPTIONS, ANALISTAS_OPTIONS as ANALISTAS_OPTIONS_CONST, TIPO_PLEITO_OPTIONS, SESSAO_ANALISE_OPTIONS } from '../constants';
import Button from '../components/Button';
import Input from '../components/Input';
import Select from '../components/Select';
import { PlusIcon } from '../components/icons/PlusIcon';
import { EyeIcon } from '../components/icons/EyeIcon';
import { DownloadIcon } from '../components/icons/DownloadIcon';
import { DeleteIcon } from '../components/icons/DeleteIcon';
import { UploadIcon } from '../components/icons/UploadIcon'; // Import UploadIcon
import { PleitoEditModal } from './PleitoEditModal'; 
import { apiService } from '../services/apiService';
import { geminiService } from '../services/geminiService'; 
import { generateConsolidatedWordDoc } from '../services/wordService';
import LoadingSpinner from '../components/LoadingSpinner';
import { useAuth } from '../hooks/useAuth';

const NCM_FILTER_LIST_KEY = 'cgimNcmFilterList';
const NCM_FILTER_TOGGLE_KEY = 'cgimFilterToggleState';

export const PautaCatPage: React.FC = () => {
  const [pleitos, setPleitos] = useState<Pleito[]>([]);
  const [isLoading, setIsLoading] = useState(true); 
  const [deletingId, setDeletingId] = useState<string | null>(null); 
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  
  const [searchTerm, setSearchTerm] = useState('');
  const [filterNCM, setFilterNCM] = useState('');
  const [filterStatus, setFilterStatus] = useState<StatusPleito | ''>('');
  const [filterResponsavel, setFilterResponsavel] = useState<string | ''>(''); 
  const [filterPrazo, setFilterPrazo] = useState('');
  const [filterPleiteante, setFilterPleiteante] = useState('');
  const [filterSessao, setFilterSessao] = useState<SessaoAnalise | ''>('');
  const [filterPauta, setFilterPauta] = useState<string | ''>('');

  const [cgimNcmList, setCgimNcmList] = useState<string[]>([]);
  const [onlyCgimNcms, setOnlyCgimNcms] = useState<boolean>(() => {
    return JSON.parse(localStorage.getItem(NCM_FILTER_TOGGLE_KEY) || 'false');
  });

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [currentPleito, setCurrentPleito] = useState<Pleito | Partial<Pleito> | null>(null); 
  const [isEditing, setIsEditing] = useState(false);

  const [isImporting, setIsImporting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const auth = useAuth();

  useEffect(() => {
    const storedNcms = localStorage.getItem(NCM_FILTER_LIST_KEY);
    if (storedNcms) {
      setCgimNcmList(JSON.parse(storedNcms));
    }
    localStorage.setItem(NCM_FILTER_TOGGLE_KEY, JSON.stringify(onlyCgimNcms));
  }, [onlyCgimNcms]);

  const fetchPleitos = useCallback(async () => {
    if (!isImporting) setIsLoading(true);
    try {
      const data = await apiService.getPleitos();
      setPleitos(data);
      setError(null);
    } catch (e) {
      setError('Falha ao carregar pleitos.');
      console.error(e);
    } finally {
      if (!isImporting) setIsLoading(false);
    }
  }, [isImporting]);

  useEffect(() => {
    fetchPleitos();
  }, [fetchPleitos]);

  const uniquePautas = useMemo(() => {
    const pautas = new Set(pleitos.map(p => p.pautaIdentifier).filter(Boolean));
    return Array.from(pautas).map(pauta => ({ value: pauta as string, label: pauta as string }));
  }, [pleitos]);

  const filteredPleitos = useMemo(() => {
    const filtered = pleitos.filter(p => {
      const searchTermLower = searchTerm.toLowerCase();
      const matchesSearchTerm = p.produto.toLowerCase().includes(searchTermLower) || 
                                p.ncm.includes(searchTerm) ||
                                (p.processoSEIPublico && p.processoSEIPublico.toLowerCase().includes(searchTermLower)) ||
                                (p.processoSEIRestrito && p.processoSEIRestrito.toLowerCase().includes(searchTermLower)) ||
                                (p.pleiteante && p.pleiteante.toLowerCase().includes(searchTermLower));
      const matchesNCM = filterNCM ? p.ncm.toUpperCase().includes(filterNCM.toUpperCase()) : true;
      const matchesStatus = filterStatus ? p.status === filterStatus : true;
      const matchesResponsavel = filterResponsavel ? p.responsavel?.id === filterResponsavel : true;
      const matchesPrazo = filterPrazo ? p.prazo === filterPrazo : true; 
      const matchesPleiteante = filterPleiteante ? (p.pleiteante && p.pleiteante.toLowerCase().includes(filterPleiteante.toLowerCase())) : true;
      const matchesSessao = filterSessao ? p.sessaoAnalise === filterSessao : true;
      const matchesPauta = filterPauta ? p.pautaIdentifier === filterPauta : true;
      const matchesCgimFilter = !onlyCgimNcms || (onlyCgimNcms && cgimNcmList.includes(p.ncm));

      return matchesSearchTerm && matchesNCM && matchesStatus && matchesResponsavel && matchesPrazo && matchesPleiteante && matchesSessao && matchesPauta && matchesCgimFilter;
    });

    return filtered.sort((a, b) => {
      if (a.ordemOriginal !== undefined && b.ordemOriginal !== undefined) {
        return a.ordemOriginal - b.ordemOriginal;
      }
      if (a.ordemOriginal !== undefined) {
        return -1;
      }
      if (b.ordemOriginal !== undefined) {
        return 1; 
      }
      return a.id.localeCompare(b.id);
    });
  }, [pleitos, searchTerm, filterNCM, filterStatus, filterResponsavel, filterPrazo, filterPleiteante, filterSessao, filterPauta, onlyCgimNcms, cgimNcmList]);


  const handleOpenModal = (pleito?: Pleito) => {
    if (pleito) {
      setCurrentPleito(pleito);
      setIsEditing(true);
    } else {
      setCurrentPleito({
        ncm: '',
        produto: '',
        tipoPleito: TipoPleitoEnum.INCLUSAO, 
        prazo: new Date().toISOString().split('T')[0], 
        status: StatusPleito.PENDENTE, 
        sessaoAnalise: SESSAO_ANALISE_OPTIONS[0]?.value as SessaoAnalise, 
        pautaIdentifier: 'Entrada Manual', // Set for new manual pleitos
        pleiteante: '',
        processoSEIPublico: '',
        processoSEIRestrito: '',
        notaTecnica: '',
        posicaoCAT: '',
        reducaoII: '',
        paisPendente: '',
        prazoResposta: '',
        situacaoEspecifica: '',
        paisEstadoParte: '',
        exTarifario: '',
        aliquotaAplicada: '',
        aliquotaPretendida: '',
        aliquotaIIVigente: '',
        aliquotaIIPleiteada: '',
        quotaValor: '',
        quotaUnidade: '',
        quotaInfoAdicional: '',
        quotaPrazo: '',
        terminoVigenciaMedida: '',
        descricaoAlternativa: '',
        tipoPleitoDetalhado: '',
        tec: '',
        alteracaoTarifaria: '',
        resumoPleito: '',
        dadosComercio: '',
        analiseTecnica: '',
        sugestaoCGIM: '',
        anotacoes: [],
      });
      setIsEditing(false);
    }
    setIsModalOpen(true);
  };

  const handleSavePleito = async (pleitoToSave: Pleito | Partial<Pleito>) => {
    try {
      if ('id' in pleitoToSave && pleitoToSave.id) { 
        const savedPleito = await apiService.updatePleito(pleitoToSave as Pleito);
        setPleitos(prevPleitos => prevPleitos.map(p => p.id === savedPleito.id ? savedPleito : p));
      } else { 
        const newPleito = await apiService.createPleito(pleitoToSave as Omit<Pleito, 'id'>);
        setPleitos(prevPleitos => [newPleito, ...prevPleitos]); 
      }
      setIsModalOpen(false);
      setCurrentPleito(null);
      setError(null);
      setSuccessMessage("Pleito salvo com sucesso!");
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (e) {
        const msg = `Falha ao salvar o pleito: ${e instanceof Error ? e.message : 'Erro desconhecido'}`;
        setError(msg);
        console.error(e);
        setTimeout(() => setError(null), 5000);
    }
  };

  const handleExportWord = async () => {
    if (filteredPleitos.length === 0) {
      alert("Nenhum pleito para exportar com os filtros atuais.");
      return;
    }
    try {
      await generateConsolidatedWordDoc(filteredPleitos);
      setSuccessMessage("Documento Word gerado com sucesso.");
    } catch (error) {
      const msg = `Erro ao gerar documento Word: ${error instanceof Error ? error.message : 'Erro desconhecido'}`;
      setError(msg);
      alert(msg); 
    }
    setTimeout(() => {
        setSuccessMessage(null);
        setError(null);
    }, 3000);
  };
  
  const handleDeletePleito = async (pleitoId: string) => {
    setDeletingId(pleitoId);
    try {
        await apiService.deletePleito(pleitoId);
        setPleitos(prevPleitos => prevPleitos.filter(p => p.id !== pleitoId));
        setError(null); 
        setSuccessMessage("Pleito excluído com sucesso.");
    } catch (e) {
        const errorMessage = e instanceof Error ? e.message : 'Erro desconhecido';
        console.error("HANDLE_DELETE_PLEITO_ERROR:", e);
        setError(`Falha ao excluir o pleito: ${errorMessage}`);
    } finally {
        setDeletingId(null);
        setTimeout(() => {
            setSuccessMessage(null);
            setError(null);
        }, 3000);
    }
  };

  const handleImportPautaClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    let documentText: string;

    if (file.type.startsWith('text/html') || /\.(html|htm)$/i.test(file.name)) {
      try {
        documentText = await file.text();
      } catch (readError) {
        setError("Erro ao ler o arquivo HTML.");
        console.error("HTML read error:", readError);
        if(fileInputRef.current) fileInputRef.current.value = "";
        setIsImporting(false); 
        setTimeout(() => setError(null), 3000);
        return;
      }
    } else {
      setError("Formato de arquivo inválido. Por favor, selecione um arquivo HTML (.html ou .htm).");
      if(fileInputRef.current) fileInputRef.current.value = "";
      setTimeout(() => setError(null), 3000);
      return;
    }

    setIsImporting(true);
    setError(null);
    setSuccessMessage(null);
    
    console.log(`Sending HTML content from ${file.name} (length: ${documentText.length}, first 500 chars) to Gemini:`, documentText.substring(0, 500) + "...");

    try {
      const extractedPleitos = await geminiService.extractPleitosFromDocumentText(documentText, file.name);

      if (extractedPleitos.length === 0) {
        setSuccessMessage(`Nenhum pleito extraído do arquivo ${file.name}. O Gemini pode não ter encontrado dados formatados como pleitos ou o conteúdo fornecido não continha pleitos claros.`);
      } else {
        let createdCount = 0;
        for (const pleitoData of extractedPleitos) {
          try {
            const pleitoToCreate: Omit<Pleito, 'id'> = {
              ncm: pleitoData.ncm || 'NCM_PENDENTE',
              produto: pleitoData.produto || 'PRODUTO_PENDENTE',
              prazo: pleitoData.prazo || new Date().toISOString().split('T')[0],
              status: pleitoData.status || StatusPleito.PENDENTE,
              tipoPleito: pleitoData.tipoPleito || TipoPleitoEnum.INCLUSAO,
              sessaoAnalise: pleitoData.sessaoAnalise || SessaoAnalise.NOVOS_CAT,
              ordemOriginal: pleitoData.ordemOriginal, 
              pautaIdentifier: pleitoData.pautaIdentifier, // Pass pautaIdentifier from Gemini
              ...pleitoData, 
            };
            await apiService.createPleito(pleitoToCreate);
            createdCount++;
          } catch (createError) {
            console.error("Falha ao criar pleito individualmente:", createError, pleitoData);
          }
        }
        setSuccessMessage(`${createdCount} de ${extractedPleitos.length} pleitos foram importados de ${file.name}.`);
        await fetchPleitos(); 
      }
    } catch (e) {
      const msg = `Erro ao importar pauta: ${e instanceof Error ? e.message : String(e)}`;
      setError(msg);
      console.error(msg, e);
    } finally {
      setIsImporting(false);
      if(fileInputRef.current) fileInputRef.current.value = ""; 
      setTimeout(() => {
        setSuccessMessage(null);
        setError(null);
      }, 7000);
    }
  };


  if (isLoading && pleitos.length === 0 && !isImporting) {
    return <div className="flex justify-center items-center h-64"><LoadingSpinner /></div>;
  }

  const showError = error && (!isLoading || pleitos.length > 0);

  return (
    <div className="space-y-6">
      <div className="bg-white p-6 shadow-lg rounded-xl">
        <div className="flex flex-col md:flex-row justify-between items-center mb-6 gap-4">
          <h2 className="text-2xl font-semibold text-gray-800">Pleitos Tarifários CGIM</h2>
          <div className="flex gap-2 flex-wrap">
            <Button onClick={() => handleOpenModal()} leftIcon={<PlusIcon className="w-5 h-5"/>} variant="primary" disabled={isImporting}>
              Adicionar Novo Pleito
            </Button>
            <Button onClick={handleImportPautaClick} leftIcon={isImporting ? <LoadingSpinner size="sm" color="text-white"/> : <UploadIcon className="w-4 h-4"/>} variant="primary" disabled={isImporting}>
              {isImporting ? 'Importando...' : 'Importar Pauta (HTML)'}
            </Button>
            <input type="file" ref={fileInputRef} onChange={handleFileChange} accept=".html,.htm" style={{ display: 'none' }} />
            <Button onClick={handleExportWord} leftIcon={<DownloadIcon className="w-4 h-4" />} variant="secondary" disabled={filteredPleitos.length === 0 || isImporting}>
                Exportar Word (Subsídios)
            </Button>
          </div>
        </div>
         {showError && <p className="text-red-500 bg-red-100 p-3 rounded-md mb-4">{error} <Button size="sm" variant="ghost" onClick={() => setError(null)}>Fechar</Button></p>}
         {successMessage && <p className="text-green-700 bg-green-100 p-3 rounded-md mb-4">{successMessage} <Button size="sm" variant="ghost" onClick={() => setSuccessMessage(null)}>Fechar</Button></p>}


        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-7 gap-4 mb-6 p-4 border border-gray-200 rounded-lg bg-gray-50 items-end">
           <Input 
            label="Buscar Geral"
            placeholder="Produto, NCM, Pleiteante, SEI..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            className="xl:col-span-2" 
            />
          <Input label="NCM Específico" placeholder="Ex: 8471.50.10" value={filterNCM} onChange={e => setFilterNCM(e.target.value)} />
          <Select label="Status" options={STATUS_OPTIONS} value={filterStatus} onChange={e => setFilterStatus(e.target.value as StatusPleito | '')} />
          <Select label="Responsável" options={ANALISTAS_OPTIONS_CONST} value={filterResponsavel} onChange={e => setFilterResponsavel(e.target.value)} />
          <Select label="Tipo de Alteração" options={SESSAO_ANALISE_OPTIONS} value={filterSessao} onChange={e => setFilterSessao(e.target.value as SessaoAnalise | '')} />
          <Select label="Pauta de Origem" options={uniquePautas} value={filterPauta} onChange={e => setFilterPauta(e.target.value)} />
          
          <div className="flex items-center justify-center pb-1" title={cgimNcmList.length === 0 ? "Importe uma lista de NCMs em Configurações para habilitar este filtro." : ""}>
            <label className="flex items-center space-x-2 cursor-pointer">
              <input 
                type="checkbox"
                checked={onlyCgimNcms}
                onChange={(e) => setOnlyCgimNcms(e.target.checked)}
                disabled={cgimNcmList.length === 0}
                className="form-checkbox h-5 w-5 text-blue-600 rounded disabled:opacity-50 disabled:cursor-not-allowed" 
              />
              <span className={`text-sm font-medium ${cgimNcmList.length === 0 ? 'text-gray-400' : 'text-gray-700'}`}>
                Apenas NCMs CGIM
              </span>
            </label>
          </div>
        </div>
      </div>

      <div className="bg-white shadow-lg rounded-xl overflow-x-auto">
        <table className="w-full min-w-max text-sm text-left text-gray-700">
          <thead className="text-xs text-gray-700 uppercase bg-gray-100">
            <tr>
              {['NCM', 'Produto', 'Pauta de Origem', 'Pleiteante', 'Tipo Alteração', 'Prazo Reunião', 'Responsável', 'Status', 'Ações'].map(header => (
                <th key={header} scope="col" className="px-4 py-3 whitespace-nowrap">{header}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {isLoading && pleitos.length > 0 && !isImporting &&( 
                 <tr><td colSpan={9} className="text-center py-10"><LoadingSpinner/></td></tr>
            )}
            {!isLoading && filteredPleitos.length === 0 && !isImporting && (
                 <tr><td colSpan={9} className="text-center py-10 text-gray-500">Nenhum pleito encontrado. Adicione um novo pleito, importe uma pauta ou ajuste os filtros.</td></tr>
            )}
            {filteredPleitos.map(pleito => (
              <tr key={pleito.id} className="bg-white border-b hover:bg-gray-50">
                <td className="px-4 py-3 font-medium text-gray-900 whitespace-nowrap">{pleito.ncm}</td>
                <td className="px-4 py-3 max-w-xs truncate" title={pleito.produto}>{pleito.produto}</td>
                <td className="px-4 py-3 max-w-xs truncate text-xs" title={pleito.pautaIdentifier}>{pleito.pautaIdentifier || <span className="text-gray-400 italic">N/A</span>}</td>
                <td className="px-4 py-3 max-w-xs truncate" title={pleito.pleiteante}>{pleito.pleiteante || <span className="text-gray-400 italic">N/A</span>}</td>
                <td className="px-4 py-3 whitespace-nowrap text-xs" title={pleito.sessaoAnalise}>
                    {pleito.sessaoAnalise 
                        ? (SESSAO_ANALISE_OPTIONS.find(opt => opt.value === pleito.sessaoAnalise)?.label.substring(0,30) + (SESSAO_ANALISE_OPTIONS.find(opt => opt.value === pleito.sessaoAnalise)?.label.length > 30 ? '...' : '') || 'N/A') 
                        : 'N/A'}
                </td>
                <td className="px-4 py-3 whitespace-nowrap">{new Date(pleito.prazo + 'T00:00:00').toLocaleDateString()}</td>
                <td className="px-4 py-3 whitespace-nowrap">{pleito.responsavel?.nome || <span className="text-gray-400 italic">Não atribuído</span>}</td>
                <td className="px-4 py-3 whitespace-nowrap">
                  <span className={`px-2 py-1 text-xs font-semibold rounded-full
                    ${pleito.status === StatusPleito.PENDENTE ? 'bg-yellow-100 text-yellow-800' :
                      pleito.status === StatusPleito.EM_ANALISE ? 'bg-blue-100 text-blue-800' :
                      pleito.status === StatusPleito.AGUARDANDO_REUNIAO ? 'bg-purple-100 text-purple-800' :
                      'bg-green-100 text-green-800'}`}>
                    {pleito.status}
                  </span>
                </td>
                <td className="px-4 py-3 whitespace-nowrap">
                  <Button variant="ghost" size="sm" onClick={() => handleOpenModal(pleito)} title="Ver / Editar Pleito" disabled={deletingId === pleito.id || isImporting}>
                    <EyeIcon className="w-5 h-5" />
                  </Button>
                  {auth.user && (auth.user.role === Role.GESTOR || auth.user.role === Role.ADMIN) && (
                    <Button 
                        variant="ghost" 
                        size="sm" 
                        onClick={() => handleDeletePleito(pleito.id)} 
                        title="Excluir Pleito" 
                        className="ml-2 text-red-500 hover:text-red-700"
                        disabled={deletingId === pleito.id || isImporting}
                    >
                      {deletingId === pleito.id ? <LoadingSpinner size="sm" color="text-red-500" /> : <DeleteIcon className="w-5 h-5" />}
                    </Button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {isModalOpen && currentPleito && (
        <PleitoEditModal
          isOpen={isModalOpen}
          onClose={() => { setIsModalOpen(false); setCurrentPleito(null); }}
          pleitoProp={currentPleito} 
          onSave={handleSavePleito}
          analistas={MOCK_ANALISTAS} 
          isEditing={isEditing}
        />
      )}
    </div>
  );
};