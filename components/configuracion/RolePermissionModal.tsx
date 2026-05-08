
import React, { useState, useEffect } from 'react';
import { Role, Permissions } from '../../types';
import Modal from '../ui/Modal';
import Button from '../ui/Button';
import { ALL_PERMISSION_KEYS, PERMISSION_KEY_TRANSLATIONS } from '../../constants';
import Input from '../ui/Input';
// FIX: Added missing ChevronDownIcon and ChevronUpIcon imports
import { SearchIcon, ChevronRightIcon, ChevronLeftIcon, SaveIcon, ChevronDownIcon, ChevronUpIcon } from '../icons/Icons';
import { useAuth } from '../../contexts/AuthContext';

const formatPermissionKey = (key: string): string => {
    return PERMISSION_KEY_TRANSLATIONS[key] || key;
};

interface PermissionListProps {
    title: string;
    permissions: string[];
    selectedPermissions: string[];
    onSelect: (key: string) => void;
    searchTerm?: string;
    onSearch?: (term: string) => void;
}

const PermissionListBox: React.FC<PermissionListProps> = ({ title, permissions, selectedPermissions, onSelect, searchTerm, onSearch }) => (
    <div className="flex flex-col border dark:border-gray-600 rounded-lg w-full h-96 bg-white dark:bg-gray-900">
        <div className="p-3 border-b dark:border-gray-600 bg-gray-50 dark:bg-gray-800/50 flex justify-between items-center">
            <h3 className="text-sm font-bold uppercase tracking-wider text-gray-700 dark:text-gray-300">{title}</h3>
            <span className="text-xs bg-gray-200 dark:bg-gray-700 px-2 py-0.5 rounded-full">{permissions.length}</span>
        </div>
        {onSearch && (
            <div className="p-2 border-b dark:border-gray-600">
                <Input
                    label=""
                    id={`search-${title.replace(/\s+/g, '-')}`}
                    placeholder="Filtrar..."
                    value={searchTerm}
                    onChange={(e) => onSearch(e.target.value)}
                    icon={<SearchIcon className="w-4 h-4 text-gray-400" />}
                />
            </div>
        )}
        <ul className="overflow-y-auto flex-1 p-1">
            {permissions.length > 0 ? permissions.map(key => (
                <li key={key} className="mb-1">
                    <button
                        type="button"
                        onClick={() => onSelect(key)}
                        className={`w-full text-left text-xs p-2 rounded transition-colors border ${
                            selectedPermissions.includes(key) 
                                ? 'bg-primary-500 text-white border-primary-600 shadow-sm' 
                                : 'bg-transparent border-transparent hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-700 dark:text-gray-300'
                        }`}
                    >
                        {formatPermissionKey(key)}
                        <p className="text-[9px] opacity-60 font-mono mt-0.5">{key}</p>
                    </button>
                </li>
            )) : <li className="p-8 text-center text-xs text-gray-400 italic">No hay permisos en esta lista</li>}
        </ul>
    </div>
);

const RolePermissionModal: React.FC<{
    isOpen: boolean;
    onClose: () => void;
    onSave: (roleId: string, permissions: Permissions) => Promise<void>;
    role: Role;
}> = ({ isOpen, onClose, onSave, role }) => {
    const { refreshUser, currentUser } = useAuth();
    const [chosen, setChosen] = useState<string[]>([]);
    const [available, setAvailable] = useState<string[]>([]);
    
    const [selectedAvailable, setSelectedAvailable] = useState<string[]>([]);
    const [selectedChosen, setSelectedChosen] = useState<string[]>([]);
    
    const [searchTerm, setSearchTerm] = useState('');
    const [isSaving, setIsSaving] = useState(false);

    useEffect(() => {
        if (isOpen && role) {
            // El backend guarda permisos como { "key": true }. Extraemos las llaves que son true.
            const chosenPermissions = Object.keys(role.permissions || {}).filter(key => role.permissions[key] === true);
            const availablePermissions = ALL_PERMISSION_KEYS.filter(key => !chosenPermissions.includes(key));
            
            setChosen(chosenPermissions.sort());
            setAvailable(availablePermissions.sort());
            setSelectedAvailable([]);
            setSelectedChosen([]);
            setSearchTerm('');
        }
    }, [role, isOpen]);

    const handleSelect = (list: 'available' | 'chosen', key: string) => {
        const selectedList = list === 'available' ? selectedAvailable : selectedChosen;
        const setSelected = list === 'available' ? setSelectedAvailable : setSelectedChosen;
        
        if (selectedList.includes(key)) {
            setSelected(selectedList.filter(k => k !== key));
        } else {
            setSelected([...selectedList, key]);
        }
    };
    
    const moveSelected = (from: 'available' | 'chosen') => {
        if (from === 'available') {
            const nextChosen = [...chosen, ...selectedAvailable].sort();
            setChosen(nextChosen);
            setAvailable(available.filter(k => !selectedAvailable.includes(k)));
            setSelectedAvailable([]);
        } else {
            const nextAvailable = [...available, ...selectedChosen].sort();
            setAvailable(nextAvailable);
            setChosen(chosen.filter(k => !selectedChosen.includes(k)));
            setSelectedChosen([]);
        }
    };

    const filteredAvailable = available.filter(key => 
        formatPermissionKey(key).toLowerCase().includes(searchTerm.toLowerCase()) ||
        key.toLowerCase().includes(searchTerm.toLowerCase())
    );
    
    const moveAllFiltered = () => {
        setChosen([...chosen, ...filteredAvailable].sort());
        setAvailable(available.filter(k => !filteredAvailable.includes(k)));
        setSelectedAvailable([]);
    }

    const removeAll = () => {
        setAvailable([...available, ...chosen].sort());
        setChosen([]);
        setSelectedChosen([]);
    }

    const handleSubmit = async () => {
        setIsSaving(true);
        try {
            // Construimos el objeto JSON: { "permiso.key": true }
            const permissionsObject: Permissions = chosen.reduce((acc, key) => {
                acc[key] = true;
                return acc;
            }, {} as Permissions);
            
            await onSave(role.id, permissionsObject);

            // Refrescar permisos si editamos nuestro propio rol
            if (currentUser && currentUser.roleId === role.id) {
                await refreshUser();
            }
            onClose();
        } catch (error) {
            console.error("Error al guardar permisos:", error);
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} title={`Gestionar Permisos: ${role.name}`} size="5xl">
            <div className="flex flex-col md:flex-row items-stretch gap-4">
                <PermissionListBox
                    title="Disponibles"
                    permissions={filteredAvailable}
                    selectedPermissions={selectedAvailable}
                    onSelect={(key) => handleSelect('available', key)}
                    searchTerm={searchTerm}
                    onSearch={setSearchTerm}
                />
                
                <div className="flex flex-row md:flex-col items-center justify-center gap-2 py-2">
                    <button type="button" onClick={moveAllFiltered} className="p-2 bg-gray-200 dark:bg-gray-700 rounded hover:bg-primary-100" title="Añadir todos los filtrados">
                        <span className="hidden md:inline">≫</span>
                        <span className="md:hidden">︾</span>
                    </button>
                    <button type="button" onClick={() => moveSelected('available')} disabled={selectedAvailable.length === 0} className="p-2 bg-gray-200 dark:bg-gray-700 rounded hover:bg-primary-500 hover:text-white disabled:opacity-30">
                        <span className="hidden md:inline"><ChevronRightIcon className="w-5 h-5"/></span>
                        <span className="md:hidden"><ChevronDownIcon className="w-5 h-5"/></span>
                    </button>
                    <button type="button" onClick={() => moveSelected('chosen')} disabled={selectedChosen.length === 0} className="p-2 bg-gray-200 dark:bg-gray-700 rounded hover:bg-red-500 hover:text-white disabled:opacity-30">
                        <span className="hidden md:inline"><ChevronLeftIcon className="w-5 h-5"/></span>
                        <span className="md:hidden"><ChevronUpIcon className="w-5 h-5"/></span>
                    </button>
                    <button type="button" onClick={removeAll} className="p-2 bg-gray-200 dark:bg-gray-700 rounded hover:bg-red-100" title="Quitar todos">
                        <span className="hidden md:inline">≪</span>
                        <span className="md:hidden">︽</span>
                    </button>
                </div>
                
                <PermissionListBox
                    title="Asignados al Rol"
                    permissions={chosen}
                    selectedPermissions={selectedChosen}
                    onSelect={(key) => handleSelect('chosen', key)}
                />
            </div>
            
            <div className="flex justify-between items-center pt-6 mt-4 border-t dark:border-gray-700">
                <p className="text-xs text-gray-500 max-w-md">
                    <strong>Tip:</strong> Los cambios afectarán a todos los usuarios con este rol inmediatamente después de que recarguen su sesión o tras un breve periodo.
                </p>
                <div className="flex gap-3">
                    <Button variant="secondary" onClick={onClose} disabled={isSaving}>Cancelar</Button>
                    <Button onClick={handleSubmit} disabled={isSaving}>
                        <SaveIcon className="w-4 h-4 mr-2" />
                        {isSaving ? 'Guardando...' : 'Aplicar Cambios'}
                    </Button>
                </div>
            </div>
        </Modal>
    );
};

export default RolePermissionModal;
