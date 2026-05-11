import React, { useState, useEffect } from 'react';
import { PagoAsociado, CompanyInfo } from '../../types';
import Modal from '../ui/Modal';
import Input from '../ui/Input';
import Button from '../ui/Button';

interface PagoAsociadoFormModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSave: (pago: PagoAsociado) => void;
    pago: PagoAsociado | null;
    asociadoId: string;
    companyInfo: CompanyInfo;
}

const PagoAsociadoFormModal: React.FC<PagoAsociadoFormModalProps> = ({ isOpen, onClose, onSave, pago, asociadoId, companyInfo }) => {
    const [formData, setFormData] = useState<Partial<PagoAsociado>>({});
    const [montoBs, setMontoBs] = useState<number | ''>('');
    const [montoUsd, setMontoUsd] = useState<number | ''>('');
    const [lastEdited, setLastEdited] = useState<'bs' | 'usd'>('bs');

    const bcvRate = companyInfo.bcvRate || 1;
    const currentRate = formData.tasaCambio ?? bcvRate;

    useEffect(() => {
        if (isOpen) {
            const initialData = pago || {
                asociadoId,
                concepto: '',
                cuotas: '',
                montoBs: 0,
                montoUsd: 0,
                status: 'Pendiente',
                tasaCambio: bcvRate,
                fecha: new Date(Date.now() - new Date().getTimezoneOffset() * 60000).toISOString().split('T')[0]
            };
            setFormData(initialData);
            setMontoBs(initialData.montoBs || '');
            setMontoUsd(initialData.montoUsd || (initialData.montoBs / bcvRate) || '');
            setLastEdited('bs');
        }
    }, [pago, isOpen, asociadoId, bcvRate]);

    useEffect(() => {
        if (lastEdited === 'bs' && typeof montoBs === 'number' && currentRate > 0) {
            setMontoUsd(parseFloat((montoBs / currentRate).toFixed(2)));
        }
    }, [montoBs, currentRate, lastEdited]);

    useEffect(() => {
        if (lastEdited === 'usd' && typeof montoUsd === 'number' && currentRate > 0) {
            setMontoBs(parseFloat((montoUsd * currentRate).toFixed(2)));
        }
    }, [montoUsd, currentRate, lastEdited]);


    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleMontoBsChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setLastEdited('bs');
        setMontoBs(e.target.value === '' ? '' : parseFloat(e.target.value));
    };

    const handleMontoUsdChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setLastEdited('usd');
        setMontoUsd(e.target.value === '' ? '' : parseFloat(e.target.value));
    };

    const handleTasaChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const newRate = e.target.value === '' ? 0 : parseFloat(e.target.value);
        setFormData(prev => ({ ...prev, tasaCambio: newRate }));
    };


    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        const rate = formData.tasaCambio || bcvRate;
        const finalData = {
            ...formData,
            montoBs: typeof montoBs === 'number' ? montoBs : 0,
            montoUsd: typeof montoUsd === 'number' ? montoUsd : 0,
            tasaCambio: rate,
            fecha: formData.fecha || new Date(Date.now() - new Date().getTimezoneOffset() * 60000).toISOString().split('T')[0]
        };
        onSave(finalData as PagoAsociado);
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} title={pago ? 'Editar Deuda/Concepto' : 'Nueva Deuda/Concepto'}>
            <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="md:col-span-1">
                        <Input name="concepto" label="Descripción del Concepto" value={formData.concepto || ''} onChange={handleChange} required />
                    </div>
                    <div className="md:col-span-1">
                        <Input name="fecha" label="Fecha" type="date" value={formData.fecha || ''} onChange={handleChange} required />
                    </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                     <div>
                        <Input 
                            label="Importe (Bs.)" 
                            type="number" 
                            step="0.01" 
                            value={montoBs} 
                            onChange={handleMontoBsChange} 
                            required 
                        />
                    </div>
                    <div>
                        <Input 
                            label="Importe (USD)" 
                            type="number" 
                            step="0.01" 
                            value={montoUsd} 
                            onChange={handleMontoUsdChange}
                        />
                    </div>
                    <div>
                        <Input 
                            label="Tasa BCV" 
                            type="number" 
                            step="0.01" 
                            value={formData.tasaCambio ?? bcvRate} 
                            onChange={handleTasaChange}
                            required
                        />
                        <p className="text-[10px] text-gray-500 mt-1">Tasa para esta transacción</p>
                    </div>
                </div>
                 <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <Input name="cuotas" label="Cuotas" placeholder="Ej: 41-45 o 10" value={formData.cuotas || ''} onChange={handleChange} />
                </div>
                
                <div className="flex justify-end space-x-2 pt-4">
                    <Button variant="secondary" type="button" onClick={onClose}>Cancelar</Button>
                    <Button type="submit">Guardar</Button>
                </div>
            </form>
        </Modal>
    );
};

export default PagoAsociadoFormModal;