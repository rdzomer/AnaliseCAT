import React, { useState, useEffect, useMemo } from 'react';
import { Pleito, Analista, StatusPleito, Anotacao, SessaoAnalise, TipoPleitoEnum } from '../types';
import { STATUS_OPTIONS, TIPO_PLEITO_OPTIONS, SESSAO_ANALISE_OPTIONS } from '../constants';
import Modal from '../components/Modal';
import Button from '../components/Button';
import Input from '../components/Input';
import Select from '../components/Select';
import TextArea from '../components/TextArea';
import { SaveIcon } from '../components/icons/SaveIcon';
import { PlusIcon } from '../components/icons/PlusIcon';
import { ExternalLinkIcon } from '../components/icons/ExternalLinkIcon';
import { useAuth } from '../hooks/useAuth';
import LoadingSpinner from '../components/LoadingSpinner';

interface PleitoEditModalProps {
  isOpen: boolean;
  onClose: () => void;
  pleitoProp: Pleito | Partial<Pleito>;
  onSave: (pleito: Pleito | Partial<Pleito>) => Promise<void>;
  analistas: Analista[];
  isEditing: boolean;
}

export const PleitoEditModal: React.FC<PleitoEditModalProps> = ({ isOpen, onClose, pleitoProp, onSave, analistas, isEditing }) => {
  const [formData, setFormData] = useState<Pleito | Partial<Pleito>>(pleitoProp);
  const [newAnotacaoText, setNewAnotacaoText] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const auth = useAuth();

  const selectedSessaoAnalise = useMemo(() => formData.sessaoAnalise, [formData.sessaoAnalise]);

  useEffect(() => {
    setFormData(pleitoProp);
  }, [pleitoProp, isOpen]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target;
    
    if (type === 'checkbox') {
        const { checked } = e.target as HTMLInputElement;
        setFormData(prev => ({ ...prev, [name]: checked }));
    } else {
        setFormData(prev => ({ ...prev, [name]: value }));
    }
  };

  const handleResponsavelChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const responsavelId = e.target.value;
    const selectedAnalista = analistas.find(a => a.id === responsavelId);
    setFormData(prev => ({ 
        ...prev, 
        responsavel: selectedAnalista,
        dataDistribuicao: selectedAnalista ? (prev.dataDistribuicao || new Date().toISOString().split('T')[0]) : undefined
    }));
  };
  
  const handleAddAnotacao = () => {
    if (!newAnotacaoText.trim() || !auth.user) return;
    const anotacao: Anotacao = {
      id: `anot-${Date.now()}`,
      data: new Date().toISOString().split('T')[0],
      texto: newAnotacaoText,
      autor: auth.user.nome,
    };
    setFormData(prev => ({ ...prev, anotacoes: [...(prev.anotacoes || []), anotacao] }));
    setNewAnotacaoText('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.sessaoAnalise) {
        alert("Por favor, selecione um Tipo de Alteração.");
        return;
    }
    if (!formData.prazo || !formData.tipoPleito || !formData.status) {
        alert("Campos Prazo Reunião CAT, Tipo de Pleito (Geral) e Status (Geral) são obrigatórios.");
        return;
    }
    if (!formData.ncm || !formData.produto) {
        alert("Campos NCM e Produto são obrigatórios e devem ser preenchidos na seção específica do Tipo de Alteração.");
        return;
    }
    setIsSaving(true);
    await onSave(formData);
    setIsSaving(false);
  };
  
  const openSeiLink = (seiNumber?: string) => {
    if (!seiNumber) {
        alert("Número do processo SEI não fornecido.");
        return;
    }
    const seiNumOnly = seiNumber.replace(/\D/g,'');
    if (seiNumOnly) {
        window.open(`https://sei.economia.gov.br/sei/controlador.php?acao=processo_visualizar&id_processo=${seiNumOnly}`, '_blank');
    } else {
        alert("Número do processo SEI inválido ou não formatado corretamente para abrir.");
    }
  };

  const analistaOptions = analistas.map(a => ({ value: a.id, label: a.nome }));
  
  const sessaoLabel = formData.sessaoAnalise ? SESSAO_ANALISE_OPTIONS.find(opt => opt.value === formData.sessaoAnalise)?.label : '';
  const modalTitle = isEditing ? 
    `Editar Pleito ${formData.ncm ? `(${formData.ncm})` : ''} - ${sessaoLabel || 'Tipo de Alteração não selecionado'}` : 
    'Adicionar Novo Pleito';

  const renderDynamicFormFields = () => {
    if (!selectedSessaoAnalise) {
        return <p className="text-gray-500 text-center py-4">Selecione um Tipo de Alteração para ver os campos específicos.</p>;
    }

    const renderSEIFields = (showPublicRestricted: boolean) => (
        <>
            {showPublicRestricted ? (
                <>
                    <div className="md:col-span-3">
                        <Input label="Processo SEI (Público)" name="processoSEIPublico" value={formData.processoSEIPublico || ''} onChange={handleChange}/>
                        {formData.processoSEIPublico && (
                            <Button type="button" variant="ghost" size="sm" onClick={() => openSeiLink(formData.processoSEIPublico)} leftIcon={<ExternalLinkIcon className="w-4 h-4"/>} className="mt-1 text-xs">
                                Abrir SEI Público
                            </Button>
                        )}
                    </div>
                    <div className="md:col-span-3">
                        <Input label="Processo SEI (Restrito)" name="processoSEIRestrito" value={formData.processoSEIRestrito || ''} onChange={handleChange}/>
                        {formData.processoSEIRestrito && (
                            <Button type="button" variant="ghost" size="sm" onClick={() => openSeiLink(formData.processoSEIRestrito)} leftIcon={<ExternalLinkIcon className="w-4 h-4"/>} className="mt-1 text-xs">
                                Abrir SEI Restrito
                            </Button>
                        )}
                    </div>
                </>
            ) : (
                <div className="md:col-span-3">
                     <Input label="Processo SEI" name="processoSEIPublico" value={formData.processoSEIPublico || ''} onChange={handleChange} placeholder="Usar campo SEI Público"/>
                     {formData.processoSEIPublico && (
                        <Button type="button" variant="ghost" size="sm" onClick={() => openSeiLink(formData.processoSEIPublico)} leftIcon={<ExternalLinkIcon className="w-4 h-4"/>} className="mt-1 text-xs">
                            Abrir SEI
                        </Button>
                    )}
                </div>
            )}
        </>
    );
    
    const renderNotaPosicaoCATFields = (showNota: boolean, showPosicao: boolean) => (
        <>
            {showNota && <TextArea className="md:col-span-6" label="Notas Técnicas" name="notaTecnica" value={formData.notaTecnica || ''} onChange={handleChange} rows={3} />}
            {showPosicao && <TextArea className="md:col-span-6" label="Posição CAT" name="posicaoCAT" value={formData.posicaoCAT || ''} onChange={handleChange} rows={3} />}
        </>
    );


    switch (selectedSessaoAnalise) {
      case SessaoAnalise.BR_ANALISE_CCM:
        return (
          <fieldset className="border border-gray-300 p-4 rounded-md">
            <legend className="text-md font-semibold text-gray-700 px-2">{sessaoLabel}</legend>
            <div className="grid grid-cols-1 md:grid-cols-6 gap-4 mt-2">
              <Input className="md:col-span-2" label="NCM*" name="ncm" value={formData.ncm || ''} onChange={handleChange} required placeholder="XXXX.XX.XX" />
              <Input className="md:col-span-4" label="Produto*" name="produto" value={formData.produto || ''} onChange={handleChange} required />
              <Input className="md:col-span-3" label="Pleiteante" name="pleiteante" value={formData.pleiteante || ''} onChange={handleChange} />
              <Input className="md:col-span-3" label="Redução do II (%)" name="reducaoII" value={formData.reducaoII || ''} onChange={handleChange} />
              <Input className="md:col-span-2" label="Quota" name="quotaValor" value={formData.quotaValor || ''} onChange={handleChange} />
              <Input className="md:col-span-2" label="País pendente" name="paisPendente" value={formData.paisPendente || ''} onChange={handleChange} />
              <Input className="md:col-span-2" label="Prazo para resposta" name="prazoResposta" value={formData.prazoResposta || ''} type="date" onChange={handleChange} />
            </div>
          </fieldset>
        );
      case SessaoAnalise.PENDENTES_CCM_BR:
        return (
          <fieldset className="border border-gray-300 p-4 rounded-md">
            <legend className="text-md font-semibold text-gray-700 px-2">{sessaoLabel}</legend>
            <div className="grid grid-cols-1 md:grid-cols-6 gap-4 mt-2">
              <Input className="md:col-span-2" label="NCM*" name="ncm" value={formData.ncm || ''} onChange={handleChange} required placeholder="XXXX.XX.XX" />
              <Input className="md:col-span-4" label="Produto*" name="produto" value={formData.produto || ''} onChange={handleChange} required />
              <Input className="md:col-span-3" label="Pleiteante" name="pleiteante" value={formData.pleiteante || ''} onChange={handleChange} />
              <Input className="md:col-span-3" label="Redução do II (%)" name="reducaoII" value={formData.reducaoII || ''} onChange={handleChange} />
              <Input className="md:col-span-3" label="Quota" name="quotaValor" value={formData.quotaValor || ''} onChange={handleChange} />
              <Input className="md:col-span-3" label="Situação" name="situacaoEspecifica" value={formData.situacaoEspecifica || ''} onChange={handleChange} />
            </div>
          </fieldset>
        );
      case SessaoAnalise.PENDENTES_CCM_MERCOSUL:
        return (
          <fieldset className="border border-gray-300 p-4 rounded-md">
            <legend className="text-md font-semibold text-gray-700 px-2">{sessaoLabel}</legend>
            <div className="grid grid-cols-1 md:grid-cols-6 gap-4 mt-2">
              <Input className="md:col-span-2" label="País" name="paisEstadoParte" value={formData.paisEstadoParte || ''} onChange={handleChange} />
              {renderSEIFields(false)} 
              <Input className="md:col-span-2" label="NCM*" name="ncm" value={formData.ncm || ''} onChange={handleChange} required placeholder="XXXX.XX.XX" />
              <Input className="md:col-span-4" label="Produto*" name="produto" value={formData.produto || ''} onChange={handleChange} required />
              <Input className="md:col-span-2" label="Pleiteante" name="pleiteante" value={formData.pleiteante || ''} onChange={handleChange} />
              <Input className="md:col-span-2" label="Redução do II (%)" name="reducaoII" value={formData.reducaoII || ''} onChange={handleChange} />
              <Input className="md:col-span-2" label="Quota" name="quotaValor" value={formData.quotaValor || ''} onChange={handleChange} />
              <Input className="md:col-span-6" label="Situação" name="situacaoEspecifica" value={formData.situacaoEspecifica || ''} onChange={handleChange} />
            </div>
          </fieldset>
        );
      case SessaoAnalise.PENDENTES_CAT:
        return (
          <fieldset className="border border-gray-300 p-4 rounded-md">
            <legend className="text-md font-semibold text-gray-700 px-2">{sessaoLabel}</legend>
            <div className="grid grid-cols-1 md:grid-cols-6 gap-4 mt-2 items-end">
              {renderSEIFields(false)} 
              <Input className="md:col-span-2" label="NCM*" name="ncm" value={formData.ncm || ''} onChange={handleChange} required placeholder="XXXX.XX.XX"/>
              <Input className="md:col-span-4" label="Produto*" name="produto" value={formData.produto || ''} onChange={handleChange} required />
              <Input className="md:col-span-2" label="Ex tarifário" name="exTarifario" value={formData.exTarifario || ''} onChange={handleChange} />
              <div className="md:col-span-2 flex items-end space-x-2">
                <Input className="flex-grow" label="Alíquota Aplicada" name="aliquotaAplicada" value={formData.aliquotaAplicada || ''} onChange={handleChange} />
                <label className="flex items-center space-x-1 whitespace-nowrap pb-2">
                    <input type="checkbox" name="aliquotaAplicadaPleitoZero" checked={formData.aliquotaAplicadaPleitoZero || false} onChange={handleChange} className="form-checkbox h-4 w-4 text-blue-600"/>
                    <span className="text-xs">Pleito a 0%</span>
                </label>
              </div>
              <Input className="md:col-span-2" label="Quota (Valor)" name="quotaValor" value={formData.quotaValor || ''} onChange={handleChange} />
              <Input className="md:col-span-2" label="Quota (Unidade)" name="quotaUnidade" value={formData.quotaUnidade || ''} onChange={handleChange} />
              <Input className="md:col-span-2" label="Quota (Info Adic.)" name="quotaInfoAdicional" value={formData.quotaInfoAdicional || ''} onChange={handleChange} />
              <Input className="md:col-span-2" label="Quota (Prazo)" name="quotaPrazo" type="date" value={formData.quotaPrazo || ''} onChange={handleChange} />
              <Input className="md:col-span-2" label="Término de Vigência da medida" name="terminoVigenciaMedida" type="date" value={formData.terminoVigenciaMedida || ''} onChange={handleChange} />
              <Input className="md:col-span-2" label="Pleiteante" name="pleiteante" value={formData.pleiteante || ''} onChange={handleChange} />
              {renderNotaPosicaoCATFields(true,true)}
            </div>
          </fieldset>
        );
      case SessaoAnalise.NOVOS_CAT:
         return (
          <fieldset className="border border-gray-300 p-4 rounded-md">
            <legend className="text-md font-semibold text-gray-700 px-2">{sessaoLabel}</legend>
            <div className="grid grid-cols-1 md:grid-cols-6 gap-4 mt-2 items-end">
              {renderSEIFields(true)} 
              <Input className="md:col-span-2" label="NCM*" name="ncm" value={formData.ncm || ''} onChange={handleChange} required placeholder="XXXX.XX.XX"/>
              <Input className="md:col-span-4" label="Produto*" name="produto" value={formData.produto || ''} onChange={handleChange} required />
              <Input className="md:col-span-2" label="Ex tarifário" name="exTarifario" value={formData.exTarifario || ''} onChange={handleChange} />
              <div className="md:col-span-2 flex items-end space-x-2">
                <Input className="flex-grow" label="Alíquota Aplicada" name="aliquotaAplicada" value={formData.aliquotaAplicada || ''} onChange={handleChange} />
                <label className="flex items-center space-x-1 whitespace-nowrap pb-2">
                    <input type="checkbox" name="aliquotaAplicadaPleitoZero" checked={formData.aliquotaAplicadaPleitoZero || false} onChange={handleChange} className="form-checkbox h-4 w-4 text-blue-600"/>
                    <span className="text-xs">Pleito a 0%</span>
                </label>
              </div>
              <Input className="md:col-span-2" label="Quota (Valor)" name="quotaValor" value={formData.quotaValor || ''} onChange={handleChange} />
              <Input className="md:col-span-2" label="Quota (Unidade)" name="quotaUnidade" value={formData.quotaUnidade || ''} onChange={handleChange} />
               <Input className="md:col-span-2" label="Quota (Info Adic.)" name="quotaInfoAdicional" value={formData.quotaInfoAdicional || ''} onChange={handleChange} />
              <Input className="md:col-span-2" label="Quota (Prazo)" name="quotaPrazo" type="date" value={formData.quotaPrazo || ''} onChange={handleChange} />
              <Input className="md:col-span-2" label="Término de Vigência da medida" name="terminoVigenciaMedida" type="date" value={formData.terminoVigenciaMedida || ''} onChange={handleChange} />
              <Input className="md:col-span-2" label="Pleiteante" name="pleiteante" value={formData.pleiteante || ''} onChange={handleChange} />
              {renderNotaPosicaoCATFields(true,false)} 
            </div>
          </fieldset>
        );
      case SessaoAnalise.MERCOSUL_CAT_PENDENTES:
        return (
          <fieldset className="border border-gray-300 p-4 rounded-md">
            <legend className="text-md font-semibold text-gray-700 px-2">{sessaoLabel}</legend>
            <div className="grid grid-cols-1 md:grid-cols-6 gap-4 mt-2">
              <Input className="md:col-span-2" label="País" name="paisEstadoParte" value={formData.paisEstadoParte || ''} onChange={handleChange} />
              {renderSEIFields(false)} 
              <Input className="md:col-span-2" label="NCM*" name="ncm" value={formData.ncm || ''} onChange={handleChange} required placeholder="XXXX.XX.XX"/>
              <Input className="md:col-span-4" label="Produto*" name="produto" value={formData.produto || ''} onChange={handleChange} required />
              <Input className="md:col-span-2" label="Ex-tarifário" name="exTarifario" value={formData.exTarifario || ''} onChange={handleChange} />
              <Input className="md:col-span-2" label="Quota" name="quotaValor" value={formData.quotaValor || ''} onChange={handleChange} />
              <Input className="md:col-span-2" label="Alíquota Solicitada" name="aliquotaPretendida" value={formData.aliquotaPretendida || ''} onChange={handleChange} />
              <Input className="md:col-span-3" label="Pleiteante" name="pleiteante" value={formData.pleiteante || ''} onChange={handleChange} />
              <Input className="md:col-span-3" label="Prazo da medida vigente" name="terminoVigenciaMedida" value={formData.terminoVigenciaMedida || ''} type="date" onChange={handleChange} /> 
              <Input className="md:col-span-3" label="Prazo para resposta" name="prazoResposta" value={formData.prazoResposta || ''} type="date" onChange={handleChange} />
              {renderNotaPosicaoCATFields(false,true)} 
            </div>
          </fieldset>
        );
      case SessaoAnalise.MERCOSUL_CAT_NOVOS:
        return (
          <fieldset className="border border-gray-300 p-4 rounded-md">
            <legend className="text-md font-semibold text-gray-700 px-2">{sessaoLabel}</legend>
            <div className="grid grid-cols-1 md:grid-cols-6 gap-4 mt-2">
              <Input className="md:col-span-2" label="País" name="paisEstadoParte" value={formData.paisEstadoParte || ''} onChange={handleChange} />
              {renderSEIFields(false)} 
              <Input className="md:col-span-2" label="NCM*" name="ncm" value={formData.ncm || ''} onChange={handleChange} required placeholder="XXXX.XX.XX"/>
              <Input className="md:col-span-4" label="Produto*" name="produto" value={formData.produto || ''} onChange={handleChange} required />
              <Input className="md:col-span-2" label="Ex-tarifário" name="exTarifario" value={formData.exTarifario || ''} onChange={handleChange} />
              <Input className="md:col-span-2" label="Quota" name="quotaValor" value={formData.quotaValor || ''} onChange={handleChange} />
              <Input className="md:col-span-2" label="Alíquota Solicitada" name="aliquotaPretendida" value={formData.aliquotaPretendida || ''} onChange={handleChange} />
              <Input className="md:col-span-3" label="Pleiteante" name="pleiteante" value={formData.pleiteante || ''} onChange={handleChange} />
              <Input className="md:col-span-3" label="Prazo da medida vigente" name="terminoVigenciaMedida" value={formData.terminoVigenciaMedida || ''} type="date" onChange={handleChange} />
              <Input className="md:col-span-3" label="Prazo para resposta" name="prazoResposta" value={formData.prazoResposta || ''} type="date" onChange={handleChange} />
            </div>
          </fieldset>
        );
      case SessaoAnalise.LETEC_PENDENTES:
        return (
          <fieldset className="border border-gray-300 p-4 rounded-md">
            <legend className="text-md font-semibold text-gray-700 px-2">{sessaoLabel}</legend>
            <div className="grid grid-cols-1 md:grid-cols-6 gap-4 mt-2">
              {renderSEIFields(false)} 
              <Input className="md:col-span-2" label="NCM*" name="ncm" value={formData.ncm || ''} onChange={handleChange} required placeholder="XXXX.XX.XX"/>
              <Input className="md:col-span-4" label="Produto*" name="produto" value={formData.produto || ''} onChange={handleChange} required />
              <Input className="md:col-span-2" label="Ex tarifário" name="exTarifario" value={formData.exTarifario || ''} onChange={handleChange} />
              <Input className="md:col-span-2" label="Alíquota Aplicada" name="aliquotaAplicada" value={formData.aliquotaAplicada || ''} onChange={handleChange} />
              <Input className="md:col-span-2" label="Alíquota Pretendida" name="aliquotaPretendida" value={formData.aliquotaPretendida || ''} onChange={handleChange} />
              <Input className="md:col-span-2" label="Quota" name="quotaValor" value={formData.quotaValor || ''} onChange={handleChange} />
              <Input className="md:col-span-2" label="Pleiteante" name="pleiteante" value={formData.pleiteante || ''} onChange={handleChange} />
              {renderNotaPosicaoCATFields(true,true)}
            </div>
          </fieldset>
        );
      case SessaoAnalise.LETEC_NOVOS:
        return (
          <fieldset className="border border-gray-300 p-4 rounded-md">
            <legend className="text-md font-semibold text-gray-700 px-2">{sessaoLabel}</legend>
            <div className="grid grid-cols-1 md:grid-cols-6 gap-4 mt-2">
              {renderSEIFields(true)} 
              <Input className="md:col-span-2" label="NCM*" name="ncm" value={formData.ncm || ''} onChange={handleChange} required placeholder="XXXX.XX.XX"/>
              <Input className="md:col-span-4" label="Produto*" name="produto" value={formData.produto || ''} onChange={handleChange} required />
              <Input className="md:col-span-2" label="Ex tarifário" name="exTarifario" value={formData.exTarifario || ''} onChange={handleChange} />
              <Input className="md:col-span-2" label="Alíquota Aplicada" name="aliquotaAplicada" value={formData.aliquotaAplicada || ''} onChange={handleChange} />
              <Input className="md:col-span-2" label="Alíquota Pretendida" name="aliquotaPretendida" value={formData.aliquotaPretendida || ''} onChange={handleChange} />
              <Input className="md:col-span-2" label="Quota" name="quotaValor" value={formData.quotaValor || ''} onChange={handleChange} />
              <Input className="md:col-span-2" label="Pleiteante" name="pleiteante" value={formData.pleiteante || ''} onChange={handleChange} />
              {renderNotaPosicaoCATFields(true,false)} 
            </div>
          </fieldset>
        );
       case SessaoAnalise.CMC_27_15_PENDENTES:
        return (
          <fieldset className="border border-gray-300 p-4 rounded-md">
            <legend className="text-md font-semibold text-gray-700 px-2">{sessaoLabel}</legend>
            <div className="grid grid-cols-1 md:grid-cols-6 gap-4 mt-2">
              {renderSEIFields(false)}
              <Input className="md:col-span-2" label="NCM*" name="ncm" value={formData.ncm || ''} onChange={handleChange} required placeholder="XXXX.XX.XX"/>
              <Input className="md:col-span-4" label="Descrição*" name="descricaoAlternativa" value={formData.descricaoAlternativa || formData.produto || ''} onChange={handleChange} required />
              <Input className="md:col-span-2" label="Alíquota II Vigente" name="aliquotaIIVigente" value={formData.aliquotaIIVigente || ''} onChange={handleChange} />
              <Input className="md:col-span-2" label="Alíquota II Pleiteada" name="aliquotaIIPleiteada" value={formData.aliquotaIIPleiteada || ''} onChange={handleChange} />
              <Input className="md:col-span-2" label="Pleiteante" name="pleiteante" value={formData.pleiteante || ''} onChange={handleChange} />
              {renderNotaPosicaoCATFields(true,true)}
            </div>
          </fieldset>
        );
      case SessaoAnalise.CMC_27_15_NOVOS:
        return (
          <fieldset className="border border-gray-300 p-4 rounded-md">
            <legend className="text-md font-semibold text-gray-700 px-2">{sessaoLabel}</legend>
            <div className="grid grid-cols-1 md:grid-cols-6 gap-4 mt-2">
              {renderSEIFields(false)}
              <Input className="md:col-span-2" label="NCM*" name="ncm" value={formData.ncm || ''} onChange={handleChange} required placeholder="XXXX.XX.XX"/>
              <Input className="md:col-span-4" label="Produto*" name="produto" value={formData.produto || ''} onChange={handleChange} required />
              <Input className="md:col-span-2" label="Alíquota Aplicada" name="aliquotaAplicada" value={formData.aliquotaAplicada || ''} onChange={handleChange} />
              <Input className="md:col-span-2" label="Alíquota Pretendida" name="aliquotaPretendida" value={formData.aliquotaPretendida || ''} onChange={handleChange} />
              <Input className="md:col-span-2" label="Pleiteante" name="pleiteante" value={formData.pleiteante || ''} onChange={handleChange} />
              {renderNotaPosicaoCATFields(true,false)} 
            </div>
          </fieldset>
        );
      case SessaoAnalise.LEBIT_BK_PENDENTES:
        return (
          <fieldset className="border border-gray-300 p-4 rounded-md">
            <legend className="text-md font-semibold text-gray-700 px-2">{sessaoLabel}</legend>
            <div className="grid grid-cols-1 md:grid-cols-6 gap-4 mt-2">
              {renderSEIFields(true)}
              <Input className="md:col-span-2" label="Pleito (Detalhado)" name="tipoPleitoDetalhado" value={formData.tipoPleitoDetalhado || ''} onChange={handleChange} />
              <Input className="md:col-span-2" label="NCM*" name="ncm" value={formData.ncm || ''} onChange={handleChange} required placeholder="XXXX.XX.XX"/>
              <Input className="md:col-span-4" label="Produto*" name="produto" value={formData.produto || ''} onChange={handleChange} required />
              <Input className="md:col-span-2" label="Ex-Tarifário" name="exTarifario" value={formData.exTarifario || ''} onChange={handleChange} />
              <Input className="md:col-span-2" label="TEC" name="tec" value={formData.tec || ''} onChange={handleChange} />
              <Input className="md:col-span-2" label="Alíquota Aplicada" name="aliquotaAplicada" value={formData.aliquotaAplicada || ''} onChange={handleChange} />
              <Input className="md:col-span-2" label="Alíquota Pretendida" name="aliquotaPretendida" value={formData.aliquotaPretendida || ''} onChange={handleChange} />
              <Input className="md:col-span-2" label="Pleiteante" name="pleiteante" value={formData.pleiteante || ''} onChange={handleChange} />
              {renderNotaPosicaoCATFields(true,true)}
            </div>
          </fieldset>
        );
      case SessaoAnalise.LEBIT_BK_NOVOS:
        return (
          <fieldset className="border border-gray-300 p-4 rounded-md">
            <legend className="text-md font-semibold text-gray-700 px-2">{sessaoLabel}</legend>
            <div className="grid grid-cols-1 md:grid-cols-6 gap-4 mt-2">
              {renderSEIFields(true)}
              <Input className="md:col-span-2" label="Pleito (Detalhado)" name="tipoPleitoDetalhado" value={formData.tipoPleitoDetalhado || ''} onChange={handleChange} />
              <Input className="md:col-span-2" label="NCM*" name="ncm" value={formData.ncm || ''} onChange={handleChange} required placeholder="XXXX.XX.XX"/>
              <Input className="md:col-span-4" label="Produto*" name="produto" value={formData.produto || ''} onChange={handleChange} required />
              <Input className="md:col-span-2" label="Ex-Tarifário" name="exTarifario" value={formData.exTarifario || ''} onChange={handleChange} />
              <Input className="md:col-span-2" label="TEC" name="tec" value={formData.tec || ''} onChange={handleChange} />
              <Input className="md:col-span-2" label="Alíquota Aplicada" name="aliquotaAplicada" value={formData.aliquotaAplicada || ''} onChange={handleChange} />
              <Input className="md:col-span-2" label="Alíquota Pretendida" name="aliquotaPretendida" value={formData.aliquotaPretendida || ''} onChange={handleChange} />
              <Input className="md:col-span-2" label="Pleiteante" name="pleiteante" value={formData.pleiteante || ''} onChange={handleChange} />
              {renderNotaPosicaoCATFields(true,false)} 
            </div>
          </fieldset>
        );
      case SessaoAnalise.CT1_PENDENTES:
      case SessaoAnalise.CT1_NOVOS: 
        return (
          <fieldset className="border border-gray-300 p-4 rounded-md">
            <legend className="text-md font-semibold text-gray-700 px-2">{sessaoLabel}</legend>
            <div className="grid grid-cols-1 md:grid-cols-6 gap-4 mt-2">
              <Input className="md:col-span-2" label="País" name="paisEstadoParte" value={formData.paisEstadoParte || ''} onChange={handleChange} />
              {renderSEIFields(false)}
              <Input className="md:col-span-2" label="NCM*" name="ncm" value={formData.ncm || ''} onChange={handleChange} required placeholder="XXXX.XX.XX"/>
              <Input className="md:col-span-4" label="Produto*" name="produto" value={formData.produto || ''} onChange={handleChange} required />
              <Input className="md:col-span-2" label="Pleiteante" name="pleiteante" value={formData.pleiteante || ''} onChange={handleChange} />
              <Input className="md:col-span-4" label="Pleito (Detalhado)" name="tipoPleitoDetalhado" value={formData.tipoPleitoDetalhado || ''} onChange={handleChange} />
              <TextArea className="md:col-span-6" label="Alteração tarifária" name="alteracaoTarifaria" value={formData.alteracaoTarifaria || ''} onChange={handleChange} rows={3} />
              {renderNotaPosicaoCATFields(true,true)}
            </div>
          </fieldset>
        );
      default:
        return <p className="text-gray-600 text-center py-4">Configuração de formulário não encontrada para este tipo de alteração.</p>;
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={modalTitle} size="5xl">
      <form onSubmit={handleSubmit} className="space-y-6">
        
        <fieldset className="border border-blue-300 p-4 rounded-md bg-blue-50">
            <legend className="text-md font-semibold text-blue-700 px-2">Configuração do Pleito</legend>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-2 items-end">
                <Select 
                    label="Tipo de Alteração*" 
                    name="sessaoAnalise" 
                    value={formData.sessaoAnalise || ''} 
                    onChange={handleChange} 
                    options={SESSAO_ANALISE_OPTIONS} 
                    required 
                    className="md:col-span-1"
                />
                 <Select 
                    label="Tipo de Pleito (Geral)*" 
                    name="tipoPleito" 
                    value={formData.tipoPleito} 
                    onChange={handleChange} 
                    options={TIPO_PLEITO_OPTIONS} 
                    required 
                    className="md:col-span-1"
                 />
                 <Input 
                    label="Pauta de Origem" 
                    name="pautaIdentifier" 
                    value={formData.pautaIdentifier || ''} 
                    disabled 
                    className="md:col-span-1 bg-gray-100"
                />
            </div>
        </fieldset>
        
        {renderDynamicFormFields()}

        <fieldset className="border border-gray-300 p-4 rounded-md">
            <legend className="text-lg font-semibold text-gray-700 px-2">Subsídio CGIM (Análise Interna)</legend>
            <p className="text-sm text-gray-500 mb-3 px-2">Esta seção é para a análise interna da CGIM e será usada no documento Word.</p>
            <div className="space-y-4 mt-2">
                <TextArea label="Resumo do Pleito / Situação Atual" name="resumoPleito" placeholder="Descreva o pleito, histórico, alegações do pleiteante, e a situação atual..." value={formData.resumoPleito || ''} onChange={handleChange} rows={3} />
                <TextArea label="Dados de Comércio (Importações, Exportações, Preços)" name="dadosComercio" placeholder="Insira dados quantitativos sobre importações, exportações, preços médios, consumo nacional, etc." value={formData.dadosComercio || ''} onChange={handleChange} rows={3} />
                <TextArea label="Análise Técnica (Capacidade Nacional, Precedentes, Argumentação)" name="analiseTecnica" placeholder="Detalhe a análise sobre capacidade produtiva nacional/regional, precedentes, aspectos técnicos do produto, e argumentações relevantes." value={formData.analiseTecnica || ''} onChange={handleChange} rows={4} />
                <TextArea label="Sugestão CGIM (Recomendação e Justificativa)" name="sugestaoCGIM" placeholder="Apresente a recomendação final da CGIM (ex: Deferir, Indeferir, Aguardar reunião) e sua justificativa técnica." value={formData.sugestaoCGIM || ''} onChange={handleChange} rows={4} />
            </div>
        </fieldset>

        <fieldset className="border border-gray-300 p-4 rounded-md">
            <legend className="text-md font-semibold text-gray-700 px-2">Gestão do Processo (CGIM)</legend>
            <div className="grid grid-cols-1 md:grid-cols-6 gap-4 mt-2 items-end">
                <Input label="Prazo Reunião CAT*" name="prazo" type="date" value={formData.prazo} onChange={handleChange} required className="md:col-span-2"/>
                <Select label="Status (Geral)*" name="status" value={formData.status} onChange={handleChange} options={STATUS_OPTIONS} required className="md:col-span-2"/>
                <Select label="Responsável (CGIM)" name="responsavel" value={formData.responsavel?.id || ''} onChange={handleResponsavelChange} options={analistaOptions} className="md:col-span-2"/>
                {formData.responsavel && 
                    <Input label="Data de Distribuição" name="dataDistribuicao" type="date" value={formData.dataDistribuicao || ''} onChange={handleChange} className="md:col-span-2"/>
                }
            </div>
        </fieldset>

        <fieldset className="border border-gray-300 p-4 rounded-md">
            <legend className="text-md font-semibold text-gray-700 px-2">Anotações Internas (Colaboração)</legend>
            <div className="space-y-2 max-h-40 overflow-y-auto mb-2 pr-2 bg-gray-50 p-2 rounded-md border mt-2">
                {(formData.anotacoes || []).length === 0 && <p className="text-xs text-gray-500 p-2">Nenhuma anotação.</p>}
                {(formData.anotacoes || []).map(anotacao => (
                    <div key={anotacao.id} className="bg-white p-2 rounded shadow-sm text-xs">
                        <p className="font-semibold text-gray-700">{anotacao.autor} <span className="text-gray-500 font-normal">({new Date(anotacao.data  + 'T00:00:00').toLocaleDateString()}):</span></p>
                        <p className="text-gray-600 whitespace-pre-wrap">{anotacao.texto}</p>
                    </div>
                ))}
            </div>
            <div className="flex items-start gap-2 mt-3">
                <TextArea 
                    placeholder="Nova anotação..." 
                    value={newAnotacaoText} 
                    onChange={(e) => setNewAnotacaoText(e.target.value)}
                    className="flex-grow"
                    rows={2}
                />
                <Button type="button" onClick={handleAddAnotacao} leftIcon={<PlusIcon className="w-4 h-4"/>} size="sm" disabled={!newAnotacaoText.trim() || isSaving} className="h-full">Adicionar</Button>
            </div>
        </fieldset>

        <div className="flex justify-end space-x-3 pt-6 border-t mt-6">
          <Button type="button" variant="secondary" onClick={onClose} disabled={isSaving}>Cancelar</Button>
          <Button type="submit" variant="primary" leftIcon={isSaving? null : <SaveIcon className="w-5 h-5"/>} disabled={isSaving}>
            {isSaving ? <LoadingSpinner size="sm" color="text-white"/> : (isEditing ? 'Salvar Alterações' : 'Adicionar Pleito')}
          </Button>
        </div>
      </form>
    </Modal>
  );
};

export default PleitoEditModal; 
