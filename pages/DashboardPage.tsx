
import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Pleito, StatusPleito, Analista, Role } from '../types'; // Added Role
import { MOCK_PLEITOS, MOCK_ANALISTAS } from '../constants';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { CalendarIcon } from '../components/icons/CalendarIcon';
import { TasksIcon } from '../components/icons/TasksIcon';
import { UserIcon } from '../components/icons/UserIcon';
import { apiService } from '../services/apiService';
import LoadingSpinner from '../components/LoadingSpinner';

interface ChartData {
  name: string;
  value: number;
}

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8', '#82Ca9D'];

const DashboardPage: React.FC = () => {
  const [pleitos, setPleitos] = useState<Pleito[]>([]);
  const [analistas, setAnalistas] = useState<Analista[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    setIsLoading(true);
    try {
      const [pleitosData, analistasData] = await Promise.all([
        apiService.getPleitos(),
        apiService.getAnalistas(),
      ]);
      setPleitos(pleitosData);
      setAnalistas(analistasData);
      setError(null);
    } catch (e) {
      setError('Falha ao carregar dados do dashboard.');
      console.error(e);
      // Fallback to mock data on error
      setPleitos(MOCK_PLEITOS);
      setAnalistas(MOCK_ANALISTAS);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const pleitosPorStatus: ChartData[] = useMemo(() => {
    const counts: { [key in StatusPleito]?: number } = {};
    Object.values(StatusPleito).forEach(s => counts[s] = 0);
    pleitos.forEach(p => {
      if(counts[p.status] !== undefined) counts[p.status]!++;
    });
    return Object.entries(counts).map(([name, value]) => ({ name, value: value || 0 }));
  }, [pleitos]);

  const pleitosPorAnalista: ChartData[] = useMemo(() => {
    const counts: { [key: string]: number } = {};
    analistas.forEach(a => counts[a.nome] = 0); // Initialize for all known analysts
    
    // Count pleitos per responsible analyst
    pleitos.forEach(p => {
      if (p.responsavel) {
        if (counts[p.responsavel.nome] !== undefined) {
          counts[p.responsavel.nome]++;
        } else {
          // If analyst responsible for pleito is not in the initial MOCK_ANALISTAS list
          counts[p.responsavel.nome] = 1; 
        }
      }
    });
    
    // Include unassigned if any
    const unassignedCount = pleitos.filter(p => !p.responsavel).length;
    if (unassignedCount > 0) {
        counts["Não Atribuído"] = unassignedCount;
    }
    
    return Object.entries(counts)
      .filter(([name, value]) => value > 0 || name === "Não Atribuído" || analistas.some(a => a.nome === name)) // Ensure all analysts are shown, even with 0, plus unassigned
      .map(([name, value]) => ({ name, value }));
  }, [pleitos, analistas]);

  const proximosVencimentos = useMemo(() => {
    const today = new Date();
    today.setHours(0,0,0,0); // normalize today's date
    return pleitos
      .filter(p => p.status !== StatusPleito.CONCLUIDO && new Date(p.prazo  + 'T00:00:00') >= today)
      .sort((a, b) => new Date(a.prazo).getTime() - new Date(b.prazo).getTime())
      .slice(0, 5);
  }, [pleitos]);

  if (isLoading) {
    return <div className="flex justify-center items-center h-64"><LoadingSpinner /></div>;
  }

  if (error) {
    return <div className="text-red-500 bg-red-100 p-4 rounded-md">{error}</div>;
  }
  
  const StatCard: React.FC<{ title: string; value: string | number; icon: React.ReactNode; color: string }> = ({ title, value, icon, color }) => (
    <div className={`bg-white p-6 rounded-xl shadow-lg flex items-center space-x-4 border-l-4 ${color}`}>
      <div className="p-3 bg-gray-100 rounded-full">{icon}</div>
      <div>
        <p className="text-sm text-gray-500">{title}</p>
        <p className="text-2xl font-semibold text-gray-800">{value}</p>
      </div>
    </div>
  );


  return (
    <div className="space-y-8">
      <h2 className="text-3xl font-semibold text-gray-800">Dashboard</h2>
      
      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <StatCard title="Total de Pleitos Ativos" value={pleitos.filter(p=> p.status !== StatusPleito.CONCLUIDO).length} icon={<TasksIcon className="w-6 h-6 text-blue-500"/>} color="border-blue-500" />
        <StatCard title="Aguardando Análise" value={pleitos.filter(p=> p.status === StatusPleito.PENDENTE).length} icon={<UserIcon className="w-6 h-6 text-yellow-500"/>} color="border-yellow-500" />
        <StatCard title="Próximos Vencimentos (7 dias)" value={
            pleitos.filter(p => {
                const prazoDate = new Date(p.prazo + 'T00:00:00');
                const today = new Date(); today.setHours(0,0,0,0);
                const sevenDaysFromNow = new Date(today);
                sevenDaysFromNow.setDate(today.getDate() + 7);
                return p.status !== StatusPleito.CONCLUIDO && prazoDate >= today && prazoDate <= sevenDaysFromNow;
            }).length
        } icon={<CalendarIcon className="w-6 h-6 text-red-500"/>} color="border-red-500" />
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="bg-white p-6 rounded-xl shadow-lg">
          <h3 className="text-xl font-semibold text-gray-700 mb-4">Pleitos por Status</h3>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie data={pleitosPorStatus} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={100} labelLine={false} label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}>
                {pleitosPorStatus.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        </div>

        <div className="bg-white p-6 rounded-xl shadow-lg">
          <h3 className="text-xl font-semibold text-gray-700 mb-4">Pleitos por Analista</h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={pleitosPorAnalista} margin={{ top: 5, right: 0, left: 0, bottom: 50 }}> {/* Increased bottom margin for angled labels */}
              <CartesianGrid strokeDasharray="3 3" vertical={false}/>
              <XAxis dataKey="name" angle={-35} textAnchor="end" height={70} interval={0} tick={{fontSize: 10}}/> {/* Angled labels */}
              <YAxis allowDecimals={false} />
              <Tooltip />
              <Legend />
              <Bar dataKey="value" name="Nº de Pleitos" fill="#82ca9d" barSize={30} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Próximos Vencimentos */}
      <div className="bg-white p-6 rounded-xl shadow-lg">
        <h3 className="text-xl font-semibold text-gray-700 mb-4">Próximos Vencimentos (Top 5)</h3>
        {proximosVencimentos.length > 0 ? (
          <ul className="space-y-3">
            {proximosVencimentos.map(pleito => (
              <li key={pleito.id} className="p-3 bg-gray-50 rounded-md border border-gray-200 hover:shadow-sm transition-shadow">
                <div className="flex justify-between items-center">
                  <div>
                    <p className="font-medium text-gray-800">{pleito.ncm} - {pleito.produto}</p>
                    <p className="text-sm text-gray-600">Responsável: {pleito.responsavel?.nome || 'Não atribuído'}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-semibold text-red-600">Prazo: {new Date(pleito.prazo + 'T00:00:00').toLocaleDateString()}</p>
                    <p className={`text-xs px-2 py-0.5 inline-block rounded-full mt-1 ${pleito.status === StatusPleito.PENDENTE ? 'bg-yellow-100 text-yellow-800' : 'bg-blue-100 text-blue-800'}`}>{pleito.status}</p>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-gray-500">Nenhum vencimento próximo.</p>
        )}
      </div>
       {/* Placeholder for notifications settings / log - Not fully implemented */}
      <div className="bg-white p-6 rounded-xl shadow-lg">
        <h3 className="text-xl font-semibold text-gray-700 mb-4">Alertas e Notificações</h3>
        <p className="text-gray-500 text-sm">
          Lembretes automáticos 3 dias antes do prazo de reunião CAT e notificações de tarefas atrasadas seriam configurados e exibidos aqui.
        </p>
        <ul className="list-disc list-inside text-sm text-gray-600 mt-2 space-y-1">
            {/* Example items removed as per user request */}
        </ul>
      </div>
    </div>
  );
};

export default DashboardPage;
