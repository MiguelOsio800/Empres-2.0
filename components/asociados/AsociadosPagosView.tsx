
import React, { useState, useMemo } from 'react';
import { Asociado, PagoAsociado, ReciboPagoAsociado, CompanyInfo, Permissions } from '../../types';
import Card, { CardHeader, CardTitle } from '../ui/Card';
import Button from '../ui/Button';
// Added CheckCircleIcon to the imports
import { PlusIcon, ReceiptIcon, ArrowLeftIcon, UserIcon, ExclamationTriangleIcon, ClipboardDocumentListIcon, EyeIcon, TrashIcon, CheckCircleIcon } from '../icons/Icons';
import PagoAsociadoFormModal from './PagoAsociadoFormModal';
import RegistrarPagoModal from './RegistrarPagoModal';
import AsociadoSearchInput from './AsociadoSearchInput';
import Select from '../ui/Select';
import GenerarDeudaProduccionModal from './GenerarDeudaProduccionModal';
import ReciboPagoAsociadoModal from './ReciboPagoAsociadoModal';
import { useData } from '../../contexts/DataContext';
import { useConfig } from '../../contexts/ConfigContext';
import { useConfirm } from '../../contexts/ConfirmationContext';

interface AsociadosPagosViewProps {
    asociados: Asociado[];
    pagos: PagoAsociado[];
    recibos: ReciboPagoAsociado[];
    onSavePago: (pago: PagoAsociado) => Promise<void>;
    onDeletePago: (pagoId: string) => Promise<void>;
    onSaveRecibo: (recibo: ReciboPagoAsociado) => Promise<void>;
    companyInfo: CompanyInfo;
    permissions: Permissions;
}

const formatCurrency = (amount: number) => `Bs. ${amount.toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

const AsociadosPagosView: React.FC<AsociadosPagosViewProps> = (props) => {
    const { asociados, pagos, recibos, onSavePago, onDeletePago, onSaveRecibo, companyInfo, permissions } = props;
    const { vehicles, remesas, invoices } = useData();
    const { shippingTypes } = useConfig();

    const [selectedAsociadoId, setSelectedAsociadoId] = useState<string>(() => {
        const hash = window.location.hash;
        if (hash.startsWith('#asociados-pagos/')) {
            return hash.split('/')[1] || '';
        }
        return '';
    });
    const [selectedMonth, setSelectedMonth] = useState<string>(String(new Date().getMonth() + 1).padStart(2, '0'));
    const [selectedYear, setSelectedYear] = useState<string>(String(new Date().getFullYear()));
    const [isPagoModalOpen, setIsPagoModalOpen] = useState(false);
    const [editingPago, setEditingPago] = useState<PagoAsociado | null>(null);
    const [isReciboModalOpen, setIsReciboModalOpen] = useState(false);
    const [isDeudaProduccionModalOpen, setIsDeudaProduccionModalOpen] = useState(false);
    const [viewReciboModalOpen, setViewReciboModalOpen] = useState(false);
    const [selectedRecibo, setSelectedRecibo] = useState<ReciboPagoAsociado | null>(null);

    const { confirm } = useConfirm();

    const meses = [
        { value: '01', label: 'Enero' },
        { value: '02', label: 'Febrero' },
        { value: '03', label: 'Marzo' },
        { value: '04', label: 'Abril' },
        { value: '05', label: 'Mayo' },
        { value: '06', label: 'Junio' },
        { value: '07', label: 'Julio' },
        { value: '08', label: 'Agosto' },
        { value: '09', label: 'Septiembre' },
        { value: '10', label: 'Octubre' },
        { value: '11', label: 'Noviembre' },
        { value: '12', label: 'Diciembre' },
    ];

    const años = Array.from({ length: 5 }, (_, i) => String(new Date().getFullYear() - 2 + i));
    
    const selectedAsociado = useMemo(() => {
        return asociados.find(a => String(a.id) === String(selectedAsociadoId));
    }, [asociados, selectedAsociadoId]);

    const { pagosPendientes, recibosAsociado, totalDeuda } = useMemo(() => {
        if (!selectedAsociadoId) {
            return { pagosPendientes: [], recibosAsociado: [], totalDeuda: 0 };
        }
        
        // REGLA: Solo lo que está en 'Pendiente' va a la lista de deudas y al saldo deudor, sin importar el mes
        const pendientes = pagos
            .filter(p => String(p.asociadoId) === String(selectedAsociadoId) && p.status === 'Pendiente')
            .sort((a, b) => (String(a.id) > String(b.id) ? -1 : 1));
        
        const misRecibos = recibos
            .filter(r => {
                if (String(r.asociadoId) !== String(selectedAsociadoId)) return false;
                const date = new Date(r.fechaPago);
                const year = date.getFullYear();
                const month = String(date.getMonth() + 1).padStart(2, '0');
                return String(year) === selectedYear && month === selectedMonth;
            })
            .sort((a,b) => new Date(b.fechaPago).getTime() - new Date(a.fechaPago).getTime());
        
        // La suma en Bolívares debe ser: montoUsd * tasaCambio
        const calculateBs = (p: PagoAsociado) => {
            if (p.montoUsd && p.tasaCambio) {
                return p.montoUsd * p.tasaCambio;
            }
            return Number(p.montoBs) || 0;
        };

        const deuda = pendientes.reduce((sum, p) => sum + calculateBs(p), 0);
        
        return { 
            pagosPendientes: pendientes, 
            recibosAsociado: misRecibos,
            totalDeuda: deuda,
        };
    }, [pagos, recibos, selectedAsociadoId, selectedMonth, selectedYear]);

    const handleOpenPagoModal = (pago: PagoAsociado | null) => {
        setEditingPago(pago);
        setIsPagoModalOpen(true);
    };

    const handleSavePago = async (pago: PagoAsociado) => {
        await onSavePago(pago);
        setIsPagoModalOpen(false);
    };

    const handleViewRecibo = (recibo: ReciboPagoAsociado) => {
        setSelectedRecibo(recibo);
        setViewReciboModalOpen(true);
    };

    return (
        <div className="space-y-4">
            <Button variant="secondary" onClick={() => window.location.hash = 'asociados'}>
                <ArrowLeftIcon className="w-4 h-4 mr-2" />
                Volver al Módulo de Asociados
            </Button>
            
            <Card>
                <CardHeader>
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                        <CardTitle>Seleccionar Asociado y Periodo</CardTitle>
                        <div className="flex items-center gap-2">
                            <select 
                                className="px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 outline-none focus:ring-2 focus:ring-primary-500 text-sm"
                                value={selectedMonth}
                                onChange={(e) => setSelectedMonth(e.target.value)}
                            >
                                {meses.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
                            </select>
                            <select 
                                className="px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 outline-none focus:ring-2 focus:ring-primary-500 text-sm"
                                value={selectedYear}
                                onChange={(e) => setSelectedYear(e.target.value)}
                            >
                                {años.map(a => <option key={a} value={a}>{a}</option>)}
                            </select>
                        </div>
                    </div>
                    <div className="max-w-md mt-2">
                        <AsociadoSearchInput 
                            asociados={asociados} 
                            value={selectedAsociadoId} 
                            onAsociadoSelect={a => setSelectedAsociadoId(a.id)} 
                            label=""
                            placeholder="Busque y seleccione un asociado..."
                        />
                    </div>
                </CardHeader>

                {!selectedAsociado ? (
                    <div className="text-center py-12 text-gray-500 dark:text-gray-400">
                        <UserIcon className="mx-auto h-12 w-12 text-gray-400" />
                        <h3 className="mt-2 text-sm font-medium text-gray-900 dark:text-white">Seleccione un asociado</h3>
                        <p className="mt-1 text-sm text-gray-500">Elija un asociado de la lista para ver y gestionar sus pagos.</p>
                    </div>
                ) : (
                    <>
                    <div className="bg-gray-100 dark:bg-gray-800/50 p-4 rounded-lg mb-6">
                        <div className="flex flex-col sm:flex-row justify-between items-start gap-4">
                            <div>
                                <h2 className="text-xl font-bold text-gray-800 dark:text-white">{selectedAsociado.nombre}</h2>
                                <p className="text-sm text-gray-500 dark:text-gray-400">Código: {selectedAsociado.codigo} | C.I: {selectedAsociado.cedula}</p>
                            </div>
                            <div className="text-left sm:text-right">
                                <p className="text-sm font-medium text-gray-600 dark:text-gray-300">Saldo Deudor Total</p>
                                <p className={`text-3xl font-bold ${totalDeuda > 0 ? 'text-red-600 dark:text-red-400' : 'text-green-600 dark:text-green-400'}`}>
                                    {formatCurrency(totalDeuda)}
                                </p>
                            </div>
                        </div>
                    </div>
                    
                    <Card>
                        <CardHeader>
                            <div className="flex items-center gap-3">
                                <ClipboardDocumentListIcon className="w-6 h-6 text-primary-500" />
                                <CardTitle>Generación de Deudas por Producción</CardTitle>
                            </div>
                        </CardHeader>
                        <div className="flex justify-center p-4">
                             <Button onClick={() => setIsDeudaProduccionModalOpen(true)}>
                                <PlusIcon className="w-4 h-4 mr-2" />
                                Generar Deuda por Producción
                            </Button>
                        </div>
                    </Card>


                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-6">
                        {/* Cuentas Pendientes y Acciones */}
                        <Card>
                            <CardHeader>
                                <div className="flex justify-between items-center">
                                    <CardTitle>Cuentas Pendientes</CardTitle>
                                    <div className="space-x-2">
                                        <Button onClick={() => handleOpenPagoModal(null)} size="sm" variant="secondary">
                                            <PlusIcon className="w-4 h-4 mr-1"/> Nueva Deuda
                                        </Button>
                                        <Button onClick={() => setIsReciboModalOpen(true)} size="sm" disabled={pagosPendientes.length === 0}>
                                            <ReceiptIcon className="w-4 h-4 mr-1"/> Registrar Pago
                                        </Button>
                                    </div>
                                </div>
                            </CardHeader>
                            <div className="space-y-3 max-h-96 overflow-y-auto pr-2">
                                {pagosPendientes.length > 0 ? pagosPendientes.map(p => {
                                    const isCoopDebt = p.montoBs < 0;
                                    const displayAmount = Math.abs(p.montoBs);
                                    const displayUsd = p.montoUsd ? Math.abs(p.montoUsd) : undefined;
                                    
                                    return (
                                        <div key={p.id} className={`p-3 rounded-md border-l-4 flex justify-between items-center ${isCoopDebt ? 'bg-red-50 dark:bg-red-900/30 border-red-500' : 'bg-yellow-50 dark:bg-yellow-900/30 border-yellow-500'}`}>
                                            <div className="flex-grow">
                                                <div className="flex justify-between items-start">
                                                    <div>
                                                        <p className={`font-semibold ${isCoopDebt ? 'text-red-800 dark:text-red-200' : 'text-yellow-800 dark:text-yellow-200'}`}>{p.concepto}</p>
                                                        <div className="flex items-center gap-2 mt-1">
                                                            <span className={`text-xs ${isCoopDebt ? 'text-red-700 dark:text-red-300' : 'text-yellow-700 dark:text-yellow-300'}`}>Fecha: {p.fecha}</span>
                                                            {p.tasaCambio && (
                                                                <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300">
                                                                    Tasa: {p.tasaCambio}
                                                                </span>
                                                            )}
                                                        </div>
                                                    </div>
                                                    <p className={`font-bold text-right ${isCoopDebt ? 'text-red-900 dark:text-red-100' : 'text-yellow-900 dark:text-yellow-100'}`}>
                                                        {formatCurrency(displayAmount)}
                                                        {displayUsd && <span className={`block text-xs font-normal ${isCoopDebt ? 'text-red-800/80 dark:text-red-200/80' : 'text-yellow-800/80 dark:text-yellow-200/80'}`}>(${displayUsd.toFixed(2)})</span>}
                                                    </p>
                                                </div>
                                            </div>
                                            {permissions['asociados.pagos.delete'] && (
                                                <Button 
                                                    variant="danger" 
                                                    size="sm" 
                                                    className="ml-4 !p-2 flex-shrink-0"
                                                    onClick={async (e) => {
                                                        e.stopPropagation();
                                                        e.preventDefault();
                                                        const isConfirmed = await confirm({
                                                            title: '¿Eliminar Deuda?',
                                                            message: 'Esta acción no se puede deshacer. ¿Está seguro de que desea eliminar esta deuda?',
                                                            confirmText: 'Sí, eliminar',
                                                            cancelText: 'Cancelar',
                                                            variant: 'danger'
                                                        });
                                                        if (isConfirmed) {
                                                            await onDeletePago(p.id);
                                                        }
                                                    }}
                                                    title="Eliminar Deuda"
                                                >
                                                    <TrashIcon className="w-4 h-4" />
                                                </Button>
                                            )}
                                        </div>
                                    )
                                }) : (
                                    <div className="text-center py-12">
                                        <CheckCircleIcon className="mx-auto h-12 w-12 text-green-500 mb-2" />
                                        <p className="text-gray-500 dark:text-gray-400">El asociado está al día con sus pagos.</p>
                                    </div>
                                )}
                            </div>
                        </Card>

                        {/* Historial de Recibos */}
                        <Card>
                            <CardHeader>
                                <CardTitle>Historial de Recibos de Pago</CardTitle>
                            </CardHeader>
                            <div className="space-y-3 max-h-[29rem] overflow-y-auto pr-2">
                                {recibosAsociado.length > 0 ? recibosAsociado.map(r => (
                                    <div key={r.id} className="p-3 bg-gray-100 dark:bg-gray-800/50 rounded-md block border-l-4 border-green-500">
                                        <div className="flex justify-between items-center text-sm">
                                            <div>
                                                <p className="font-semibold">Recibo N°: {r.comprobanteNumero}</p>
                                                <p className="text-xs text-gray-500 dark:text-gray-400">Fecha: {r.fechaPago}</p>
                                            </div>
                                            <div className="text-right">
                                                <p className="font-semibold text-green-600 dark:text-green-400">{formatCurrency(r.montoTotalBs)}</p>
                                                <Button size="sm" variant="secondary" onClick={() => handleViewRecibo(r)} className="mt-1">
                                                    <EyeIcon className="w-3 h-3 mr-1" /> Ver
                                                </Button>
                                            </div>
                                        </div>
                                    </div>
                                )) : (
                                    <p className="text-center py-8 text-gray-500 dark:text-gray-400">No hay recibos de pago registrados.</p>
                                )}
                            </div>
                        </Card>
                    </div>
                    </>
                )}
            </Card>

            {isPagoModalOpen && selectedAsociado && (
                <PagoAsociadoFormModal
                    isOpen={isPagoModalOpen}
                    onClose={() => setIsPagoModalOpen(false)}
                    onSave={handleSavePago}
                    pago={editingPago}
                    asociadoId={selectedAsociado.id}
                    companyInfo={companyInfo}
                />
            )}
            
            {isReciboModalOpen && selectedAsociado && (
                <RegistrarPagoModal
                    isOpen={isReciboModalOpen}
                    onClose={() => setIsReciboModalOpen(false)}
                    asociado={selectedAsociado}
                    pagosPendientes={pagosPendientes}
                    onSaveRecibo={onSaveRecibo}
                    companyInfo={companyInfo}
                />
            )}

            {isDeudaProduccionModalOpen && selectedAsociado && (
                <GenerarDeudaProduccionModal
                    isOpen={isDeudaProduccionModalOpen}
                    onClose={() => setIsDeudaProduccionModalOpen(false)}
                    onGenerate={onSavePago}
                    asociado={selectedAsociado}
                    remesas={remesas}
                    invoices={invoices}
                    shippingTypes={shippingTypes}
                    companyInfo={companyInfo}
                />
            )}
            
            {viewReciboModalOpen && selectedRecibo && selectedAsociado && (
                <ReciboPagoAsociadoModal
                    isOpen={viewReciboModalOpen}
                    onClose={() => setViewReciboModalOpen(false)}
                    recibo={selectedRecibo}
                    asociado={selectedAsociado}
                    pagos={pagos}
                    companyInfo={companyInfo}
                />
            )}
        </div>
    );
};

export default AsociadosPagosView;
