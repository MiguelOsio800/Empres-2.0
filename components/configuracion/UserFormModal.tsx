import React, { useState, useEffect, useMemo } from 'react';
import { User, Role, Office, Asociado, CompanyInfo, Permissions } from '../../types';
import Modal from '../ui/Modal';
import Input from '../ui/Input';
import Button from '../ui/Button';
import Select from '../ui/Select';
import { EyeIcon, EyeOffIcon, BuildingOfficeIcon, TagIcon } from '../icons/Icons';

interface UserFormModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSave: (user: User) => void;
    user: User | null;
    roles: Role[];
    offices: Office[];
    currentUser: User;
    asociados: Asociado[];
    isProfileMode?: boolean; // New prop to indicate self-edit mode
    companyInfo?: CompanyInfo;
    onUpdateCompanyInfo?: (info: CompanyInfo) => Promise<void>;
    permissions?: Permissions;
}

const UserFormModal: React.FC<UserFormModalProps> = ({ 
    isOpen, onClose, onSave, user, roles, offices, currentUser, asociados, isProfileMode = false,
    companyInfo, onUpdateCompanyInfo, permissions
}) => {
    const [formData, setFormData] = useState<Partial<User>>({});
    const [bcvRate, setBcvRate] = useState<number>(companyInfo?.bcvRate || 0);
    const [showPassword, setShowPassword] = useState(false);
    const [errors, setErrors] = useState<Record<string, string>>({});

    const availableRoles = useMemo(() => {
        const techRole = roles.find(r => r.name === 'Soporte Técnico');
        if (currentUser.username === 'admin' && techRole) {
            return roles.filter(r => r.id !== techRole.id);
        }
        return roles;
    }, [roles, currentUser]);

    const assignedOffice = useMemo(() => {
        return offices.find(o => o.id === formData.officeId);
    }, [offices, formData.officeId]);

    const assignedAsociado = useMemo(() => {
        return asociados.find(a => a.id === formData.asociadoId);
    }, [asociados, formData.asociadoId]);


    useEffect(() => {
        if (isOpen) {
            setFormData(user || { name: '', username: '', password: '', email: '', roleId: availableRoles[0]?.id, officeId: '', asociadoId: '' });
            setBcvRate(companyInfo?.bcvRate || 0);
            setShowPassword(false);
            setErrors({});
        }
    }, [user, isOpen, availableRoles, companyInfo]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const validate = () => {
        const newErrors: Record<string, string> = {};
        if (!formData.name?.trim()) newErrors.name = 'El nombre completo es requerido.';
        if (!formData.username?.trim()) newErrors.username = 'El nombre de usuario es requerido.';
        if (!user && !formData.password?.trim()) { // Password is required only for new users
            newErrors.password = 'La contraseña es requerida para nuevos usuarios.';
        }
        if (formData.email && !/^\S+@\S+\.\S+$/.test(formData.email)) {
            newErrors.email = 'El formato del correo electrónico es inválido.';
        }
        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (validate()) {
            if (isProfileMode && companyInfo && onUpdateCompanyInfo && permissions?.['config.profile.edit-rate']) {
                await onUpdateCompanyInfo({ ...companyInfo, bcvRate });
            }
            onSave(formData as User);
        }
    };

    const modalTitle = isProfileMode ? 'Mi Perfil de Usuario' : (user ? 'Editar Usuario' : 'Nuevo Usuario');

    return (
        <Modal isOpen={isOpen} onClose={onClose} title={modalTitle}>
            <form onSubmit={handleSubmit} className="space-y-4">
                {/* Information block for Profile Mode */}
                {isProfileMode && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-4 bg-primary-50 dark:bg-primary-900/20 border border-primary-100 dark:border-primary-800 rounded-xl mb-6">
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-white dark:bg-gray-800 rounded-lg shadow-sm text-primary-600">
                                <BuildingOfficeIcon className="w-5 h-5" />
                            </div>
                            <div>
                                <p className="text-[10px] uppercase font-bold text-primary-700 dark:text-primary-400 tracking-wider">Oficina Asignada</p>
                                <p className="text-sm font-semibold text-gray-800 dark:text-gray-100">{assignedOffice ? assignedOffice.name : 'Acceso Global'}</p>
                            </div>
                        </div>
                        {assignedAsociado && (
                            <div className="flex items-center gap-3">
                                <div className="p-2 bg-white dark:bg-gray-800 rounded-lg shadow-sm text-primary-600">
                                    <TagIcon className="w-5 h-5" />
                                </div>
                                <div>
                                    <p className="text-[10px] uppercase font-bold text-primary-700 dark:text-primary-400 tracking-wider">Código Asociado</p>
                                    <p className="text-sm font-semibold text-gray-800 dark:text-gray-100">{assignedAsociado.codigo} - {assignedAsociado.nombre}</p>
                                </div>
                            </div>
                        )}
                    </div>
                )}

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <Input name="name" label="Nombre Completo" value={formData.name || ''} onChange={handleChange} required error={errors.name} />
                    <Input name="username" label="Usuario de Acceso" value={formData.username || ''} onChange={handleChange} required autoComplete="username" error={errors.username} disabled={isProfileMode} />
                </div>
                
                <Input name="email" label="Correo Electrónico" type="email" value={formData.email || ''} onChange={handleChange} error={errors.email} />
                
                {isProfileMode && permissions?.['config.profile.edit-rate'] && (
                    <Input 
                        name="bcvRate" 
                        label="Tasa Dólar BCV (Bs.)" 
                        type="number" 
                        step="0.01"
                        value={bcvRate} 
                        onChange={(e) => setBcvRate(Number(e.target.value))} 
                    />
                )}
                
                <div className="border-t dark:border-gray-700 pt-4 mt-4">
                    <label htmlFor="password" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        {isProfileMode ? 'Cambiar Contraseña' : 'Contraseña'}
                    </label>
                    <div className="relative">
                        <input
                            id="password"
                            name="password"
                            type={showPassword ? 'text' : 'password'}
                            autoComplete="new-password"
                            value={formData.password || ''}
                            onChange={handleChange}
                            required={!user}
                            placeholder={user ? 'Dejar en blanco para no cambiar' : ''}
                            className={`block w-full rounded-md border shadow-sm focus:ring-1 sm:text-sm bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-gray-200 placeholder-gray-400 dark:placeholder-gray-500 pr-10 ${errors.password ? 'border-red-500 focus:border-red-500 focus:ring-red-500' : 'border-gray-300 dark:border-gray-600 focus:border-primary-500 focus:ring-primary-500'}`}
                        />
                        <button
                            type="button"
                            onClick={() => setShowPassword(!showPassword)}
                            className="absolute inset-y-0 right-0 flex items-center pr-3 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
                            aria-label={showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                        >
                            {showPassword ? <EyeOffIcon className="h-5 w-5" /> : <EyeIcon className="h-5 w-5" />}
                        </button>
                    </div>
                    {errors.password && <p className="mt-1 text-xs text-red-600 dark:text-red-400">{errors.password}</p>}
                    {isProfileMode && <p className="text-[10px] text-gray-500 mt-1">Solo complete este campo si desea actualizar su contraseña actual.</p>}
                </div>

                {/* Hide Sensitive Fields in Profile Mode */}
                {!isProfileMode && (
                    <>
                        <Select name="roleId" label="Rol" value={formData.roleId || ''} onChange={handleChange} required>
                            {availableRoles.map(role => (
                                <option key={role.id} value={role.id}>{role.name}</option>
                            ))}
                        </Select>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <Select name="officeId" label="Oficina Asignada (Opcional)" value={formData.officeId || ''} onChange={handleChange}>
                                <option value="">Ninguna (Acceso Global)</option>
                                {offices.map(office => (
                                    <option key={office.id} value={office.id}>{office.name}</option>
                                ))}
                            </Select>
                            <Select name="asociadoId" label="Enlazar con Asociado" value={formData.asociadoId || ''} onChange={handleChange}>
                                <option value="">Ninguno (Usuario Interno)</option>
                                {asociados.map(asoc => (
                                    <option key={asoc.id} value={asoc.id}>{asoc.nombre}</option>
                                ))}
                            </Select>
                        </div>
                    </>
                )}
                
                <div className="flex justify-end space-x-2 pt-4 mt-6 border-t dark:border-gray-700">
                    <Button variant="secondary" type="button" onClick={onClose}>Cancelar</Button>
                    <Button type="submit">
                        {isProfileMode ? 'Actualizar Mi Información' : 'Guardar Usuario'}
                    </Button>
                </div>
            </form>
        </Modal>
    );
};

export default UserFormModal;