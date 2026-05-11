
import React, { useState, useEffect } from 'react';
import { Asociado, Vehicle, Certificado, Permissions } from '../../types';
import Button from '../ui/Button';
import { ArrowLeftIcon, TrashIcon } from '../icons/Icons';
import DatosSocioTab from './DatosSocioTab';
import CertificadoVehiculoTab from './CertificadoVehiculoTab';
import { useToast } from '../ui/ToastProvider';
import ConfirmationModal from '../ui/ConfirmationModal';
import { useData } from '../../contexts/DataContext';

interface AsociadoDetailViewProps {
    asociado: Asociado;
    onBack: () => void;
    onSaveAsociado: (asociado: Asociado) => Promise<Asociado>;
    onDeleteAsociado: (asociadoId: string) => Promise<void>;

    vehicles: Vehicle[];
    onSaveVehicle: (vehicle: Vehicle) => Promise<void>;
    onDeleteVehicle: (vehicleId: string) => Promise<void>;
    
    certificados: Certificado[];
    onSaveCertificado: (certificado: Certificado) => Promise<void>;
    onDeleteCertificado: (certificadoId: string) => Promise<void>;

    permissions: Permissions;
}

type Tab = 'datos' | 'vehiculos';

const AsociadoDetailView: React.FC<AsociadoDetailViewProps> = (props) => {
    const { asociado, onBack, onDeleteAsociado, permissions } = props;
    const { fetchAsociadoData } = useData();
    const [activeTab, setActiveTab] = useState<Tab>('datos');
    const [currentAsociado, setCurrentAsociado] = useState({
        ...asociado,
        codigo: asociado.codigo || '',
        nombre: asociado.nombre || '',
        cedula: asociado.cedula || ''
    });
    const [isLoading, setIsLoading] = useState(false);
    const [isConfirmDeleteOpen, setIsConfirmDeleteOpen] = useState(false);
    const { showToast } = useToast();

    useEffect(() => {
        if (asociado.id) {
            fetchAsociadoData(asociado.id);
        }
    }, [asociado.id, fetchAsociadoData]);

    const handleSaveAsociado = async (updatedAsociado: Asociado) => {
        // Validaciones robustas
        const codigoTrim = updatedAsociado.codigo?.trim();
        const nombreTrim = updatedAsociado.nombre?.trim();
        const cedulaTrim = updatedAsociado.cedula?.trim();

        if (!codigoTrim || !nombreTrim || !cedulaTrim) {
            showToast('Los campos Código, Nombre y Cédula son obligatorios.', 'error');
            return;
        }

        // Validación de formato de Cédula (Ej: V-12345678 o 12345678)
        const cedulaRegex = /^[VEve]?[-]?[0-9]{5,9}$/;
        if (!cedulaRegex.test(cedulaTrim)) {
            showToast('La Cédula debe tener un formato válido (ej: V-12345678 o solo números).', 'error');
            return;
        }

        setIsLoading(true);
        try {
            const hasId = !!updatedAsociado.id && updatedAsociado.id.trim() !== '';
            const payload = { ...updatedAsociado, codigo: codigoTrim, nombre: nombreTrim, cedula: cedulaTrim };
            
            const savedAsociado = await props.onSaveAsociado(payload);
            
            if (hasId) {
                showToast('Conductor actualizado correctamente.', 'success');
                onBack(); // Redirigir a la búsqueda tras actualizar
            } else {
                showToast('Conductor creado correctamente.', 'success');
                onBack(); // Redirigir a la búsqueda
            }
            
        } catch (error: any) {
            console.error("Error al guardar asociado:", error);
            
            // Manejo específico de duplicados (409 Conflict)
            if (error.message?.toLowerCase().includes('already exists') || error.message?.toLowerCase().includes('duplicado') || error.status === 409) {
                showToast('El Código o la Cédula ya pertenecen a otro conductor registrado.', 'error');
            } else {
                showToast(error.message || 'No se pudo guardar el conductor. Verifique los datos.', 'error');
            }
        } finally {
            setIsLoading(false);
        }
    };

    const handleDelete = async () => {
        setIsLoading(true);
        try {
            await onDeleteAsociado(currentAsociado.id);
            showToast('Conductor eliminado correctamente.', 'success');
            onBack();
        } catch (error: any) {
            console.error("Error al eliminar asociado:", error);
            showToast(error.message || 'No se pudo eliminar el conductor.', 'error');
        } finally {
            setIsLoading(false);
            setIsConfirmDeleteOpen(false);
        }
    };

    const TabButton: React.FC<{ tabId: Tab, label: string, disabled?: boolean }> = ({ tabId, label, disabled }) => (
        <button
            onClick={() => !disabled && setActiveTab(tabId)}
            disabled={disabled}
            className={`px-4 py-2 text-sm font-medium rounded-t-lg transition-colors border-b-2 ${
                disabled 
                    ? 'border-transparent text-gray-300 dark:text-gray-600 cursor-not-allowed'
                    : activeTab === tabId
                        ? 'border-primary-500 text-primary-600 dark:text-primary-400'
                        : 'border-transparent text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 hover:border-gray-300 dark:hover:border-gray-600'
            }`}
            title={disabled ? 'Debe registrar al conductor antes de gestionar sus vehículos' : ''}
        >
            {label}
        </button>
    );

    return (
        <div className="space-y-4">
            <div className="flex justify-between items-center">
                <div>
                    <Button variant="secondary" onClick={onBack} disabled={isLoading}>
                        <ArrowLeftIcon className="w-4 h-4 mr-2" />
                        Volver a la Búsqueda
                    </Button>
                </div>
                <div className="flex items-center gap-4 text-right">
                    {currentAsociado.id && permissions['asociados.delete'] && (
                        <Button variant="danger" onClick={() => setIsConfirmDeleteOpen(true)} disabled={isLoading || !currentAsociado.id}>
                            <TrashIcon className="w-4 h-4 mr-2" />
                            Eliminar
                        </Button>
                    )}
                    <div>
                        <h2 className="text-2xl font-bold text-gray-800 dark:text-white">
                            {currentAsociado.id ? `${currentAsociado.nombre}` : 'Nuevo Conductor'}
                        </h2>
                        <p className="text-sm text-gray-500 dark:text-gray-400">
                            Código: {currentAsociado.codigo || 'N/A'}
                        </p>
                    </div>
                </div>
            </div>

            <div className="border-b border-gray-200 dark:border-gray-700">
                <nav className="-mb-px flex space-x-2" aria-label="Tabs">
                    <TabButton tabId="datos" label="Datos del Conductor" />
                    <TabButton tabId="vehiculos" label="Vehículos y Certificados" disabled={!currentAsociado.id} />
                </nav>
            </div>
            
            <div className="mt-4">
                {activeTab === 'datos' && <DatosSocioTab asociado={currentAsociado} onSave={handleSaveAsociado} isLoading={isLoading} />}
                {activeTab === 'vehiculos' && <CertificadoVehiculoTab 
                    asociadoId={currentAsociado.id}
                    vehicles={props.vehicles}
                    onSaveVehicle={props.onSaveVehicle}
                    onDeleteVehicle={props.onDeleteVehicle}
                    certificados={props.certificados}
                    onSaveCertificado={props.onSaveCertificado}
                    onDeleteCertificado={props.onDeleteCertificado}
                />}
            </div>

            <ConfirmationModal
                isOpen={isConfirmDeleteOpen}
                title="Eliminar Conductor"
                message="¿Estás seguro de que deseas eliminar este conductor? Esta acción no se puede deshacer."
                onConfirm={handleDelete}
                onCancel={() => setIsConfirmDeleteOpen(false)}
            />
        </div>
    );
};

export default AsociadoDetailView;
