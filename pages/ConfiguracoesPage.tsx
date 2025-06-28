
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Analista } from '../types';
import { MOCK_ANALISTAS } from '../constants';
import Button from '../components/Button';
import Input from '../components/Input';
import Modal from '../components/Modal';
import { PlusIcon } from '../components/icons/PlusIcon';
import { EditIcon } from '../components/icons/EditIcon';
import { DeleteIcon } from '../components/icons/DeleteIcon';
import { UploadIcon } from '../components/icons/UploadIcon';
import { apiService } from '../services/apiService';
import LoadingSpinner from '../components/LoadingSpinner';
import * as XLSX from 'xlsx';

const NCM_FILTER_LIST_KEY = 'cgimNcmFilterList';

const ConfiguracoesPage: React.FC = () => {
  const [analistas, setAnalistas] = useState<Analista[]>([]);
  const [cgimNcms, setCgimNcms] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [currentAnalista, setCurrentAnalista] = useState<Partial<Analista> | null>(null); // Partial for new analyst
  const [isEditing, setIsEditing] = useState(false);

  const ncmFileInputRef = useRef<HTMLInputElement>(null);

  const fetchInitialData = useCallback(async () => {
    setIsLoading(true);
    try {
      const data = await apiService.getAnalistas();
      setAnalistas(data);
      const storedNcms = localStorage.getItem(NCM_FILTER_LIST_KEY);
      if (storedNcms) {
        setCgimNcms(JSON.parse(storedNcms));
      }
      setError(null);
    } catch (e) {
      setError('Falha ao carregar dados da página.');
      console.error(e);
      setAnalistas(MOCK_ANALISTAS); // Fallback
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchInitialData();
  }, [fetchInitialData]);

  const openAddModal = () => {
    setCurrentAnalista({ nome: '', email: '' });
    setIsEditing(false);
    setIsModalOpen(true);
  };

  const openEditModal = (analista: Analista) => {
    setCurrentAnalista(analista);
    setIsEditing(true);
    setIsModalOpen(true);
  };

  const handleSaveAnalista = async () => {
    if (!currentAnalista || !currentAnalista.nome) {
        alert("O nome do analista é obrigatório.");
        return;
    }
    
    // Using setIsLoading for specific actions instead of page-wide
    try {
      if (isEditing && currentAnalista.id) {
        const updatedAnalista = await apiService.updateAnalista(currentAnalista as Analista);
        setAnalistas(prev => prev.map(a => a.id === updatedAnalista.id ? updatedAnalista : a));
      } else {
        const newAnalista = await apiService.createAnalista({ nome: currentAnalista.nome, email: currentAnalista.email });
        setAnalistas(prev => [...prev, newAnalista]);
      }
      setIsModalOpen(false);
      setCurrentAnalista(null);
      setError(null);
    } catch (e) {
      setError(`Falha ao ${isEditing ? 'atualizar' : 'adicionar'} analista.`);
      console.error(e);
    }
  };
  
  const handleDeleteAnalista = async (id: string) => {
    if (!window.confirm("Tem certeza que deseja remover este analista?")) return;
    try {
      await apiService.deleteAnalista(id);
      setAnalistas(prev => prev.filter(a => a.id !== id));
      setError(null);
    } catch (e) {
      setError('Falha ao remover analista.');
      console.error(e);
    }
  };

  const handleNcmImportClick = () => {
    ncmFileInputRef.current?.click();
  };

  const handleNcmFileImport = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setError(null);
    setSuccessMessage(null);

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: 'array' });
        const firstSheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[firstSheetName];
        // Extract data assuming NCMs are in the first column (A)
        const jsonData: any[][] = XLSX.utils.sheet_to_json(worksheet, { header: 1, defval: "" });
        
        const ncms = jsonData
          .map(row => {
            if (!row || row.length === 0) return null;
            const rawValue = String(row[0]).trim();
            const digitsOnly = rawValue.replace(/\D/g, ''); // Remove all non-digit characters
            
            if (digitsOnly.length === 8) {
              // Format it as XXXX.XX.XX
              return `${digitsOnly.substring(0, 4)}.${digitsOnly.substring(4, 6)}.${digitsOnly.substring(6, 8)}`;
            }
            return null; // Return null for invalid entries
          })
          .filter((ncm): ncm is string => ncm !== null); // Type guard to filter out nulls and get string[]


        if (ncms.length === 0) {
            setError("Nenhuma NCM válida (com 8 dígitos) foi encontrada na primeira coluna do arquivo. Verifique o arquivo e tente novamente.");
            return;
        }
        
        localStorage.setItem(NCM_FILTER_LIST_KEY, JSON.stringify(ncms));
        setCgimNcms(ncms);
        setSuccessMessage(`${ncms.length} NCMs foram importadas e salvas com sucesso.`);
      } catch (err) {
        console.error("Error parsing Excel file:", err);
        setError("Ocorreu um erro ao ler o arquivo Excel. Verifique se o formato está correto.");
      } finally {
         if (ncmFileInputRef.current) ncmFileInputRef.current.value = ""; // Reset file input
      }
    };
    reader.onerror = () => {
        setError("Falha ao ler o arquivo.");
    };
    reader.readAsArrayBuffer(file);
  };

  const handleClearNcms = () => {
    if (window.confirm("Tem certeza de que deseja remover a lista de NCMs salvas?")) {
        localStorage.removeItem(NCM_FILTER_LIST_KEY);
        setCgimNcms([]);
        setSuccessMessage("Lista de NCMs removida.");
    }
  };


  if (isLoading && analistas.length === 0 && cgimNcms.length === 0) {
    return <div className="flex justify-center items-center h-64"><LoadingSpinner /></div>;
  }

  return (
    <div className="space-y-8">
      {/* NCM Filter Management */}
      <div className="bg-white p-6 shadow-lg rounded-xl">
        <h2 className="text-2xl font-semibold text-gray-800 mb-4">Filtro de NCMs da CGIM</h2>
        <p className="text-sm text-gray-600 mb-6">Importe um arquivo Excel (.xlsx) com as NCMs de responsabilidade da CGIM para habilitar o filtro na página de pautas. O sistema lerá a primeira coluna (A) do arquivo.</p>
        
        {error && <p className="text-red-500 bg-red-100 p-3 rounded-md mb-4">{error}</p>}
        {successMessage && <p className="text-green-700 bg-green-100 p-3 rounded-md mb-4">{successMessage}</p>}

        <div className="flex items-center gap-4 mb-4">
          <Button onClick={handleNcmImportClick} leftIcon={<UploadIcon className="w-5 h-5"/>}>
            Importar Lista de NCMs (Excel)
          </Button>
          <input type="file" ref={ncmFileInputRef} onChange={handleNcmFileImport} accept=".xlsx, .xls" style={{ display: 'none' }} />

          {cgimNcms.length > 0 && (
            <Button onClick={handleClearNcms} variant="danger" leftIcon={<DeleteIcon className="w-5 h-5"/>}>
              Limpar Lista
            </Button>
          )}
        </div>

        {cgimNcms.length > 0 && (
            <div>
                <p className="font-semibold text-gray-700">{cgimNcms.length} NCMs carregadas no filtro.</p>
                <div className="mt-2 p-3 bg-gray-50 border border-gray-200 rounded-md max-h-40 overflow-y-auto">
                    <pre className="text-xs text-gray-600 whitespace-pre-wrap">{cgimNcms.join('\n')}</pre>
                </div>
            </div>
        )}
      </div>

      {/* Analyst Management */}
      <div className="bg-white p-6 shadow-lg rounded-xl">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-semibold text-gray-800">Gerenciamento de Analistas</h2>
          <Button onClick={openAddModal} leftIcon={<PlusIcon className="w-5 h-5"/>}>
            Adicionar Analista
          </Button>
        </div>
        
        {isLoading && analistas.length === 0 && (
            <div className="text-center py-10"><LoadingSpinner /></div>
        )}

        {!isLoading && analistas.length === 0 && !error && (
             <div className="text-center py-10 text-gray-500">Nenhum analista cadastrado.</div>
        )}

        {analistas.length > 0 && (
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left text-gray-700">
              <thead className="text-xs text-gray-700 uppercase bg-gray-100">
                <tr>
                  <th scope="col" className="px-6 py-3">Nome</th>
                  <th scope="col" className="px-6 py-3">Email</th>
                  <th scope="col" className="px-6 py-3">Ações</th>
                </tr>
              </thead>
              <tbody>
                {analistas.map(analista => (
                  <tr key={analista.id} className="bg-white border-b hover:bg-gray-50">
                    <td className="px-6 py-4 font-medium text-gray-900">{analista.nome}</td>
                    <td className="px-6 py-4">{analista.email || 'N/A'}</td>
                    <td className="px-6 py-4 space-x-2">
                      <Button variant="ghost" size="sm" onClick={() => openEditModal(analista)} title="Editar Analista">
                        <EditIcon className="w-4 h-4" />
                      </Button>
                      <Button variant="ghost" size="sm" onClick={() => handleDeleteAnalista(analista.id)} title="Remover Analista">
                        <DeleteIcon className="w-4 h-4 text-red-500" />
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {isModalOpen && currentAnalista && (
        <Modal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          title={isEditing ? 'Editar Analista' : 'Adicionar Novo Analista'}
        >
          <div className="space-y-4">
            <Input
              label="Nome do Analista"
              value={currentAnalista.nome || ''}
              onChange={e => setCurrentAnalista(prev => ({ ...prev, nome: e.target.value }))}
              required
            />
            <Input
              label="Email do Analista"
              type="email"
              value={currentAnalista.email || ''}
              onChange={e => setCurrentAnalista(prev => ({ ...prev, email: e.target.value }))}
            />
            <div className="flex justify-end space-x-2 pt-4">
              <Button variant="secondary" onClick={() => setIsModalOpen(false)}>Cancelar</Button>
              <Button onClick={handleSaveAnalista}>
                {isEditing ? 'Salvar Alterações' : 'Adicionar Analista'}
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};

export default ConfiguracoesPage;