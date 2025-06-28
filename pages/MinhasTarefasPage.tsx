
import React, { useState, useEffect, useCallback } from 'react';
import { Pleito, StatusPleito, Analista } from '../types';
import { MOCK_PLEITOS, KANBAN_COLUMNS, MOCK_ANALISTAS } from '../constants';
import { useAuth } from '../hooks/useAuth';
import { PleitoEditModal } from './PleitoEditModal'; // Changed to named import
import { apiService } from '../services/apiService';
import LoadingSpinner from '../components/LoadingSpinner';
import Button from '../components/Button';
import { EditIcon } from '../components/icons/EditIcon';


interface KanbanCardProps {
  pleito: Pleito;
  onEdit: (pleito: Pleito) => void;
}

const KanbanCard: React.FC<KanbanCardProps> = ({ pleito, onEdit }) => {
  return (
    <div className="bg-white p-3 rounded-lg shadow-md mb-3 cursor-grab hover:shadow-lg transition-shadow">
      <div className="flex justify-between items-start">
        <h4 className="font-semibold text-sm text-gray-800 mb-1">{pleito.ncm}</h4>
        <Button variant="ghost" size="sm" onClick={() => onEdit(pleito)} className="p-1 -mt-1 -mr-1">
            <EditIcon className="w-4 h-4 text-gray-500 hover:text-blue-600"/>
        </Button>
      </div>
      <p className="text-xs text-gray-600 mb-2 truncate" title={pleito.produto}>{pleito.produto}</p>
      <div className="text-xs text-gray-500">
        Prazo: {new Date(pleito.prazo + 'T00:00:00').toLocaleDateString()}
      </div>
       <div className={`mt-2 text-xs font-semibold px-2 py-0.5 inline-block rounded-full
            ${pleito.status === StatusPleito.PENDENTE ? 'bg-yellow-100 text-yellow-800' :
              pleito.status === StatusPleito.EM_ANALISE ? 'bg-blue-100 text-blue-800' :
              pleito.status === StatusPleito.AGUARDANDO_REUNIAO ? 'bg-purple-100 text-purple-800' :
              'bg-green-100 text-green-800'}`}>
            {pleito.status}
        </div>
    </div>
  );
};


interface KanbanColumnProps {
  status: StatusPleito;
  pleitos: Pleito[];
  onEditPleito: (pleito: Pleito) => void;
}

const KanbanColumn: React.FC<KanbanColumnProps> = ({ status, pleitos, onEditPleito }) => {
  return (
    <div className="bg-gray-100 p-3 rounded-lg w-full md:w-1/4 min-h-[200px]">
      <h3 className="font-semibold text-gray-700 mb-3 text-center text-sm uppercase tracking-wider">{status} ({pleitos.length})</h3>
      <div className="space-y-2">
        {pleitos.map(pleito => (
          <KanbanCard key={pleito.id} pleito={pleito} onEdit={onEditPleito} />
        ))}
        {pleitos.length === 0 && <p className="text-xs text-gray-400 text-center py-4">Nenhum pleito nesta etapa.</p>}
      </div>
    </div>
  );
};


const MinhasTarefasPage: React.FC = () => {
  const [pleitos, setPleitos] = useState<Pleito[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [currentPleito, setCurrentPleito] = useState<Pleito | null>(null);
  
  const auth = useAuth();

  const fetchUserPleitos = useCallback(async () => {
    if (!auth.user) return;
    setIsLoading(true);
    try {
      // In a real app, this would fetch pleitos assigned to auth.user.id
      // For demo, filter MOCK_PLEITOS or use a dedicated API endpoint
      const allPleitos = await apiService.getPleitos();
      const userPleitos = allPleitos.filter(p => p.responsavel?.id === auth.user?.id);
      setPleitos(userPleitos);
      setError(null);
    } catch (e) {
      setError('Falha ao carregar suas tarefas.');
      console.error(e);
      // Fallback if API fails for demo
      const userMockPleitos = MOCK_PLEITOS.filter(p => p.responsavel?.id === auth.user?.id);
      setPleitos(userMockPleitos);
    } finally {
      setIsLoading(false);
    }
  }, [auth.user]);

  useEffect(() => {
    fetchUserPleitos();
  }, [fetchUserPleitos]);

  const handleEditPleito = (pleito: Pleito) => {
    setCurrentPleito(pleito);
    setIsModalOpen(true);
  };

  const handleSavePleito = async (updatedPleito: Pleito | Partial<Pleito>) => {
    // Assuming updatedPleito will always be a full Pleito object when saving from this page
    const pleitoToSave = updatedPleito as Pleito;
    
    setIsLoading(true); // Consider a more granular loading state for the modal save action
    try {
      const savedPleito = await apiService.updatePleito(pleitoToSave);
      // Update local state, important if status or other display properties changed
      setPleitos(prevPleitos => prevPleitos.map(p => p.id === savedPleito.id ? savedPleito : p));
      setIsModalOpen(false);
      setCurrentPleito(null);
      setError(null);
    } catch (e) {
      setError('Falha ao salvar o pleito.');
      console.error(e);
      // For demo, optimistic update if API fails
      setPleitos(prevPleitos => prevPleitos.map(p => p.id === pleitoToSave.id ? pleitoToSave : p));
      setIsModalOpen(false);
      setCurrentPleito(null);
    } finally {
      setIsLoading(false);
    }
  };

  const pleitosByStatus = (status: StatusPleito) => {
    return pleitos.filter(p => p.status === status);
  };

  if (isLoading && pleitos.length === 0) {
    return <div className="flex justify-center items-center h-64"><LoadingSpinner /></div>;
  }

  if (error) {
    return <div className="text-red-500 bg-red-100 p-4 rounded-md">{error}</div>;
  }
  
  if (!auth.user) {
     return <div className="text-red-500">Usuário não autenticado.</div>;
  }

  return (
    <div className="space-y-6">
      <div className="bg-white p-6 shadow-lg rounded-xl">
        <h2 className="text-2xl font-semibold text-gray-800 mb-1">Minhas Tarefas</h2>
        <p className="text-sm text-gray-600 mb-6">Pleitos atribuídos a você ({auth.user.nome}).</p>
      </div>

      {pleitos.length === 0 && !isLoading && (
        <div className="bg-white p-6 shadow-lg rounded-xl text-center text-gray-500">
            Você não possui tarefas atribuídas no momento.
        </div>
      )}

      {pleitos.length > 0 && (
        <div className="flex flex-col md:flex-row gap-4">
          {KANBAN_COLUMNS.map(status => (
            <KanbanColumn
              key={status}
              status={status}
              pleitos={pleitosByStatus(status)}
              onEditPleito={handleEditPleito}
            />
          ))}
        </div>
      )}

      {currentPleito && (
        <PleitoEditModal
          isOpen={isModalOpen}
          onClose={() => { setIsModalOpen(false); setCurrentPleito(null);}}
          pleitoProp={currentPleito}
          onSave={handleSavePleito}
          analistas={MOCK_ANALISTAS} // Assuming all analysts are available for reassignment if needed
          isEditing={true} // In "Minhas Tarefas", opening the modal is always for editing.
        />
      )}
    </div>
  );
};

export default MinhasTarefasPage;