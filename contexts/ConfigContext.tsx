
import React, { createContext, useContext, ReactNode, useState, useEffect, useCallback, useRef } from 'react';
import { CompanyInfo, User, Role, Office, Category, ShippingType, PaymentMethod, Permissions, ExpenseCategory, CuentaContable } from '../types';
import { useToast } from '../components/ui/ToastProvider';
import { useSystem } from './SystemContext';
import { useAuth } from './AuthContext';
import { apiFetch } from '../utils/api';
import { PLAN_DE_CUENTAS_INICIAL } from '../data/contabilidad';

type ConfigContextType = {
    companyInfo: CompanyInfo;
    categories: Category[];
    users: User[];
    roles: Role[];
    offices: Office[];
    shippingTypes: ShippingType[];
    paymentMethods: PaymentMethod[];
    expenseCategories: ExpenseCategory[];
    cuentasContables: CuentaContable[];
    userPermissions: Permissions;
    isLoading: boolean;
    handleLogin: (username: string, password: string, rememberMe: boolean) => Promise<void>;
    handleLogout: () => Promise<void>;
    handleCompanyInfoSave: (info: CompanyInfo) => Promise<void>;
    handleSaveUser: (user: User) => Promise<void>;
    handleSaveProfile: (user: Partial<User>) => Promise<void>;
    onDeleteUser: (userId: string) => Promise<void>;
    handleSaveRole: (role: Role) => Promise<void>;
    onDeleteRole: (roleId: string) => Promise<void>;
    onUpdateRolePermissions: (roleId: string, permissions: Permissions) => Promise<void>;
    handleSaveCategory: (category: Category) => Promise<void>;
    onDeleteCategory: (categoryId: string) => Promise<void>;
    handleSaveOffice: (office: Office) => Promise<void>;
    onDeleteOffice: (officeId: string) => Promise<void>;
    handleSaveShippingType: (shippingType: ShippingType) => Promise<void>;
    onDeleteShippingType: (shippingTypeId: string) => Promise<void>;
    handleSavePaymentMethod: (paymentMethod: PaymentMethod) => Promise<void>;
    onDeletePaymentMethod: (paymentMethodId: string) => Promise<void>;
    handleSaveExpenseCategory: (category: ExpenseCategory) => Promise<void>;
    onDeleteExpenseCategory: (categoryId: string) => Promise<void>;
    handleSaveCuentaContable: (cuenta: CuentaContable) => Promise<void>;
    handleDeleteCuentaContable: (cuentaId: string) => Promise<void>;
};

const ConfigContext = createContext<ConfigContextType | undefined>(undefined);

const FALLBACK_COMPANY_INFO: CompanyInfo = {
    name: 'Sistema de Gestión',
    rif: 'J-000000000',
    address: 'Sin Conexión al Servidor',
    phone: '',
};

export const ConfigProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const { addToast } = useToast();
    const { logAction } = useSystem();
    // Fix: Added setIsAuthenticated from useAuth() to resolve the errors in handleLogin and handleLogout
    const { isAuthenticated, currentUser, setCurrentUser, setIsAuthenticated, refreshUser } = useAuth();
    const loadOnceRef = useRef<string | null>(null);

    const [companyInfo, setCompanyInfo] = useState<CompanyInfo>({ name: 'Cargando...', rif: '', address: '', phone: '' });
    const [categories, setCategories] = useState<Category[]>([]);
    const [users, setUsers] = useState<User[]>([]);
    const [roles, setRoles] = useState<Role[]>([]);
    const [offices, setOffices] = useState<Office[]>([]);
    const [shippingTypes, setShippingTypes] = useState<ShippingType[]>([]);
    const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([]);
    const [expenseCategories, setExpenseCategories] = useState<ExpenseCategory[]>([]);
    const [cuentasContables, setCuentasContables] = useState<CuentaContable[]>([]);
    const [userPermissions, setUserPermissions] = useState<Permissions>({});
    const [isLoading, setIsLoading] = useState(true);

    const fetchSafe = useCallback(async <T,>(endpoint: string, fallbackValue: T): Promise<T> => {
        try {
            return await apiFetch<T>(endpoint);
        } catch (error: any) {
            return fallbackValue;
        }
    }, []);

    // Sincronización Directa de Permisos desde el Usuario
    useEffect(() => {
        if (currentUser) {
            // El backend envía el objeto Role con permisos dentro del usuario
            const perms = (currentUser as any).Role?.permissions || currentUser.permissions || {};
            setUserPermissions(perms);
        } else {
            setUserPermissions({});
        }
    }, [currentUser?.id, (currentUser as any)?.Role?.updatedAt]);

    useEffect(() => {
        if (!isAuthenticated) {
            loadOnceRef.current = null;
            fetchSafe<CompanyInfo>('/company-info', FALLBACK_COMPANY_INFO).then(setCompanyInfo);
            setIsLoading(false);
            return;
        }

        if (loadOnceRef.current === currentUser?.id) return;

        const fetchConfigData = async () => {
            try {
                setIsLoading(true);
                loadOnceRef.current = currentUser?.id || 'authed';
                
                const isAdmin = ['role-admin', 'role-tech'].includes(currentUser?.roleId || '');
                const perms = (currentUser as any)?.Role?.permissions || currentUser?.permissions || {};

                // Carga de datos base
                const [infoData, officesData] = await Promise.all([
                    fetchSafe<CompanyInfo>('/company-info', FALLBACK_COMPANY_INFO),
                    fetchSafe<Office[]>('/offices', [])
                ]);
                setCompanyInfo(infoData);
                setOffices(officesData);

                const promises: Promise<any>[] = [];

                if (isAdmin || perms['categories.view']) promises.push(fetchSafe('/categories', []).then(setCategories));
                if (isAdmin || perms['shipping-types.view']) promises.push(fetchSafe('/shipping-types', []).then(setShippingTypes));
                if (isAdmin || perms['payment-methods.view']) promises.push(fetchSafe('/payment-methods', []).then(setPaymentMethods));
                if (isAdmin || perms['config.users.manage']) promises.push(fetchSafe('/users', []).then(setUsers));

                // Gestión de roles: Solo admin carga lista completa, otros obtienen /me
                if (isAdmin || perms['config.roles.manage'] || perms['config.roles.view']) {
                    promises.push(fetchSafe<Role[]>('/roles', []).then(setRoles));
                } else {
                    // Eliminamos el fetch a /api/roles/:id individual para evitar 403
                    if ((currentUser as any)?.Role) {
                        setRoles([(currentUser as any).Role]);
                    }
                }

                if (isAdmin || perms['plan-contable.view']) {
                    promises.push(fetchSafe('/cuentas-contables', PLAN_DE_CUENTAS_INICIAL).then(setCuentasContables));
                    promises.push(fetchSafe('/expense-categories', []).then(setExpenseCategories));
                }

                await Promise.all(promises);
            } finally {
                setIsLoading(false);
            }
        };

        fetchConfigData();
    }, [isAuthenticated, currentUser?.id, fetchSafe]);

    const handleLogin = async (username: string, password: string, rememberMe: boolean) => {
        const data = await apiFetch<{ accessToken: string, refreshToken: string, user: User }>('/auth/login', {
            method: 'POST',
            body: JSON.stringify({ username, password }),
        });
        if (data.accessToken) {
            localStorage.setItem('accessToken', data.accessToken);
            localStorage.setItem('refreshToken', data.refreshToken);
            loadOnceRef.current = null; // Reset para forzar carga fresca
            setCurrentUser(data.user);
            setIsAuthenticated(true);
            
            logAction(data.user, 'LOGIN', `Inicio de sesión: ${username}`);
        }
    };

    const handleLogout = async () => {
        if (currentUser) {
            logAction(currentUser, 'LOGOUT', `Cierre de sesión: ${currentUser.username}`);
        }
        localStorage.removeItem('accessToken');
        localStorage.removeItem('refreshToken');
        setIsAuthenticated(false);
        setCurrentUser(null);
        loadOnceRef.current = null;
        window.location.hash = '';
    };

    const handleCompanyInfoSave = async (info: CompanyInfo) => {
        const saved = await apiFetch<CompanyInfo>('/company-info', { method: 'PUT', body: JSON.stringify(info) });
        setCompanyInfo(saved);
        if (currentUser) {
            logAction(currentUser, 'UPDATE', 'Actualización de información de la empresa');
        }
        addToast({ type: 'success', title: 'Éxito', message: 'Configuración actualizada.' });
    };

    const onUpdateRolePermissions = async (roleId: string, permissions: Permissions) => {
        const updatedRole = await apiFetch<Role>(`/roles/${roleId}/permissions`, { 
            method: 'PUT', 
            body: JSON.stringify({ permissions }) 
        });
        setRoles(prev => prev.map(r => r.id === roleId ? updatedRole : r));
        if (currentUser?.roleId === roleId) {
            await refreshUser();
        }
        if (currentUser) {
            logAction(currentUser, 'UPDATE', `Actualización de permisos del rol: ${updatedRole.name}`, roleId);
        }
        addToast({ type: 'success', title: 'Permisos', message: 'Rol actualizado.' });
    };

    const handleAuxSave = async <T extends {id?: string}>(item: T, path: string, setter: any, entityName: string) => {
        const isUpdating = !!item.id;
        const saved = await apiFetch<T>(isUpdating ? `${path}/${item.id}` : path, { 
            method: isUpdating ? 'PUT' : 'POST', 
            body: JSON.stringify(item) 
        });
        setter((prev: T[]) => isUpdating ? prev.map(i => i.id === saved.id ? saved : i) : [...prev, saved]);
        
        if (currentUser) {
            logAction(
                currentUser, 
                isUpdating ? 'UPDATE' : 'CREATE', 
                `${isUpdating ? 'Actualización' : 'Creación'} de ${entityName}: ${JSON.stringify(saved)}`,
                saved.id
            );
        }
    };

    const handleAuxDelete = async (id: string, path: string, setter: any, entityName: string) => {
        await apiFetch(`${path}/${id}`, { method: 'DELETE' });
        setter((p: any[]) => p.filter(i => i.id !== id));
        if (currentUser) {
            logAction(currentUser, 'DELETE', `Eliminación de ${entityName}`, id);
        }
    };

    const handleSaveProfile = async (userData: Partial<User>) => {
        try {
            console.log('UserData requested to save:', userData);
            const apiResponse = await apiFetch<any>('/users/profile', {
                method: 'PUT',
                body: JSON.stringify(userData)
            });
            console.log('Backend response upUser:', apiResponse);
            
            // Assume the response might return { user: { ... } } or the raw user
            const upUser = apiResponse?.user || apiResponse;
            
            // Start with the current user, merge whatever the user just typed
            let updatedUser = { ...(currentUser || {}), ...userData };
            
            // If the backend actually returned a valid user object with an ID, merge it in
            if (upUser && typeof upUser === 'object' && upUser.id) {
                 updatedUser = { ...updatedUser, ...upUser };
            }

            setCurrentUser(updatedUser as User);
            setUsers(prev => prev.map(u => u.id === updatedUser.id ? (updatedUser as User) : u));
            addToast({ type: 'success', title: 'Éxito', message: 'Perfil actualizado correctamente' });
            if (currentUser) {
                logAction(updatedUser as User, 'UPDATE', 'Actualización de perfil propio', updatedUser.id);
            }
        } catch (error: any) {
            addToast({ type: 'error', title: 'Error', message: error.message || 'Error actualizando perfil' });
            throw error;
        }
    };

    return (
        <ConfigContext.Provider value={{
            companyInfo, categories, users, roles, offices, shippingTypes, paymentMethods, expenseCategories, cuentasContables,
            userPermissions, isLoading,
            handleLogin, handleLogout, handleCompanyInfoSave, onUpdateRolePermissions,
            handleSaveUser: (u) => handleAuxSave(u, '/users', setUsers, 'Usuario'),
            handleSaveProfile,
            onDeleteUser: (id) => handleAuxDelete(id, '/users', setUsers, 'Usuario'),
            handleSaveRole: (r) => handleAuxSave(r, '/roles', setRoles, 'Rol'),
            onDeleteRole: (id) => handleAuxDelete(id, '/roles', setRoles, 'Rol'),
            handleSaveCategory: (c) => handleAuxSave(c, '/categories', setCategories, 'Categoría'),
            onDeleteCategory: (id) => handleAuxDelete(id, '/categories', setCategories, 'Categoría'),
            handleSaveOffice: (o) => handleAuxSave(o, '/offices', setOffices, 'Sucursal'),
            onDeleteOffice: (id) => handleAuxDelete(id, '/offices', setOffices, 'Sucursal'),
            handleSaveShippingType: (s) => handleAuxSave(s, '/shipping-types', setShippingTypes, 'Tipo de Envío'),
            onDeleteShippingType: (id) => handleAuxDelete(id, '/shipping-types', setShippingTypes, 'Tipo de Envío'),
            handleSavePaymentMethod: (p) => handleAuxSave(p, '/payment-methods', setPaymentMethods, 'Método de Pago'),
            onDeletePaymentMethod: (id) => handleAuxDelete(id, '/payment-methods', setPaymentMethods, 'Método de Pago'),
            handleSaveExpenseCategory: (e) => handleAuxSave(e, '/expense-categories', setExpenseCategories, 'Categoría de Gasto'),
            onDeleteExpenseCategory: (id) => handleAuxDelete(id, '/expense-categories', setExpenseCategories, 'Categoría de Gasto'),
            handleSaveCuentaContable: (c) => handleAuxSave(c, '/cuentas-contables', setCuentasContables, 'Cuenta Contable'),
            handleDeleteCuentaContable: (id) => handleAuxDelete(id, '/cuentas-contables', setCuentasContables, 'Cuenta Contable')
        }}>
            {children}
        </ConfigContext.Provider>
    );
};

export const useConfig = () => {
    const context = useContext(ConfigContext);
    if (!context) throw new Error('useConfig must be used within a ConfigProvider');
    return context;
};
