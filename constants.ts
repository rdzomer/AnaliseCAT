import { Role, Analista, Pleito, StatusPleito, Usuario, SessaoAnalise, TipoPleitoEnum } from './types';

export const APP_NAME = "CGIM Gestão de Pleitos";

export const MOCK_ANALISTAS: Analista[] = [
  { id: '1', nome: 'Pedro Reckziegel', email: 'pedro.r@example.com' },
  { id: '2', nome: 'Ricardo Zomer', email: 'ricardo.z@example.com' },
  { id: '3', nome: 'Antônio Azambuja', email: 'antonio.a@example.com' },
];

export const MOCK_USUARIOS: Usuario[] = [
  { id: 'admin01', nome: 'Admin User', email: 'admin@cgim.gov.br', role: Role.ADMIN },
  { id: 'analista01', nome: 'Pedro Reckziegel', email: 'pedro.r@example.com', role: Role.ANALISTA },
  { id: 'analista02', nome: 'Ricardo Zomer', email: 'ricardo.z@example.com', role: Role.ANALISTA },
  { id: 'gestor01', nome: 'Gestor CGIM', email: 'gestor@cgim.gov.br', role: Role.GESTOR },
];

export const MOCK_PLEITOS: Pleito[] = []; // Empty array as per user request

export const STATUS_OPTIONS = Object.values(StatusPleito).map(status => ({ value: status, label: status }));
export const TIPO_PLEITO_OPTIONS = Object.values(TipoPleitoEnum).map(tipo => ({ value: tipo, label: tipo }));
export const ANALISTAS_OPTIONS = MOCK_ANALISTAS.map(analista => ({ value: analista.id, label: analista.nome }));
export const SESSAO_ANALISE_OPTIONS = Object.values(SessaoAnalise).map(sessao => ({ value: sessao, label: sessao }));

export const KANBAN_COLUMNS = [
  StatusPleito.PENDENTE,
  StatusPleito.EM_ANALISE,
  StatusPleito.AGUARDANDO_REUNIAO,
  StatusPleito.CONCLUIDO,
];

export const roleLabels: Record<string, string> = {
  ADMIN: 'Administrador',
  GESTOR: 'Gestor',
  ANALISTA: 'Analista',
};
