
import React, { useState, useMemo } from 'react';
import { Remesa, Invoice, Asociado, Vehicle, Client, Office, CompanyInfo, Permissions, Category, ShippingType } from '../../types';
import Card, { CardHeader, CardTitle } from '../ui/Card';
import Button from '../ui/Button';
import { PlusIcon, EyeIcon, TrashIcon, ClipboardDocumentListIcon, XIcon, PlayIcon, FileTextIcon } from '../icons/Icons';
import Select from '../ui/Select';
import AsociadoSearchInput from '../asociados/AsociadoSearchInput';
import RemesaDocumentModal from './RemesaDocumentModal';
import { calculateInvoiceChargeableWeight, calculateDetailedRemesaFinancials } from '../../utils/financials';
import AssignInvoiceModal from '../flota/AssignInvoiceModal';
import Input from '../ui/Input';
import { useConfirm } from '../../contexts/ConfirmationContext';

interface RemesasViewProps {
    remesas: Remesa[];
    asociados: Asociado[];
    vehicles: Vehicle[];
    invoices: Invoice[];
    offices: Office[];
    clients: Client[];
    categories: Category[];
    shippingTypes: ShippingType[];
    onAssignToVehicle: (invoiceIds: string[], vehicleId: string) => Promise<void>;
    onUnassignInvoice: (invoiceId: string) => Promise<void>;
    onDispatchVehicle: (vehicleId: string, invoiceIds: string[], exchangeRate: number, asociadoId: string, cooperativeAmount: number) => Promise<Remesa | null>;
    onDeleteRemesa: (remesaId: string) => Promise<void>;
    permissions: Permissions;
    companyInfo: CompanyInfo;
}

const RemesasView: React.FC<RemesasViewProps> = (props) => {
    const { 
        remesas, asociados, vehicles, invoices, offices, clients, categories, shippingTypes,
        onAssignToVehicle, onUnassignInvoice, onDispatchVehicle, onDeleteRemesa,
        permissions, companyInfo 
    } = props;

    const { confirm } = useConfirm();

    const [selectedAsociadoId, setSelectedAsociadoId] = useState<string>('');
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');
    
    const [isAssignModalOpen, setIsAssignModalOpen] = useState(false);
    const [vehicleToAssign, setVehicleToAssign] = useState<Vehicle | null>(null);

    const [isManifestModalOpen, setIsManifestModalOpen] = useState(false);
    const [remesaForManifest, setRemesaForManifest] = useState<Remesa | null>(null);

    const associateVehicles = useMemo(() => {
        if (!selectedAsociadoId) return [];
        return vehicles.filter(v => v.asociadoId === selectedAsociadoId);
    }, [vehicles, selectedAsociadoId]);

    const availableInvoices = useMemo(() => {
        const dispatchedInvoiceIds = new Set(remesas.flatMap(r => r.invoiceIds));
        return invoices.filter(inv => 
            !inv.vehicleId && 
            inv.shippingStatus === 'Pendiente para Despacho' && 
            inv.status === 'Activa' &&
            (!inv.remesaId || inv.remesaId === null) &&
            !dispatchedInvoiceIds.has(inv.id)
        );
    }, [invoices, remesas]);

    const filteredRemesas = useMemo(() => {
        let filtered = remesas;
        if (startDate) {
            const startStr = startDate.split('T')[0];
            filtered = filtered.filter(r => r.date.split('T')[0] >= startStr);
        }
        if (endDate) {
            const endStr = endDate.split('T')[0];
            filtered = filtered.filter(r => r.date.split('T')[0] <= endStr);
        }
        return filtered;
    }, [remesas, startDate, endDate]);

    const handleOpenAssignModal = (vehicle: Vehicle) => {
        setVehicleToAssign(vehicle);
        setIsAssignModalOpen(true);
    };

    const handleAssignInvoices = async (invoiceIds: string[]) => {
        if(vehicleToAssign) {
            await onAssignToVehicle(invoiceIds, vehicleToAssign.id);
        }
        setIsAssignModalOpen(false);
    };
    
    const handleDispatchAndShowManifest = async (vehicleId: string) => {
        const vehicle = vehicles.find(v => v.id === vehicleId);
        if (!vehicle) return;
        
        // FIX: Only dispatch invoices that are 'Pendiente para Despacho' and NOT already in a remesa
        const assignedInvoices = getAssignedInvoices(vehicleId);
        
        if (assignedInvoices.length === 0) {
            alert("No hay facturas pendientes para despachar en este vehículo.");
            return;
        }

        const invoiceIds = assignedInvoices.map(inv => inv.id);
        
        // Calculate cooperativeAmount via financials
        const currentAsociado = asociados.find(a => a.id === vehicle.asociadoId);
        const financials = calculateDetailedRemesaFinancials(assignedInvoices, companyInfo, shippingTypes, currentAsociado);
        
        const exchangeRate = companyInfo.bcvRate || 1;
        const newRemesa = await onDispatchVehicle(vehicleId, invoiceIds, exchangeRate, vehicle.asociadoId, financials.cooperativeAmount);
        if (newRemesa) {
            setRemesaForManifest(newRemesa);
            setIsManifestModalOpen(true);
        }
    };


    const handleOpenManifestModal = (remesa: Remesa) => {
        setRemesaForManifest(remesa);
        setIsManifestModalOpen(true);
    };

    const handleUnassignClick = async (invId: string) => {
        const isConfirmed = await confirm({
            title: '¿Remover Factura?',
            message: '¿Está seguro de que desea remover esta factura de la carga actual?',
            confirmText: 'Sí, remover',
            cancelText: 'Cancelar',
            variant: 'danger'
        });
        if (isConfirmed) {
            await onUnassignInvoice(invId);
        }
    };

    const handleDeleteRemesaClick = async (remesaId: string) => {
        const isConfirmed = await confirm({
            title: '¿Eliminar Remesa?',
            message: 'Esta acción no se puede deshacer. ¿Está seguro de que desea eliminar esta remesa?',
            confirmText: 'Sí, eliminar',
            cancelText: 'Cancelar',
            variant: 'danger'
        });
        if (isConfirmed) {
            await onDeleteRemesa(remesaId);
        }
    };

    const getAssignedInvoices = (vehicleId: string) => {
        // Get all invoice IDs that are already in a remesa
        // This is a safety check to prevent duplication if the backend status is out of sync
        const dispatchedInvoiceIds = new Set(remesas.flatMap(r => r.invoiceIds));
        
        return invoices.filter(inv => 
            inv.vehicleId === vehicleId && 
            inv.shippingStatus === 'Pendiente para Despacho' &&
            !dispatchedInvoiceIds.has(inv.id)
        );
    };
    
    const getVehicleRemesas = (vehicleId: string) => {
        return filteredRemesas.filter(r => r.vehicleId === vehicleId).sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    }

    return (
        <div className="space-y-6">
            <Card className="overflow-visible z-10 relative">
                <CardHeader>
                    <CardTitle>Gestión de Remesas</CardTitle>
                    <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Seleccione un asociado para ver sus vehículos, asignar cargas y generar remesas.</p>
                </CardHeader>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
                     <AsociadoSearchInput 
                        asociados={asociados} 
                        value={selectedAsociadoId} 
                        onAsociadoSelect={a => setSelectedAsociadoId(a.id)} 
                    />
                    <Input label="Desde" type="date" value={startDate} onChange={e => setStartDate(e.target.value)} />
                    <Input label="Hasta" type="date" value={endDate} onChange={e => setEndDate(e.target.value)} />
                </div>
            </Card>

            {selectedAsociadoId && (
                associateVehicles.length > 0 ? associateVehicles.map(vehicle => {
                    const assignedInvoices = getAssignedInvoices(vehicle.id);
                    const currentLoadKg = assignedInvoices.reduce((sum, inv) => sum + calculateInvoiceChargeableWeight(inv), 0);
                    const loadPercentage = vehicle.capacidadCarga > 0 ? (currentLoadKg / vehicle.capacidadCarga) * 100 : 0;
                    // Fix: Slice to show only last 7 remesas
                    const vehicleRemesas = getVehicleRemesas(vehicle.id).slice(0, 7);
                    
                    return (
                        <Card key={vehicle.id}>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                {/* Vehicle Info & Actions */}
                                <div className="md:col-span-1 border-r-0 md:border-r md:pr-6 dark:border-gray-700">
                                    <h3 className="font-bold text-lg text-primary-600 dark:text-primary-400">{vehicle.modelo}</h3>
                                    <p className="font-mono bg-gray-200 dark:bg-gray-700 px-2 py-0.5 rounded inline-block mb-2 text-sm">{vehicle.placa}</p>
                                    <div className="mt-2 text-sm space-y-1">
                                        <p><strong>Conductor:</strong> {vehicle.driver}</p>
                                        <p><strong>Capacidad:</strong> {vehicle.capacidadCarga} Kg</p>
                                    </div>
                                    <div className="mt-4">
                                        <div className="flex justify-between text-xs font-medium text-gray-600 dark:text-gray-400">
                                            <span>Carga para Despacho</span>
                                            <span>{currentLoadKg.toFixed(2)} Kg</span>
                                        </div>
                                        <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2.5 mt-1">
                                            <div className="bg-primary-600 h-2.5 rounded-full" style={{ width: `${Math.min(loadPercentage, 100)}%` }}></div>
                                        </div>
                                    </div>
                                    <div className="mt-4 space-y-2">
                                        <Button onClick={() => handleOpenAssignModal(vehicle)} className="w-full">
                                            <PlusIcon className="w-4 h-4 mr-2" /> Asignar Facturas
                                        </Button>
                                         <Button 
                                            onClick={() => handleDispatchAndShowManifest(vehicle.id)} 
                                            variant="primary" 
                                            className="w-full"
                                            disabled={assignedInvoices.length === 0}
                                        >
                                            <PlayIcon className="w-4 h-4 mr-2" /> Generar Remesa y Despachar
                                        </Button>
                                    </div>
                                    <div className="mt-4">
                                         <h4 className="font-semibold text-sm mb-2">Carga Actual ({assignedInvoices.length})</h4>
                                         {assignedInvoices.length > 0 ? (
                                             <ul className="text-xs space-y-1 max-h-32 overflow-y-auto pr-1">
                                                {assignedInvoices.map(inv => (
                                                    <li key={inv.id} className="flex justify-between items-center group p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-700/50">
                                                        <span>Factura #{inv.invoiceNumber}</span>
                                                        <button onClick={() => handleUnassignClick(inv.id)} className="text-red-500 hover:text-red-700 transition-colors p-1" title="Remover">
                                                            <XIcon className="w-4 h-4"/>
                                                        </button>
                                                    </li>
                                                ))}
                                             </ul>
                                         ) : <p className="text-xs text-gray-500 italic">No hay facturas asignadas para el próximo despacho.</p>}
                                    </div>
                                </div>
                                
                                {/* Remesa History */}
                                <div className="md:col-span-2">
                                    <h3 className="font-semibold text-lg mb-2">Historial de Remesas del Vehículo (Últimas 7)</h3>
                                    <div className="overflow-x-auto max-h-80">
                                        <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700 text-sm">
                                            <thead className="bg-gray-50 dark:bg-gray-700/50">
                                                <tr>
                                                    <th className="px-2 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Nº Remesa</th>
                                                    <th className="px-2 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Fecha</th>
                                                    <th className="px-2 py-2 text-center text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Facturas</th>
                                                    <th className="px-2 py-2 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Monto Total</th>
                                                    <th className="relative px-2 py-2"><span className="sr-only"></span></th>
                                                </tr>
                                            </thead>
                                            <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                                                {vehicleRemesas.map(rem => (
                                                    <tr key={rem.id}>
                                                        <td className="px-2 py-2 font-mono text-gray-800 dark:text-gray-200">{rem.remesaNumber}</td>
                                                        <td className="px-2 py-2 text-gray-800 dark:text-gray-200">{rem.date}</td>
                                                        <td className="px-2 py-2 text-center text-gray-800 dark:text-gray-200">{rem.invoiceIds.length}</td>
                                                        <td className="px-2 py-2 text-right font-semibold text-gray-800 dark:text-gray-200">
                                                            {rem.totalAmount.toLocaleString('es-VE')} Bs.
                                                            <div className="text-xs text-gray-500 dark:text-gray-400 font-normal mt-0.5">
                                                                {companyInfo.bcvRate > 0 && `$${(rem.totalAmount / (rem.exchangeRate || companyInfo.bcvRate)).toFixed(2)}`}
                                                            </div>
                                                        </td>
                                                        <td className="px-2 py-2 text-right space-x-1">
                                                            <Button size="sm" variant="secondary" onClick={() => handleOpenManifestModal(rem)}><EyeIcon className="w-4 h-4"/></Button>
                                                            {permissions['remesas.delete'] && <Button size="sm" variant="danger" onClick={() => handleDeleteRemesaClick(rem.id)}><TrashIcon className="w-4 h-4"/></Button>}
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                        {vehicleRemesas.length === 0 && <p className="text-center py-6 text-sm text-gray-500">Este vehículo no tiene historial de remesas para las fechas seleccionadas.</p>}
                                    </div>
                                </div>
                            </div>
                        </Card>
                    )
                }) : (
                     <Card>
                        <p className="text-center py-8 text-gray-500 dark:text-gray-400">El asociado seleccionado no tiene vehículos registrados.</p>
                     </Card>
                )
            )}

            {isAssignModalOpen && vehicleToAssign && (
                <AssignInvoiceModal
                    isOpen={isAssignModalOpen}
                    onClose={() => setIsAssignModalOpen(false)}
                    onAssign={handleAssignInvoices}
                    vehicle={vehicleToAssign}
                    allInvoices={invoices}
                    availableInvoices={availableInvoices}
                    offices={offices}
                    companyInfo={companyInfo}
                    shippingTypes={shippingTypes}
                    asociados={asociados}
                />
            )}
            
            {isManifestModalOpen && remesaForManifest && (
                 <RemesaDocumentModal
                    isOpen={isManifestModalOpen}
                    onClose={() => setIsManifestModalOpen(false)}
                    remesa={remesaForManifest}
                    invoices={invoices}
                    asociados={asociados}
                    vehicles={vehicles}
                    clients={clients}
                    companyInfo={companyInfo}
                    offices={offices}
                    categories={categories}
                    shippingTypes={shippingTypes}
                />
            )}
        </div>
    );
};

export default RemesasView;
