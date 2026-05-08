
import React, { useState, useMemo } from 'react';
import { Vehicle, Certificado } from '../../types';
import Card, { CardHeader, CardTitle } from '../ui/Card';
import Button from '../ui/Button';
import Input from '../ui/Input';
import Select from '../ui/Select';
import { PlusIcon, EditIcon, TrashIcon, SaveIcon, ArrowLeftIcon, ChevronDownIcon } from '../icons/Icons';
import CertificadoFormModal from './CertificadoFormModal';
import { useToast } from '../ui/ToastProvider';
import ConfirmationModal from '../ui/ConfirmationModal';

interface CertificadoVehiculoTabProps {
    asociadoId: string;
    vehicles: Vehicle[];
    onSaveVehicle: (vehicle: Vehicle) => Promise<void>;
    onDeleteVehicle: (vehicleId: string) => Promise<void>;
    certificados: Certificado[];
    onSaveCertificado: (certificado: Certificado) => Promise<void>;
    onDeleteCertificado: (certificadoId: string) => Promise<void>;
}

const emptyVehicle: Partial<Vehicle> = {
    tipo: '',
    uso: '', // Usaremos este campo para "Ruta" internamente si no hay uno específico
    placa: '',
    modelo: '',
    ano: new Date().getFullYear(),
    driver: '',
    actividadVehiculo: 'Carga',
};

const CertificadoVehiculoTab: React.FC<CertificadoVehiculoTabProps> = (props) => {
    const { 
        asociadoId, vehicles, onSaveVehicle, onDeleteVehicle, 
        certificados, onSaveCertificado, onDeleteCertificado 
    } = props;
    
    const { addToast } = useToast();
    const [viewMode, setViewMode] = useState<'list' | 'form'>('list');
    const [selectedVehicle, setSelectedVehicle] = useState<Partial<Vehicle> | null>(null);
    const [isCertModalOpen, setIsCertModalOpen] = useState(false);
    const [editingCertificado, setEditingCertificado] = useState<Certificado | null>(null);
    const [vehicleIdForCertModal, setVehicleIdForCertModal] = useState<string | null>(null);
    const [isConfirmDeleteOpen, setIsConfirmDeleteOpen] = useState(false);
    const [certIdToDelete, setCertIdToDelete] = useState<string | null>(null);
    const [isConfirmDeleteVehicleOpen, setIsConfirmDeleteVehicleOpen] = useState(false);
    const [vehicleIdToDelete, setVehicleIdToDelete] = useState<string | null>(null);

    const associateVehicles = useMemo(() => vehicles.filter(v => v.asociadoId === asociadoId), [vehicles, asociadoId]);
    
    const vehicleCertificados = useMemo(() => {
        if (!selectedVehicle || !selectedVehicle.id) return [];
        return certificados.filter(c => c.vehiculoId === selectedVehicle.id);
    }, [certificados, selectedVehicle]);

    const handleSelectVehicle = (vehicle: Vehicle) => {
        setSelectedVehicle(vehicle);
        setViewMode('form');
    };

    const handleNewVehicle = () => {
        setSelectedVehicle({ ...emptyVehicle, asociadoId });
        setViewMode('form');
    };

    const handleBackToList = () => {
        setViewMode('list');
        setSelectedVehicle(null);
    };

    const handleVehicleFormChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name, value, type } = e.target;
        setSelectedVehicle(prev => prev ? ({ ...prev, [name]: type === 'number' ? Number(value) : value }) : null);
    };

    const handleVehicleFormSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (selectedVehicle) {
            await onSaveVehicle(selectedVehicle as Vehicle);
            handleBackToList();
        }
    };
    
    const handleOpenCertModal = (vehicleId: string, cert: Certificado | null) => {
        setVehicleIdForCertModal(vehicleId);
        setEditingCertificado(cert);
        setIsCertModalOpen(true);
    };

    const handleSaveCert = async (cert: Certificado) => {
        await onSaveCertificado(cert);
        setIsCertModalOpen(false);
    };

    const handleConfirmDeleteCert = (id: string) => {
        setCertIdToDelete(id);
        setIsConfirmDeleteOpen(true);
    };

    const executeDeleteCert = async () => {
        if (certIdToDelete) {
            await onDeleteCertificado(certIdToDelete);
            setIsConfirmDeleteOpen(false);
            setCertIdToDelete(null);
        }
    };

    const handleConfirmDeleteVehicle = (id: string) => {
        setVehicleIdToDelete(id);
        setIsConfirmDeleteVehicleOpen(true);
    };

    const executeDeleteVehicle = async () => {
        if (vehicleIdToDelete) {
            try {
                await onDeleteVehicle(vehicleIdToDelete);
                addToast({ type: 'success', title: 'Eliminado', message: 'Vehículo eliminado correctamente.' });
            } catch (error: any) {
                console.error('Error deleting vehicle:', error);
                addToast({ type: 'error', title: 'Error', message: error.message || 'No se pudo eliminar el vehículo.' });
            } finally {
                setIsConfirmDeleteVehicleOpen(false);
                setVehicleIdToDelete(null);
            }
        }
    };
    
    const renderListView = () => (
        <>
            <div className="flex justify-end mb-4">
                <Button onClick={handleNewVehicle}><PlusIcon className="w-4 h-4 mr-2" />Añadir Vehículo</Button>
            </div>
             <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {associateVehicles.map(vehiculo => {
                    const vehicleCerts = certificados.filter(c => c.vehiculoId === vehiculo.id);
                    return (
                        <Card key={vehiculo.id} className="p-0 flex flex-col">
                            <div className="p-4">
                                <div className="flex justify-between items-start">
                                    <div>
                                        <p className="font-bold text-lg text-primary-600 dark:text-primary-400">{vehiculo.modelo} ({vehiculo.ano})</p>
                                        <p className="text-sm font-mono bg-gray-200 dark:bg-gray-700 px-2 py-0.5 rounded inline-block">{vehiculo.placa}</p>
                                    </div>
                                    <div className="flex gap-2">
                                        <Button variant="secondary" size="sm" onClick={() => handleSelectVehicle(vehiculo as Vehicle)}><EditIcon className="w-4 h-4" /></Button>
                                        <Button variant="danger" size="sm" onClick={() => handleConfirmDeleteVehicle(vehiculo.id)}><TrashIcon className="w-4 h-4" /></Button>
                                    </div>
                                </div>
                                <div className="grid grid-cols-1 gap-1 mt-3 text-sm">
                                    <p><strong>Tipo:</strong> {vehiculo.tipo || 'N/A'}</p>
                                    <p><strong>Ruta:</strong> {vehiculo.uso || 'N/A'}</p>
                                    <p><strong>Conductor:</strong> {vehiculo.driver || 'N/A'}</p>
                                </div>
                            </div>
                            <div className="p-4 border-t dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50 flex-grow">
                                <div className="flex justify-between items-center mb-2">
                                    <h4 className="font-semibold text-sm text-gray-800 dark:text-gray-200">Certificados</h4>
                                    <Button size="sm" variant="secondary" onClick={() => handleOpenCertModal(vehiculo.id, null)}>
                                        <PlusIcon className="w-3 h-3 mr-1" /> Añadir
                                    </Button>
                                </div>
                                {vehicleCerts.length > 0 ? (
                                    <ul className="space-y-2 text-xs">
                                        {vehicleCerts.map(cert => (
                                            <li key={cert.id} className="p-2 rounded-md bg-white dark:bg-gray-900/50 flex justify-between items-center group">
                                                <div className="flex flex-col">
                                                    <div className="flex items-center space-x-2">
                                                        <span className="font-bold text-primary-600 dark:text-primary-400">[{cert.codigo}]</span>
                                                        <span className="font-medium">{cert.descripcion}</span>
                                                    </div>
                                                    <span className="text-[10px] text-gray-400">{cert.status}</span>
                                                </div>
                                                <div className="flex space-x-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                                    <button 
                                                        onClick={() => handleOpenCertModal(vehiculo.id, cert)}
                                                        className="p-1 text-blue-600 hover:bg-blue-50 rounded"
                                                        title="Editar Certificado"
                                                    >
                                                        <EditIcon className="w-3 h-3" />
                                                    </button>
                                                    <button 
                                                        onClick={() => handleConfirmDeleteCert(cert.id)}
                                                        className="p-1 text-red-600 hover:bg-red-50 rounded"
                                                        title="Eliminar Certificado"
                                                    >
                                                        <TrashIcon className="w-3 h-3" />
                                                    </button>
                                                </div>
                                            </li>
                                        ))}
                                    </ul>
                                ) : <p className="text-xs text-center text-gray-500 py-2">Sin certificados.</p>}
                            </div>
                        </Card>
                    )
                })}
            </div>
             {associateVehicles.length === 0 && <p className="text-center py-8 text-gray-500">Este asociado no tiene vehículos registrados.</p>}
        </>
    );

    const renderFormView = () => (
        selectedVehicle && (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <h3 className="text-xl font-semibold text-gray-800 dark:text-white">{selectedVehicle.id ? 'Editando Vehículo' : 'Nuevo Vehículo'}</h3>
                <Button variant="secondary" onClick={handleBackToList}><ArrowLeftIcon className="w-4 h-4 mr-2" />Volver a la Lista</Button>
            </div>
            
            <form onSubmit={handleVehicleFormSubmit} className="space-y-6">
                <div className="bg-gray-50 dark:bg-gray-800/50 p-6 rounded-xl border dark:border-gray-700">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <Input label="Tipo de Vehículo" name="tipo" value={selectedVehicle.tipo || ''} onChange={handleVehicleFormChange} required placeholder="Ej. Camioneta, Autobús..." />
                        <Input label="Ruta" name="uso" value={selectedVehicle.uso || ''} onChange={handleVehicleFormChange} required placeholder="Ej. Caracas - Valencia" />
                        <Input label="Placa" name="placa" value={selectedVehicle.placa || ''} onChange={handleVehicleFormChange} required placeholder="ABC-123" />
                        <Input label="Modelo" name="modelo" value={selectedVehicle.modelo || ''} onChange={handleVehicleFormChange} required placeholder="Ej. Toyota Dyna" />
                        <Input label="Año" name="ano" type="number" value={selectedVehicle.ano || ''} onChange={handleVehicleFormChange} required />
                        <Input label="Conductor" name="driver" value={selectedVehicle.driver || ''} onChange={handleVehicleFormChange} required placeholder="Nombre completo" />
                    </div>
                </div>

                {selectedVehicle.id && (
                    <div className="p-6 border dark:border-gray-700 rounded-xl bg-white dark:bg-gray-800">
                         <div className="flex justify-between items-center mb-4">
                            <h4 className="font-bold text-gray-800 dark:text-white uppercase tracking-wider">Certificados del Vehículo</h4>
                            <Button type="button" size="sm" onClick={() => handleOpenCertModal(selectedVehicle.id as string, null)}><PlusIcon className="w-4 h-4 mr-2" />Nuevo Certificado</Button>
                        </div>
                        <div className="overflow-x-auto">
                            <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                                <thead>
                                    <tr>
                                        <th className="px-4 py-2 text-left text-xs font-bold text-gray-500 uppercase">Código</th>
                                        <th className="px-4 py-2 text-left text-xs font-bold text-gray-500 uppercase">Descripción</th>
                                        <th className="px-4 py-2 text-left text-xs font-bold text-gray-500 uppercase">Fecha</th>
                                        <th className="px-4 py-2 text-left text-xs font-bold text-gray-500 uppercase">Estado</th>
                                        <th className="relative px-4 py-2"></th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {vehicleCertificados.map(c => (
                                        <tr key={c.id}>
                                            <td className="px-4 py-2 text-sm font-mono font-bold text-primary-600 dark:text-primary-400">{c.codigo}</td>
                                            <td className="px-4 py-2 text-sm">{c.descripcion}</td>
                                            <td className="px-4 py-2 text-sm">{c.fechaInicio}</td>
                                            <td className="px-4 py-2 text-sm font-semibold">{c.status}</td>
                                            <td className="px-4 py-2 text-right space-x-2">
                                                <Button variant="secondary" size="sm" type="button" onClick={() => handleOpenCertModal(selectedVehicle.id as string, c)}><EditIcon className="w-4 h-4" /></Button>
                                                <Button variant="danger" size="sm" type="button" onClick={() => handleConfirmDeleteCert(c.id)}><TrashIcon className="w-4 h-4" /></Button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}
                
                <div className="flex justify-end pt-4">
                    <Button type="submit" size="lg">
                        <SaveIcon className="w-5 h-5 mr-2" />
                        {selectedVehicle.id ? 'Actualizar Vehículo' : 'Registrar Vehículo'}
                    </Button>
                </div>
            </form>
        </div>
    ));

    return (
        <div className="min-h-[400px]">
            {viewMode === 'list' ? renderListView() : renderFormView()}
            {isCertModalOpen && vehicleIdForCertModal && (
                 <CertificadoFormModal
                    isOpen={isCertModalOpen}
                    onClose={() => setIsCertModalOpen(false)}
                    onSave={handleSaveCert}
                    certificado={editingCertificado}
                    vehiculoId={vehicleIdForCertModal}
                />
            )}
            <ConfirmationModal
                isOpen={isConfirmDeleteVehicleOpen}
                onClose={() => setIsConfirmDeleteVehicleOpen(false)}
                onConfirm={executeDeleteVehicle}
                title="Eliminar Vehículo"
                message="¿Estás seguro de que deseas eliminar este vehículo y todos sus certificados? Esta acción no se puede deshacer."
                confirmText="Eliminar Vehículo"
                variant="danger"
            />
            <ConfirmationModal
                isOpen={isConfirmDeleteOpen}
                onClose={() => setIsConfirmDeleteOpen(false)}
                onConfirm={executeDeleteCert}
                title="Eliminar Certificado"
                message="¿Estás seguro de que deseas eliminar este certificado? Esta acción no se puede deshacer."
                confirmText="Eliminar"
                variant="danger"
            />
        </div>
    );
};

export default CertificadoVehiculoTab;
