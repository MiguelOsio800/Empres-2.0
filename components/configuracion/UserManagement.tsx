
import React, { useState, useMemo } from 'react';
import { User, Role, Office, Permissions, Asociado } from '../../types';
import Card, { CardHeader, CardTitle } from '../ui/Card';
import Button from '../ui/Button';
import { PlusIcon, EditIcon, TrashIcon, UsersIcon, SearchIcon, BuildingOfficeIcon } from '../icons/Icons';
import UserFormModal from './UserFormModal';
import usePagination from '../../hooks/usePagination';
import PaginationControls from '../ui/PaginationControls';
import Input from '../ui/Input';

interface UserManagementProps {
    users: User[];
    roles: Role[];
    offices: Office[];
    onSaveUser: (user: User) => Promise<void>;
    onDeleteUser: (userId: string) => Promise<void>;
    currentUser: User;
    userPermissions: Permissions;
    asociados: Asociado[];
}

const ITEMS_PER_PAGE = 8; // Ajustado para el nuevo diseño de grid

const UserManagement: React.FC<UserManagementProps> = ({ users, roles, offices, onSaveUser, onDeleteUser, currentUser, userPermissions, asociados }) => {
    const [isUserModalOpen, setIsUserModalOpen] = useState(false);
    const [editingUser, setEditingUser] = useState<User | null>(null);
    const [searchTerm, setSearchTerm] = useState('');

    const filteredUsers = useMemo(() => {
        if (!searchTerm) return users;
        const lowercasedTerm = searchTerm.toLowerCase();
        return users.filter(user =>
            user.name.toLowerCase().includes(lowercasedTerm) ||
            user.username.toLowerCase().includes(lowercasedTerm)
        );
    }, [users, searchTerm]);

    const {
        paginatedData,
        currentPage,
        totalPages,
        setCurrentPage,
        totalItems,
    } = usePagination(filteredUsers, ITEMS_PER_PAGE);

    const handleOpenUserModal = (user: User | null) => {
        setEditingUser(user);
        setIsUserModalOpen(true);
    };

    const handleSaveUser = async (user: User) => {
        await onSaveUser(user);
        setIsUserModalOpen(false);
    };

    const getOfficeName = (officeId?: string) => offices.find(o => o.id === officeId)?.name || 'Acceso Global';

    const canEditUser = (target: User): boolean => {
        const targetUsername = target.username;
        if (['tecnologia', 'cooperativa'].includes(targetUsername) && !userPermissions['config.users.edit_protected']) {
            return false;
        }
        const techRoleId = roles.find(r => r.name === 'Soporte Técnico')?.id;
        if (target.roleId === techRoleId && !userPermissions['config.users.manage_tech_users']) {
            return false;
        }
        return true;
    };
    
    const canDeleteUser = (target: User): boolean => {
        if (['tecnologia', 'cooperativa'].includes(target.username)) return false;
        if (currentUser.id === target.id) return false;
        const techRoleId = roles.find(r => r.name === 'Soporte Técnico')?.id;
        if (target.roleId === techRoleId && !userPermissions['config.users.manage_tech_users']) {
            return false;
        }
        return true;
    };

    return (
        <div className="space-y-6">
            <Card>
                <CardHeader>
                    <div className="flex flex-wrap justify-between items-center gap-4">
                        <div className="flex items-center">
                            <UsersIcon className="w-6 h-6 mr-3 text-primary-500" />
                            <CardTitle>Lista de Usuarios</CardTitle>
                        </div>
                         <div className="w-full sm:w-auto max-w-xs">
                             <Input 
                                label=""
                                id="search-users" 
                                placeholder="Buscar usuarios..." 
                                value={searchTerm} 
                                onChange={e => setSearchTerm(e.target.value)} 
                                icon={<SearchIcon className="w-4 h-4 text-gray-400"/>} 
                            />
                        </div>
                         <Button onClick={() => handleOpenUserModal(null)}>
                                <PlusIcon className="w-4 h-4 mr-2" /> Nuevo Usuario
                        </Button>
                    </div>
                </CardHeader>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {paginatedData.map(user => {
                        const isEditable = canEditUser(user);
                        const isDeletable = canDeleteUser(user);
                        return (
                            <div key={user.id} className="p-3 rounded-lg border dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50 flex justify-between items-center gap-2 hover:border-primary-400 transition-colors">
                                <div className="flex items-center gap-3 overflow-hidden">
                                    <div className="bg-primary-100 dark:bg-primary-900/30 p-2 rounded-full shrink-0">
                                        <UsersIcon className="w-5 h-5 text-primary-600 dark:text-primary-400" />
                                    </div>
                                    <div className="flex flex-col overflow-hidden">
                                        <span className="font-bold text-sm text-gray-800 dark:text-gray-200 truncate">{user.name}</span>
                                        <div className="flex items-center text-[10px] text-gray-500 uppercase tracking-wider truncate">
                                            <BuildingOfficeIcon className="w-3 h-3 mr-1" />
                                            {getOfficeName(user.officeId)}
                                        </div>
                                    </div>
                                </div>
                                <div className="flex items-center gap-1 shrink-0">
                                    <Button 
                                        variant="secondary" 
                                        size="sm" 
                                        onClick={() => handleOpenUserModal(user)} 
                                        disabled={!isEditable}
                                        title="Editar Usuario"
                                        className="!p-2"
                                    >
                                        <EditIcon className="w-4 h-4" />
                                    </Button>
                                    <Button 
                                        variant="danger" 
                                        size="sm" 
                                        onClick={async (e) => {
                                            e.stopPropagation();
                                            await onDeleteUser(user.id);
                                        }} 
                                        disabled={!isDeletable}
                                        title="Eliminar Usuario"
                                        className="!p-2"
                                    >
                                        <TrashIcon className="w-4 h-4" />
                                    </Button>
                                </div>
                            </div>
                        );
                    })}
                </div>

                {paginatedData.length === 0 && (
                    <p className="text-center py-10 text-gray-500 dark:text-gray-400">No se encontraron usuarios.</p>
                )}

                <PaginationControls
                    currentPage={currentPage}
                    totalPages={totalPages}
                    onPageChange={setCurrentPage}
                    totalItems={totalItems}
                    itemsPerPage={ITEMS_PER_PAGE}
                />
            </Card>

            <UserFormModal
                isOpen={isUserModalOpen}
                onClose={() => setIsUserModalOpen(false)}
                onSave={handleSaveUser}
                user={editingUser}
                roles={roles}
                offices={offices}
                currentUser={currentUser}
                asociados={asociados}
            />
        </div>
    );
};

export default UserManagement;
