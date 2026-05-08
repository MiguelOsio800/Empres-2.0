
import React, { useMemo, useState } from 'react';
import { Asociado, PagoAsociado, ReciboPagoAsociado, CompanyInfo, Permissions } from '../../types';
import Modal from '../ui/Modal';
import Card, { CardHeader, CardTitle } from '../ui/Card';
import Button from '../ui/Button';
import { ReceiptIcon, EyeIcon, TrashIcon, CheckCircleIcon, ExclamationTriangleIcon } from '../icons/Icons';
import RegistrarPagoModal from './RegistrarPagoModal';
import ReciboPagoAsociadoModal from './ReciboPagoAsociadoModal';

interface AsociadoFinanzasModalProps {
    isOpen: boolean;
    onClose: () => void;
    asociado: Asociado;
    pagos: PagoAsociado[];
    recibos: ReciboPagoAsociado[];
    onSaveRecibo: (recibo: ReciboPagoAsociado) => Promise<void>;
    onDeletePago: (pagoId: string) => Promise<void>;
    companyInfo: CompanyInfo;
    permissions: Permissions;
    initialTab?: 'deudas' | 'recibos' | 'pagar';
    selectedMonth?: string;
    selectedYear?: string;
}

const formatCurrency = (amount: number) => `Bs. ${amount.toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

const AsociadoFinanzasModal: React.FC<AsociadoFinanzasModalProps> = ({ 
    isOpen, 
    onClose, 
    asociado, 
    pagos, 
    recibos, 
    onSaveRecibo, 
    onDeletePago,
    companyInfo, 
    permissions,
    initialTab = 'deudas',
    selectedMonth,
    selectedYear
}) => {
    const [isRegistrarModalOpen, setIsRegistrarModalOpen] = useState(initialTab === 'pagar');
    const [viewReciboModalOpen, setViewReciboModalOpen] = useState(false);
    const [selectedRecibo, setSelectedRecibo] = useState<ReciboPagoAsociado | null>(null);

    const { pagosPendientes, recibosAsociado, totalDeuda } = useMemo(() => {
        // Filter all payments for this associate
        const misPagos = pagos.filter(p => String(p.asociadoId) === String(asociado.id));
        
        // All pending payments (ignore period filter for debts to allow paying everything)
        const pendientes = misPagos
            .filter(p => p.status === 'Pendiente')
            .sort((a, b) => {
                const dateA = new Date(a.createdAt || a.fecha).getTime();
                const dateB = new Date(b.createdAt || b.fecha).getTime();
                return dateA - dateB; // Oldest first
            });
        
        // Receipts can still be filtered by period if provided, or show all
        const misRecibos = recibos
            .filter(r => {
                const matchAsociado = String(r.asociadoId) === String(asociado.id);
                const matchPeriod = selectedMonth && selectedYear 
                    ? r.fechaPago && r.fechaPago.startsWith(`${selectedYear}-${selectedMonth}`)
                    : true;
                return matchAsociado && matchPeriod;
            })
            .sort((a, b) => new Date(b.fechaPago).getTime() - new Date(a.fechaPago).getTime());
        
        const deuda = pendientes.reduce((sum, p) => sum + (Number(p.montoBs) || 0), 0);
        
        return { 
            pagosPendientes: pendientes, 
            recibosAsociado: misRecibos,
            totalDeuda: deuda,
        };
    }, [pagos, recibos, asociado.id, selectedMonth, selectedYear]);

    const handleViewRecibo = (recibo: ReciboPagoAsociado) => {
        setSelectedRecibo(recibo);
        setViewReciboModalOpen(true);
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} title={`Finanzas de ${asociado.nombre}`} size="xl">
            <div className="space-y-6">
                <div className="bg-white dark:bg-gray-800 p-6 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm">
                    <div className="flex flex-col sm:flex-row justify-between items-start gap-4">
                        <div>
                            <h2 className="text-2xl font-bold text-gray-900 dark:text-white">{asociado.nombre}</h2>
                            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Código: {asociado.codigo} | C.I: {asociado.cedula}</p>
                        </div>
                        <div className="text-left sm:text-right bg-gray-50 dark:bg-gray-900/50 p-3 rounded-lg border border-gray-100 dark:border-gray-800">
                            <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Saldo Deudor Total</p>
                            <p className={`text-3xl font-extrabold mt-1 ${totalDeuda > 0 ? 'text-red-600 dark:text-red-400' : 'text-green-600 dark:text-green-400'}`}>
                                {formatCurrency(totalDeuda)}
                            </p>
                        </div>
                    </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* Cuentas Pendientes */}
                    <div className="space-y-4">
                        <div className="flex justify-between items-center">
                            <h3 className="text-lg font-bold text-gray-900 dark:text-white">Cuentas Pendientes</h3>
                            <Button onClick={() => setIsRegistrarModalOpen(true)} size="sm" disabled={pagosPendientes.length === 0} className="bg-emerald-600 hover:bg-emerald-700 text-white">
                                <ReceiptIcon className="w-4 h-4 mr-1"/> Registrar Pago
                            </Button>
                        </div>
                        <div className="space-y-3 max-h-96 overflow-y-auto pr-2">
                            {pagosPendientes.length > 0 ? pagosPendientes.map(p => {
                                return (
                                    <div key={p.id} className="p-4 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 hover:border-yellow-400 dark:hover:border-yellow-600 transition-colors flex justify-between items-center shadow-sm">
                                        <div className="flex-grow">
                                            <div className="flex justify-between items-start">
                                                <div>
                                                    <p className="font-semibold text-gray-900 dark:text-white">{p.concepto}</p>
                                                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                                                        Fecha: {p.fecha} | Cuotas: {p.cuotas}
                                                        {p.tasaCambio && <span className="ml-2 px-2 py-0.5 bg-gray-100 dark:bg-gray-700 rounded-full text-[10px] font-bold text-gray-600 dark:text-gray-300">Tasa: {p.tasaCambio}</span>}
                                                    </p>
                                                </div>
                                                <p className="font-bold text-right text-gray-900 dark:text-white">
                                                    {formatCurrency(p.montoBs)}
                                                    {p.montoUsd && <span className="block text-xs font-normal text-gray-500 dark:text-gray-400">(${p.montoUsd.toFixed(2)})</span>}
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
                                                    await onDeletePago(p.id);
                                                }}
                                                title="Eliminar Deuda"
                                            >
                                                <TrashIcon className="w-4 h-4" />
                                            </Button>
                                        )}
                                    </div>
                                )
                            }) : (
                                <div className="text-center py-10 bg-gray-50 dark:bg-gray-800/50 rounded-lg border border-dashed border-gray-300 dark:border-gray-700">
                                    <CheckCircleIcon className="mx-auto h-10 w-10 text-green-500 mb-2" />
                                    <p className="text-gray-500 dark:text-gray-400 font-medium">Sin deudas pendientes.</p>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Historial de Recibos */}
                    <div className="space-y-4">
                        <h3 className="text-lg font-bold text-gray-900 dark:text-white">Historial de Recibos</h3>
                        <div className="space-y-3 max-h-96 overflow-y-auto pr-2">
                            {recibosAsociado.length > 0 ? recibosAsociado.map(r => (
                                <div key={r.id} className="p-4 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 shadow-sm flex justify-between items-center">
                                    <div className="text-sm">
                                        <p className="font-semibold text-gray-900 dark:text-white">Recibo N°: {r.comprobanteNumero}</p>
                                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">Fecha: {r.fechaPago}</p>
                                    </div>
                                    <div className="text-right">
                                        <p className="font-bold text-emerald-600 dark:text-emerald-400">{formatCurrency(r.montoTotalBs)}</p>
                                        <Button size="sm" variant="secondary" onClick={() => handleViewRecibo(r)} className="mt-1">
                                            <EyeIcon className="w-3 h-3 mr-1" /> Ver
                                        </Button>
                                    </div>
                                </div>
                            )) : (
                                <div className="text-center py-10 bg-gray-50 dark:bg-gray-800/50 rounded-lg border border-dashed border-gray-300 dark:border-gray-700">
                                    <ExclamationTriangleIcon className="mx-auto h-10 w-10 text-gray-400 mb-2" />
                                    <p className="text-gray-500 dark:text-gray-400 font-medium">No hay recibos registrados.</p>
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                <div className="flex justify-end pt-4 border-t dark:border-gray-700">
                    <Button variant="secondary" onClick={onClose}>Cerrar</Button>
                </div>
            </div>

            {isRegistrarModalOpen && (
                <RegistrarPagoModal
                    isOpen={isRegistrarModalOpen}
                    onClose={() => setIsRegistrarModalOpen(false)}
                    asociado={asociado}
                    pagosPendientes={pagosPendientes}
                    onSaveRecibo={onSaveRecibo}
                    companyInfo={companyInfo}
                />
            )}

            {viewReciboModalOpen && selectedRecibo && (
                <ReciboPagoAsociadoModal
                    isOpen={viewReciboModalOpen}
                    onClose={() => setViewReciboModalOpen(false)}
                    recibo={selectedRecibo}
                    asociado={asociado}
                    pagos={pagos}
                    companyInfo={companyInfo}
                />
            )}
        </Modal>
    );
};

export default AsociadoFinanzasModal;
