
import React, { useState } from 'react';
import { Page, CompanyInfo, User, Permissions, Role, Office, Asociado } from '../../types';
import { NAV_ITEMS } from '../../constants';
import { MenuIcon, UserIcon, LogOutIcon, SettingsIcon, EditIcon } from '../icons/Icons';
import CurrencyDisplay from '../ui/CurrencyDisplay';
import ThemeToggle from './ThemeToggle';
import UserFormModal from '../configuracion/UserFormModal';

interface HeaderProps {
    currentPage: Page;
    onToggleSidebar: () => void;
    companyInfo: CompanyInfo;
    onUpdateCompanyInfo: (info: CompanyInfo) => Promise<void>;
    currentUser: User;
    onLogout: () => void;
    permissions: Permissions;
    // Props needed for Profile Edit
    roles: Role[];
    offices: Office[];
    asociados: Asociado[];
    onSaveUser: (user: User) => Promise<void>;
}

const Header: React.FC<HeaderProps> = ({ 
    currentPage, onToggleSidebar, companyInfo, onUpdateCompanyInfo, currentUser, onLogout, permissions,
    roles, offices, asociados, onSaveUser
}) => {
    
    const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);

    const getPageTitle = () => {
        if (currentPage === 'edit-invoice') return 'Editar Factura';
        if (currentPage === 'report-detail') return 'Detalle de Reporte';
        const navItem = NAV_ITEMS.find(item => item.id === currentPage);
        if (navItem) return navItem.label;
        if (currentPage === 'configuracion') return 'Configuración';
        return 'Inicio';
    }
    const pageTitle = getPageTitle();

    const handleNavClick = (page: Page) => {
        window.location.hash = page;
    };

    const handleSaveProfile = async (user: User) => {
        await onSaveUser(user);
        setIsProfileModalOpen(false);
    };

    return (
        <header className="flex items-center justify-between h-20 px-4 sm:px-6 bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700 shrink-0">
            <div className="flex items-center">
                {/* Hamburger Menu Button */}
                <button 
                    onClick={onToggleSidebar} 
                    className="lg:hidden mr-3 text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white"
                    aria-label="Open sidebar"
                >
                    <MenuIcon className="h-6 w-6" />
                </button>
                <h1 className="text-xl sm:text-2xl font-semibold text-gray-800 dark:text-white truncate">{pageTitle}</h1>
            </div>
            <div className="flex items-center space-x-2 sm:space-x-4">
                 <CurrencyDisplay bcvRate={companyInfo.bcvRate} />
                 
                 {/* Profile Button - Protected by Permission */}
                 {permissions['config.profile.edit'] && (
                     <button 
                        onClick={() => setIsProfileModalOpen(true)}
                        className="hidden sm:flex items-center space-x-2 bg-gray-100 dark:bg-gray-800 px-3 py-1.5 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors focus:outline-none focus:ring-2 focus:ring-primary-500"
                        title="Editar mi perfil"
                     >
                        <UserIcon className="h-5 w-5 text-gray-500 dark:text-gray-400" />
                        <span className="text-sm font-medium text-gray-700 dark:text-gray-300 truncate max-w-[150px]">
                            {currentUser.name}
                        </span>
                        <EditIcon className="h-3 w-3 text-gray-400" />
                    </button>
                 )}
                 {!permissions['config.profile.edit'] && (
                     <div className="hidden sm:flex items-center space-x-2 bg-gray-50 dark:bg-gray-800/50 px-3 py-1.5 rounded-lg">
                        <UserIcon className="h-5 w-5 text-gray-400" />
                        <span className="text-sm font-medium text-gray-500 dark:text-gray-400 truncate max-w-[150px]">
                            {currentUser.name}
                        </span>
                     </div>
                 )}

                 <ThemeToggle />
                 
                 {permissions['configuracion.view'] && (
                     <a
                        href="#configuracion"
                        onClick={(e) => {
                            e.preventDefault();
                            handleNavClick('configuracion');
                        }}
                        className="p-2 rounded-full text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700/50 focus:outline-none focus:ring-2 focus:ring-offset-2 dark:focus:ring-offset-gray-900 focus:ring-white transition-colors"
                        aria-label="Configuración"
                        title="Configuración del Sistema"
                    >
                        <SettingsIcon className="w-5 h-5" />
                    </a>
                 )}
                 <button
                    onClick={onLogout}
                    className="p-2 rounded-full text-gray-500 dark:text-gray-400 hover:bg-red-100 dark:hover:bg-red-500/20 hover:text-red-600 dark:hover:text-red-400 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-900 focus:ring-white transition-colors"
                    aria-label="Cerrar Sesión"
                    title="Cerrar Sesión"
                >
                    <LogOutIcon className="w-5 h-5" />
                </button>
            </div>

            {/* Profile Modal */}
            <UserFormModal
                isOpen={isProfileModalOpen}
                onClose={() => setIsProfileModalOpen(false)}
                onSave={handleSaveProfile}
                user={currentUser}
                roles={roles} // Passed but hidden in Profile Mode
                offices={offices} // Passed but hidden in Profile Mode
                asociados={asociados} // Passed but hidden in Profile Mode
                currentUser={currentUser}
                isProfileMode={true} // Enables simplified view
                companyInfo={companyInfo}
                onUpdateCompanyInfo={onUpdateCompanyInfo}
                permissions={permissions}
            />
        </header>
    );
};

export default Header;
