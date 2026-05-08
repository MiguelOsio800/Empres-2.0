
import React, { useState, useMemo } from 'react';
import { Invoice, Vehicle, Office, CompanyInfo, ShippingType } from '../../types';
import Modal from '../ui/Modal';
import Button from '../ui/Button';
import { calculateInvoiceChargeableWeight, calculateDetailedRemesaFinancials } from '../../utils/financials';
import { ExclamationTriangleIcon, TruckIcon, XIcon } from '../icons/Icons';

interface AssignInvoiceModalProps {
    isOpen: boolean;
    onClose: () => void;
    onAssign: (invoiceIds: string[]) => void;
    vehicle: Vehicle;
    availableInvoices: Invoice[];
    allInvoices: Invoice[]; // all invoices to calculate current load
    offices: Office[];
    companyInfo: CompanyInfo;
    shippingTypes: ShippingType[];
}

const AssignInvoiceModal: React.FC<AssignInvoiceModalProps> = ({ isOpen, onClose, onAssign, vehicle, availableInvoices, allInvoices, offices, companyInfo, shippingTypes }) => {
    const [selectedInvoiceIds, setSelectedInvoiceIds] = useState<string[]>([]);

    const [searchTerm, setSearchTerm] = useState('');

    const { currentLoadKg, selectedInvoicesWeight, newTotalLoad, isOverloaded, currentInvoices, selectedInvoices } = useMemo(() => {
        // Calculate what is already on the truck
        // FIX: Only count invoices that are "Pendiente para Despacho". 
        // Invoices that are "En Tránsito" or "Entregada" (already in a Remesa) should not count towards current loading capacity.
        const currentLoadKg = allInvoices
            .filter(i => i.vehicleId === vehicle.id && i.shippingStatus === 'Pendiente para Despacho')
            .reduce((sum, inv) => sum + calculateInvoiceChargeableWeight(inv), 0);
        
        const currentInvoices = allInvoices.filter(i => i.vehicleId === vehicle.id && i.shippingStatus === 'Pendiente para Despacho');
        
        // Calculate what is being selected
        const selectedInvoices = selectedInvoiceIds.map(id => availableInvoices.find(inv => inv.id === id)).filter(Boolean) as Invoice[];
        const selectedInvoicesWeight = selectedInvoices.reduce((sum, invoice) => {
            return sum + calculateInvoiceChargeableWeight(invoice);
        }, 0);
        
        const newTotalLoad = currentLoadKg + selectedInvoicesWeight;
        const isOverloaded = vehicle.capacidadCarga > 0 && newTotalLoad > vehicle.capacidadCarga;

        return { currentLoadKg, selectedInvoicesWeight, newTotalLoad, isOverloaded, currentInvoices, selectedInvoices };
    }, [allInvoices, availableInvoices, selectedInvoiceIds, vehicle]);

    const financials = useMemo(() => {
        const invoicesToCalculate = [...currentInvoices, ...selectedInvoices];
        if (invoicesToCalculate.length === 0) return null;
        return calculateDetailedRemesaFinancials(invoicesToCalculate, companyInfo, shippingTypes, undefined);
    }, [currentInvoices, selectedInvoices, companyInfo, shippingTypes]);

    const formatCurrency = (amount: number) => `Bs. ${amount.toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

    const handleToggleInvoice = (invoiceId: string) => {
        setSelectedInvoiceIds(prev =>
            prev.includes(invoiceId)
                ? prev.filter(id => id !== invoiceId)
                : [...prev, invoiceId]
        );
    };

    const handleAssignClick = () => {
        if (selectedInvoiceIds.length > 0) {
            onAssign(selectedInvoiceIds);
        }
    };

    const getOfficeName = (officeId: string) => offices.find(o => o.id === officeId)?.name || officeId;
    
    return (
        <Modal isOpen={isOpen} onClose={onClose} title={`Asignar Envíos a ${vehicle.modelo} - ${vehicle.placa}`}>
            <div className="space-y-4">
                {/* Stats Header */}
                <div className={`p-3 rounded-lg border ${isOverloaded ? 'bg-red-50 border-red-200 dark:bg-red-900/20 dark:border-red-800' : 'bg-blue-50 border-blue-200 dark:bg-blue-900/20 dark:border-blue-800'}`}>
                    <div className="flex items-center gap-2 mb-2">
                        <TruckIcon className={`w-5 h-5 ${isOverloaded ? 'text-red-600' : 'text-blue-600'}`} />
                        <span className={`font-semibold ${isOverloaded ? 'text-red-700 dark:text-red-300' : 'text-blue-700 dark:text-blue-300'}`}>
                            Capacidad del Vehículo: {vehicle.capacidadCarga} Kg
                        </span>
                    </div>
                    <div className="grid grid-cols-3 gap-2 text-sm text-center">
                        <div className="bg-white dark:bg-gray-800 p-2 rounded shadow-sm">
                            <p className="text-gray-500 text-xs">Carga Actual</p>
                            <p className="font-bold">{currentLoadKg.toFixed(2)} Kg</p>
                        </div>
                        <div className="bg-white dark:bg-gray-800 p-2 rounded shadow-sm">
                            <p className="text-gray-500 text-xs">Selección</p>
                            <p className="font-bold text-blue-600">+{selectedInvoicesWeight.toFixed(2)} Kg</p>
                        </div>
                        <div className={`bg-white dark:bg-gray-800 p-2 rounded shadow-sm border ${isOverloaded ? 'border-red-500' : 'border-transparent'}`}>
                            <p className="text-gray-500 text-xs">Total Final</p>
                            <p className={`font-bold ${isOverloaded ? 'text-red-600' : 'text-gray-800 dark:text-white'}`}>
                                {newTotalLoad.toFixed(2)} Kg
                            </p>
                        </div>
                    </div>
                    {isOverloaded && (
                        <div className="mt-2 text-xs text-red-600 dark:text-red-400 flex items-center justify-center gap-1">
                            <ExclamationTriangleIcon className="w-3 h-3" />
                            <span>El vehículo excede su capacidad registrada, pero puede continuar.</span>
                        </div>
                    )}
                </div>

                {/* Financial Summary */}
                {financials && (
                    <div className="bg-gray-50 dark:bg-gray-800 p-3 rounded-lg border dark:border-gray-700 text-sm">
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <h4 className="font-bold text-gray-700 dark:text-gray-300 border-b pb-1 mb-2">Totales Estimados</h4>
                                <div className="space-y-1">
                                    <div className="flex justify-between">
                                        <span className="text-gray-600 dark:text-gray-400">Pagado:</span>
                                        <span className="font-semibold text-green-700 dark:text-green-400">
                                            {formatCurrency(financials.pagado.favorCooperativa + financials.pagado.seguro + financials.pagado.ipostel + financials.pagado.manejo + financials.pagado.iva + financials.pagado.favorAsociado)}
                                        </span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="text-gray-600 dark:text-gray-400">Destino:</span>
                                        <span className="font-semibold text-blue-700 dark:text-blue-400">
                                            {formatCurrency(financials.totalDestino)}
                                        </span>
                                    </div>
                                    <div className="flex justify-between border-t border-gray-200 dark:border-gray-600 pt-1 mt-1 font-bold">
                                        <span className="text-gray-800 dark:text-gray-200">Total Remesa:</span>
                                        <span className="text-gray-800 dark:text-gray-200">
                                            {formatCurrency((financials.pagado.favorCooperativa + financials.pagado.seguro + financials.pagado.ipostel + financials.pagado.manejo + financials.pagado.iva + financials.pagado.favorAsociado) + financials.totalDestino)}
                                        </span>
                                    </div>
                                </div>
                            </div>
                            <div>
                                <h4 className="font-bold text-gray-700 dark:text-gray-300 border-b pb-1 mb-2">Saldos Estimados</h4>
                                <div className="space-y-1">
                                    <div className="flex justify-between">
                                        <span className="text-gray-600 dark:text-gray-400">Favor Socio (Pagadas):</span>
                                        <span className="font-semibold">{formatCurrency(financials.pagado.favorAsociado)}</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="text-gray-600 dark:text-gray-400">Favor Coop (Destino):</span>
                                        <span className="font-semibold">{formatCurrency(financials.destino.favorCooperativa + financials.destino.seguro + financials.destino.ipostel + financials.destino.manejo + financials.destino.iva)}</span>
                                    </div>
                                    <div className="flex justify-between border-t border-gray-200 dark:border-gray-600 pt-1 mt-1 font-bold bg-white dark:bg-gray-900 rounded px-1">
                                        <span className="text-gray-800 dark:text-gray-200 uppercase text-[10px]">
                                            {financials.conceptoSaldo}:
                                        </span>
                                        <span className={`text-gray-800 dark:text-gray-200 ${financials.saldoFinal > 0 ? 'text-amber-600 dark:text-amber-400' : 'text-primary-600 dark:text-primary-400'}`}>
                                            {formatCurrency(Math.abs(financials.saldoFinal))}
                                        </span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Available Invoices */}
                    <div className="space-y-2">
                        <div className="flex items-center justify-between">
                            <h3 className="font-semibold text-sm text-gray-700 dark:text-gray-300">Facturas Disponibles</h3>
                        </div>
                        <input
                            type="text"
                            placeholder="Buscar por número..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full px-3 py-1.5 text-sm border rounded-md focus:ring-primary-500 focus:border-primary-500 dark:bg-gray-800 dark:border-gray-700 dark:text-white"
                        />
                        <div className="space-y-2 max-h-80 overflow-y-auto pr-2">
                            {availableInvoices.filter(inv => !selectedInvoiceIds.includes(inv.id) && inv.invoiceNumber.toLowerCase().includes(searchTerm.toLowerCase())).length > 0 ? (
                                availableInvoices.filter(inv => !selectedInvoiceIds.includes(inv.id) && inv.invoiceNumber.toLowerCase().includes(searchTerm.toLowerCase())).map(invoice => {
                                    const weight = calculateInvoiceChargeableWeight(invoice);
                                    return (
                                        <div
                                            key={invoice.id}
                                            onClick={() => handleToggleInvoice(invoice.id)}
                                            className="p-3 border rounded-lg cursor-pointer flex items-center justify-between transition-all bg-white dark:bg-gray-800/50 hover:bg-gray-50 dark:hover:bg-gray-700/50"
                                        >
                                            <div>
                                                <p className="font-semibold text-primary-600 dark:text-primary-400">{invoice.invoiceNumber}</p>
                                                <p className="text-sm text-gray-600 dark:text-gray-300">{invoice.clientName}</p>
                                            </div>
                                            <div className="text-right">
                                                <p className="text-sm">{getOfficeName(invoice.guide.destinationOfficeId)}</p>
                                                <p className="text-xs text-gray-500 dark:text-gray-400 font-bold">{weight.toFixed(2)} kg</p>
                                            </div>
                                        </div>
                                    )
                                })
                            ) : (
                                <p className="text-center text-gray-500 dark:text-gray-400 py-8 text-sm">No hay facturas disponibles para seleccionar.</p>
                            )}
                        </div>
                    </div>

                    {/* Selected Invoices */}
                    <div className="space-y-2">
                        <h3 className="font-semibold text-sm text-gray-700 dark:text-gray-300">Facturas Seleccionadas ({selectedInvoiceIds.length})</h3>
                        <div className="space-y-2 max-h-80 overflow-y-auto pr-2">
                            {selectedInvoiceIds.length > 0 ? (
                                selectedInvoiceIds.map(id => {
                                    const invoice = availableInvoices.find(inv => inv.id === id);
                                    if (!invoice) return null;
                                    const weight = calculateInvoiceChargeableWeight(invoice);
                                    return (
                                        <div
                                            key={invoice.id}
                                            className="p-3 border rounded-lg flex items-center justify-between transition-all bg-green-50 dark:bg-green-900/30 border-green-400 ring-1 ring-green-300"
                                        >
                                            <div>
                                                <p className="font-semibold text-primary-600 dark:text-primary-400">{invoice.invoiceNumber}</p>
                                                <p className="text-sm text-gray-600 dark:text-gray-300">{invoice.clientName}</p>
                                            </div>
                                            <div className="text-right flex items-center gap-3">
                                                <div>
                                                    <p className="text-sm">{getOfficeName(invoice.guide.destinationOfficeId)}</p>
                                                    <p className="text-xs text-gray-500 dark:text-gray-400 font-bold">{weight.toFixed(2)} kg</p>
                                                </div>
                                                <button 
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        handleToggleInvoice(invoice.id);
                                                    }}
                                                    className="text-red-500 hover:text-red-700 p-1 rounded-full hover:bg-red-100 dark:hover:bg-red-900/30 transition-colors"
                                                    title="Quitar factura"
                                                >
                                                    <XIcon className="w-5 h-5" />
                                                </button>
                                            </div>
                                        </div>
                                    )
                                })
                            ) : (
                                <p className="text-center text-gray-500 dark:text-gray-400 py-8 text-sm">No has seleccionado ninguna factura.</p>
                            )}
                        </div>
                    </div>
                </div>
            </div>
            
            <div className="flex justify-end space-x-2 pt-4 mt-2 border-t dark:border-gray-700">
                <Button variant="secondary" onClick={onClose}>Cancelar</Button>
                {/* Button is NOT disabled when overloaded, only when empty */}
                <Button onClick={handleAssignClick} disabled={selectedInvoiceIds.length === 0}>
                    Asignar ({selectedInvoiceIds.length}) Envíos
                </Button>
            </div>
        </Modal>
    );
};

export default AssignInvoiceModal;
