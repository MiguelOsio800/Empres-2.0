
import React, { useState } from 'react';
import { User, Role, Permissions } from '../../types';
import Card, { CardHeader, CardTitle } from '../ui/Card';
import Button from '../ui/Button';
import { PlusIcon, EditIcon, TrashIcon, ShieldCheckIcon, EyeIcon } from '../icons/Icons';
import RolePermissionModal from '../configuracion/RolePermissionModal';
import RoleFormModal from '../configuracion/RoleFormModal';

interface RoleManagementProps {
    users: User[];
    roles: Role[];
    onSaveRole: (role: Role) => Promise<void>;
    onDeleteRole: (roleId: string) => Promise<void>;
    onUpdateRolePermissions: (roleId: string, permissions: Permissions) => Promise<void>;
    canManage?: boolean;
}

const RoleManagement: React.FC<RoleManagementProps> = ({ users, roles, onSaveRole, onDeleteRole, onUpdateRolePermissions, canManage = true }) => {
    const [isRoleModalOpen, setIsRoleModalOpen] = useState(false);
    const [editingRole, setEditingRole] = useState<Role | null>(null);
    
    const [isRoleFormModalOpen, setIsRoleFormModalOpen] = useState(false);
    const [editingRoleEntity, setEditingRoleEntity] = useState<Role | null>(null);

    const handleOpenRoleFormModal = (role: Role | null) => {
        setEditingRoleEntity(role);
        setIsRoleFormModalOpen(true);
    };
    
    const handleSaveRoleEntity = async (role: Role) => {
        await onSaveRole(role);
        setIsRoleFormModalOpen(false);
    };

    const handleOpenRolePermissionModal = (role: Role) => {
        setEditingRole(role);
        setIsRoleModalOpen(true);
    };

    const handleSaveRolePermissions = async (roleId: string, permissions: Permissions) => {
        await onUpdateRolePermissions(roleId, permissions);
        setIsRoleModalOpen(false);
    };
    
    const isRoleInUse = (roleId: string) => users.some(u => u.roleId === roleId);
    // Roles que el backend protege explícitamente
    const isProtectedRole = (roleId: string) => ['role-admin', 'role-op', 'role-tech'].includes(roleId);

    return (
        <>
            <Card>
                <CardHeader>
                    <div className="flex justify-between items-center">
                        <div className="flex items-center">
                            <ShieldCheckIcon className="w-6 h-6 mr-3 text-primary-500" />
                            <CardTitle>Roles y Permisos del Sistema</CardTitle>
                        </div>
                        {canManage && (
                            <Button onClick={() => handleOpenRoleFormModal(null)}>
                                <PlusIcon className="w-4 h-4 mr-2" /> Nuevo Rol
                            </Button>
                        )}
                    </div>
                </CardHeader>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {roles.map(role => (
                        <div key={role.id} className="p-3 rounded-lg border dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50 flex justify-between items-center gap-2 hover:border-primary-400 transition-colors">
                            <div className="flex flex-col">
                                <span className="font-bold text-sm text-gray-800 dark:text-gray-200 truncate">{role.name}</span>
                                <span className="text-[10px] text-gray-500 uppercase tracking-wider">{Object.keys(role.permissions || {}).length} permisos asignados</span>
                            </div>
                            <div className="flex items-center gap-1 shrink-0">
                                <Button 
                                    size="sm" 
                                    variant="secondary" 
                                    onClick={() => handleOpenRolePermissionModal(role)} 
                                    title={canManage ? "Gestionar Permisos" : "Ver Permisos"}
                                >
                                    {canManage ? <ShieldCheckIcon className="w-4 h-4" /> : <EyeIcon className="w-4 h-4" />}
                                </Button>
                                {canManage && (
                                    <>
                                        <Button size="sm" variant="secondary" onClick={() => handleOpenRoleFormModal(role)} title="Editar Nombre">
                                            <EditIcon className="w-4 h-4" />
                                        </Button>
                                        <Button 
                                            size="sm" 
                                            variant="danger" 
                                            onClick={async (e) => {
                                                e.stopPropagation();
                                                await onDeleteRole(role.id);
                                            }} 
                                            disabled={isRoleInUse(role.id) || isProtectedRole(role.id)} 
                                            title={isRoleInUse(role.id) ? 'Rol en uso' : isProtectedRole(role.id) ? 'Rol protegido' : 'Eliminar'}
                                        >
                                            <TrashIcon className="w-4 h-4" />
                                        </Button>
                                    </>
                                )}
                            </div>
                        </div>
                    ))}
                </div>
            </Card>

            {isRoleFormModalOpen && (
                <RoleFormModal
                    isOpen={isRoleFormModalOpen}
                    onClose={() => setIsRoleFormModalOpen(false)}
                    onSave={handleSaveRoleEntity}
                    role={editingRoleEntity}
                />
            )}

            {editingRole && (
                 <RolePermissionModal
                    isOpen={isRoleModalOpen}
                    onClose={() => setIsRoleModalOpen(false)}
                    onSave={handleSaveRolePermissions}
                    role={editingRole}
                />
            )}
        </>
    );
};

export default RoleManagement;
