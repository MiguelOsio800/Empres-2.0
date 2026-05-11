
import React, { useState, useMemo } from 'react';
import { Asociado } from '../../types';
import Modal from '../ui/Modal';
import Input from '../ui/Input';
import Button from '../ui/Button';
import { SearchIcon, CheckIcon, XIcon } from '../icons/Icons';

interface GenerarCargoMasivoModalProps {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: (data: { concepto: string, monto: number, montoUsd: number, tasaCambio: number, cuotas: string, fecha: string, asociadoIds: string[] }) => void;
    asociados: Asociado[];
    bcvRate: number;
}

const GenerarCargoMasivoModal: React.FC<GenerarCargoMasivoModalProps> = ({ isOpen, onClose, onConfirm, asociados, bcvRate }) => {
    const [concepto, setConcepto] = useState('');
    const [cuotas, setCuotas] = useState('1/1');
    const [fecha, setFecha] = useState(new Date(Date.now() - new Date().getTimezoneOffset() * 60000).toISOString().split('T')[0]);
    const [monto, setMonto] = useState<number | ''>('');
    const [montoUsd, setMontoUsd] = useState<number | ''>('');
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedIds, setSelectedIds] = useState<string[]>([]);
    const [lastEdited, setLastEdited] = useState<'bs' | 'usd'>('bs');

    const filteredAsociados = useMemo(() => {
        return asociados.filter(a => 
            a.nombre.toLowerCase().includes(searchTerm.toLowerCase()) || 
            a.codigo.toLowerCase().includes(searchTerm.toLowerCase())
        );
    }, [asociados, searchTerm]);

    const handleToggleSelectAll = () => {
        if (selectedIds.length === filteredAsociados.length) {
            setSelectedIds([]);
        } else {
            setSelectedIds(filteredAsociados.map(a => a.id));
        }
    };

    const handleToggleId = (id: string) => {
        setSelectedIds(prev => 
            prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
        );
    };

    const handleMontoBsChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const val = e.target.value === '' ? '' : parseFloat(e.target.value);
        setMonto(val);
        setLastEdited('bs');
        if (typeof val === 'number' && bcvRate > 0) {
            setMontoUsd(parseFloat((val / bcvRate).toFixed(2)));
        } else if (val === '') {
            setMontoUsd('');
        }
    };

    const handleMontoUsdChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const val = e.target.value === '' ? '' : parseFloat(e.target.value);
        setMontoUsd(val);
        setLastEdited('usd');
        if (typeof val === 'number' && bcvRate > 0) {
            setMonto(parseFloat((val * bcvRate).toFixed(2)));
        } else if (val === '') {
            setMonto('');
        }
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!concepto || typeof monto !== 'number' || monto <= 0 || selectedIds.length === 0) return;
        onConfirm({ 
            concepto, 
            monto, 
            montoUsd: typeof montoUsd === 'number' ? montoUsd : (monto / bcvRate),
            tasaCambio: bcvRate, 
            cuotas,
            fecha,
            asociadoIds: selectedIds 
        });
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} title="Generar Cargo Masivo" size="lg">
            <form onSubmit={handleSubmit} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
                    <div className="md:col-span-1">
                        <Input 
                            label="Concepto" 
                            value={concepto} 
                            onChange={(e) => setConcepto(e.target.value)} 
                            required 
                            placeholder="Ej. Cuota Mensual"
                        />
                    </div>
                    <div className="md:col-span-1">
                        <Input 
                            label="Cuotas" 
                            value={cuotas} 
                            onChange={(e) => setCuotas(e.target.value)} 
                            placeholder="Ej. 1/1"
                        />
                    </div>
                    <div className="md:col-span-1">
                        <Input 
                            label="Fecha" 
                            type="date"
                            value={fecha} 
                            onChange={(e) => setFecha(e.target.value)} 
                            required
                        />
                    </div>
                    <div className="md:col-span-1">
                        <Input 
                            label="Monto (Bs)" 
                            type="number" 
                            step="0.01"
                            value={monto} 
                            onChange={handleMontoBsChange} 
                            required 
                        />
                    </div>
                    <div className="md:col-span-1">
                        <Input 
                            label="Monto (USD)" 
                            type="number" 
                            step="0.01"
                            value={montoUsd} 
                            onChange={handleMontoUsdChange} 
                        />
                        <p className="text-xs text-gray-500 mt-1 text-right">Tasa: {bcvRate}</p>
                    </div>
                </div>

                <div className="border dark:border-gray-700 rounded-xl overflow-hidden bg-gray-50 dark:bg-gray-800/50">
                    <div className="p-4 border-b dark:border-gray-700 flex flex-col md:flex-row md:items-center justify-between gap-4">
                        <h4 className="font-semibold text-gray-700 dark:text-gray-300">Seleccionar Socios ({selectedIds.length})</h4>
                        <div className="flex items-center gap-2">
                            <div className="relative">
                                <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                                <input 
                                    type="text"
                                    placeholder="Buscar socio..."
                                    className="pl-9 pr-4 py-1.5 text-sm rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 focus:ring-2 focus:ring-primary-500 outline-none"
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                />
                            </div>
                            <Button 
                                type="button" 
                                variant="secondary" 
                                size="sm" 
                                onClick={handleToggleSelectAll}
                            >
                                {selectedIds.length === filteredAsociados.length ? 'Deseleccionar Todos' : 'Seleccionar Todos'}
                            </Button>
                        </div>
                    </div>
                    <div className="max-h-60 overflow-y-auto p-2 grid grid-cols-1 sm:grid-cols-2 gap-2">
                        {filteredAsociados.map(a => (
                            <label 
                                key={a.id} 
                                className={`flex items-center p-2 rounded-lg border cursor-pointer transition-colors ${
                                    selectedIds.includes(a.id) 
                                    ? 'bg-primary-50 border-primary-200 dark:bg-primary-900/20 dark:border-primary-800' 
                                    : 'bg-white border-gray-200 dark:bg-gray-800 dark:border-gray-700 hover:bg-gray-50'
                                }`}
                            >
                                <input 
                                    type="checkbox" 
                                    className="hidden" 
                                    checked={selectedIds.includes(a.id)}
                                    onChange={() => handleToggleId(a.id)}
                                />
                                <div className={`w-5 h-5 rounded border flex items-center justify-center mr-3 ${
                                    selectedIds.includes(a.id) ? 'bg-primary-600 border-primary-600' : 'border-gray-300 dark:border-gray-600'
                                }`}>
                                    {selectedIds.includes(a.id) && <CheckIcon className="w-3 h-3 text-white" />}
                                </div>
                                <div className="flex flex-col">
                                    <span className="text-sm font-medium text-gray-900 dark:text-white">{a.nombre}</span>
                                    <span className="text-xs text-gray-500">{a.codigo}</span>
                                </div>
                            </label>
                        ))}
                        {filteredAsociados.length === 0 && (
                            <div className="col-span-full py-8 text-center text-gray-500">No se encontraron socios.</div>
                        )}
                    </div>
                </div>

                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pt-4 border-t dark:border-gray-700">
                    <div className="text-sm">
                        <span className="text-gray-500">Total a generar: </span>
                        <span className="font-bold text-primary-600">
                            {typeof monto === 'number' ? (monto * selectedIds.length).toLocaleString('es-VE', { style: 'currency', currency: 'VES' }) : 'Bs. 0,00'}
                        </span>
                        <span className="text-gray-400 ml-2">
                            ({typeof montoUsd === 'number' ? `$${(montoUsd * selectedIds.length).toFixed(2)}` : '$0.00'})
                        </span>
                    </div>
                    <div className="flex justify-end space-x-3">
                        <Button variant="secondary" type="button" onClick={onClose}>Cancelar</Button>
                        <Button type="submit" disabled={selectedIds.length === 0}>
                            Generar Cargo a {selectedIds.length} Socios
                        </Button>
                    </div>
                </div>
            </form>
        </Modal>
    );
};

export default GenerarCargoMasivoModal;
