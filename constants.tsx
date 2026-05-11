
import React, {ElementType} from 'react';
import { Page, Report } from './types';
import { HomeIcon, FilePlusIcon, TruckIcon, BarChartIcon, SettingsIcon, ReceiptIcon, TagIcon, UsersIcon, BuildingOfficeIcon, ListBulletIcon, CreditCardIcon, BookOpenIcon, ArchiveBoxIcon, ShieldCheckIcon, WrenchScrewdriverIcon, BriefcaseIcon, ClipboardDocumentListIcon } from './components/icons/Icons';

interface NavItem {
    id: Page;
    label: string;
    icon: ElementType;
    permissionKey: string; 
    description?: string;
    colorVariant?: 'blue' | 'green' | 'purple' | 'orange';
}

// 1. Menú Lateral (Sidebar)
export const NAV_ITEMS: NavItem[] = [
    { id: 'dashboard', label: 'Inicio', icon: HomeIcon, permissionKey: 'dashboard.view' },
    { id: 'shipping-guide', label: 'Crear Factura', icon: FilePlusIcon, permissionKey: 'shipping-guide.view' },
    { id: 'invoices', label: 'Facturas', icon: ReceiptIcon, permissionKey: 'invoices.view' },
    { id: 'flota', label: 'Flota', icon: TruckIcon, permissionKey: 'flota.view' },
    { id: 'remesas', label: 'Remesas', icon: ClipboardDocumentListIcon, permissionKey: 'remesas.view' },
    { id: 'asociados', label: 'Conductores', icon: UsersIcon, permissionKey: 'asociados.view' },
    { id: 'clientes', label: 'Clientes', icon: UsersIcon, permissionKey: 'clientes.view' },
    { id: 'proveedores', label: 'Proveedores', icon: BriefcaseIcon, permissionKey: 'proveedores.view' },
    { id: 'gastos', label: 'Gastos', icon: CreditCardIcon, permissionKey: 'libro-contable.create' },
    { id: 'libro-contable', label: 'Libro Contable', icon: BookOpenIcon, permissionKey: 'libro-contable.view' },
    { id: 'inventario', label: 'Inventario', icon: ArchiveBoxIcon, permissionKey: 'inventario.view' },
    { id: 'reports', label: 'Reportes', icon: BarChartIcon, permissionKey: 'reports.view' },
    { id: 'auditoria', label: 'Auditoría', icon: ShieldCheckIcon, permissionKey: 'auditoria.view' },
];

export const CONFIG_SUB_NAV_ITEMS: NavItem[] = [
    { 
        id: 'categories', 
        label: 'Categorías de Mercancía', 
        icon: TagIcon, 
        permissionKey: 'categories.view',
        description: 'Define los tipos de mercancía que se transportan.',
        colorVariant: 'orange'
    },
    { 
        id: 'offices', 
        label: 'Oficinas y Sucursales', 
        icon: BuildingOfficeIcon, 
        permissionKey: 'offices.view',
        description: 'Gestiona las sucursales y puntos de operación.',
        colorVariant: 'blue'
    },
    { 
        id: 'shipping-types', 
        label: 'Tipos de Envío', 
        icon: ListBulletIcon, 
        permissionKey: 'shipping-types.view',
        description: 'Configura las modalidades de envío disponibles.',
        colorVariant: 'purple'
    },
    { 
        id: 'payment-methods', 
        label: 'Formas de Pago', 
        icon: CreditCardIcon, 
        permissionKey: 'payment-methods.view',
        description: 'Administra cuentas bancarias y métodos de pago.',
        colorVariant: 'green'
    },
];


export const SYSTEM_REPORTS: Report[] = [
    { id: 'general_envios', title: 'Reporte General de Envíos' },
    { id: 'libro_venta', title: 'Reporte de Libro de Venta' },
    { id: 'cuentas_cobrar', title: 'Reporte de Cuentas por Cobrar' },
    { id: 'cuentas_pagar', title: 'Reporte de Cuentas por Pagar (Gastos)' },
    { id: 'ipostel', title: 'Reporte de Aporte IPOSTEL' },
    { id: 'seguro', title: 'Reporte de Cobro de Seguro' },
    { id: 'clientes', title: 'Reporte de Movimiento de Clientes' },
    { id: 'envios_oficina', title: 'Reporte de Productividad por Oficina' },
    { id: 'gastos_oficina', title: 'Reporte de Gastos por Oficina' },
    { id: 'facturas_anuladas', title: 'Reporte de Facturas Anuladas' },
    { id: 'iva', title: 'Reporte de I.V.A. (Débito y Crédito Fiscal)' },
    { id: 'cuadre_caja', title: 'Reporte de Cuadre de Caja' },
    { id: 'reporte_kilogramos', title: 'Reporte de Kilogramos Movilizados' },
    { id: 'reporte_envios_vehiculo', title: 'Reporte de Envíos por Vehículo' },
    { id: 'reporte_comisiones', title: 'Reporte de Comisiones' },
];

export const OFFICES: string[] = ['Caracas - San Agustín', 'Valencia - San Blas', 'Barquisimeto - Centro'];

// 2. Lista Maestra de Permisos (Total 78)
export const ALL_PERMISSION_KEYS: string[] = [
    // Inicio (1)
    'dashboard.view',
    // Facturación y Guías (8)
    'shipping-guide.view',
    'invoices.view',
    'invoices.create',
    'invoices.edit',
    'invoices.delete',
    'invoices.void',
    'invoices.changeStatus',
    'invoices.manage_all_offices',
    // Flota (5)
    'flota.view',
    'flota.create',
    'flota.edit',
    'flota.delete',
    'flota.dispatch',
    // Remesas (3)
    'remesas.view',
    'remesas.create',
    'remesas.delete',
    // Asociados (5)
    'asociados.view',
    'asociados.create',
    'asociados.edit',
    'asociados.delete',
    'asociados.pagos.delete',
    'cobranzas.view',
    // Clientes (4)
    'clientes.view',
    'clientes.create',
    'clientes.edit',
    'clientes.delete',
    // Proveedores (4)
    'proveedores.view',
    'proveedores.create',
    'proveedores.edit',
    'proveedores.delete',
    // Libro Contable y Gastos (9)
    'libro-contable.view',
    'libro-contable.create',
    'libro-contable.edit',
    'libro-contable.delete',
    'expenses.manage_all_offices',
    'plan-contable.view',
    'plan-contable.create',
    'plan-contable.edit',
    'plan-contable.delete',
    // Inventario (10)
    'inventario.view',
    'inventario-envios.view',
    'inventario-bienes.view',
    'inventario-bienes.create',
    'inventario-bienes.edit',
    'inventario-bienes.delete',
    'bienes-categorias.view',
    'bienes-categorias.create',
    'bienes-categorias.edit',
    'bienes-categorias.delete',
    // Reportes (2)
    'reports.view',
    'reports.associates.view',
    // Auditoría (1)
    'auditoria.view',
    // Configuración General (8)
    'configuracion.view',
    'config.company.edit',
    'config.users.manage',
    'config.users.edit_protected',
    'config.users.manage_tech_users',
    'config.profile.edit',
    'config.roles.view',
    'config.roles.manage',
    // Configuración: Tablas Auxiliares (16)
    'categories.view',
    'categories.create',
    'categories.edit',
    'categories.delete',
    'offices.view',
    'offices.create',
    'offices.edit',
    'offices.delete',
    'shipping-types.view',
    'shipping-types.create',
    'shipping-types.edit',
    'shipping-types.delete',
    'payment-methods.view',
    'payment-methods.create',
    'payment-methods.edit',
    'payment-methods.delete',
];

// 3. Traducciones para la UI de Gestión de Roles
export const PERMISSION_KEY_TRANSLATIONS: Record<string, string> = {
    'dashboard.view': 'Ver Inicio',
    'shipping-guide.view': 'Crear Guías/Facturas',
    'invoices.view': 'Ver Facturas',
    'invoices.create': 'Crear Facturas (Guardar)',
    'invoices.edit': 'Editar Facturas',
    'invoices.delete': 'Eliminar Facturas (Permanente)',
    'invoices.void': 'Anular Facturas',
    'invoices.changeStatus': 'Cambiar Estado de Facturas',
    'invoices.manage_all_offices': 'Gestionar Facturas de Todas las Oficinas',
    'flota.view': 'Ver Módulo de Flota',
    'flota.create': 'Añadir Vehículos a Flota',
    'flota.edit': 'Editar Vehículos de Flota',
    'flota.delete': 'Eliminar Vehículos de Flota',
    'flota.dispatch': 'Despachar y Finalizar Viajes',
    'remesas.view': 'Ver Módulo de Remesas',
    'remesas.create': 'Crear Remesas',
    'remesas.delete': 'Eliminar Remesas',
    'asociados.view': 'Ver Módulo de Conductores',
    'asociados.create': 'Crear Conductores',
    'asociados.edit': 'Editar Conductores',
    'asociados.delete': 'Eliminar Conductores',
    'asociados.pagos.delete': 'Eliminar Deudas de Conductores',
    'cobranzas.view': 'Ver Módulo de Cobranzas',
    'clientes.view': 'Ver Clientes',
    'clientes.create': 'Crear Clientes',
    'clientes.edit': 'Editar Clientes',
    'clientes.delete': 'Eliminar Clientes',
    'proveedores.view': 'Ver Proveedores',
    'proveedores.create': 'Crear Proveedores',
    'proveedores.edit': 'Editar Proveedores',
    'proveedores.delete': 'Eliminar Proveedores',
    'libro-contable.view': 'Ver Libro Contable',
    'libro-contable.create': 'Registrar Gastos',
    'libro-contable.edit': 'Editar Gastos',
    'libro-contable.delete': 'Eliminar Gastos',
    'expenses.manage_all_offices': 'Gestionar Gastos de Todas las Oficinas',
    'plan-contable.view': 'Ver Plan de Cuentas',
    'plan-contable.create': 'Crear Cuentas Contables',
    'plan-contable.edit': 'Editar Cuentas Contables',
    'plan-contable.delete': 'Eliminar Cuentas Contables',
    'inventario.view': 'Ver Módulo de Inventario (General)',
    'inventario-envios.view': 'Ver Inventario de Envíos',
    'inventario-bienes.view': 'Ver Inventario de Bienes',
    'inventario-bienes.create': 'Crear Bienes',
    'inventario-bienes.edit': 'Editar Bienes',
    'inventario-bienes.delete': 'Eliminar Bienes',
    'bienes-categorias.view': 'Ver Categorías de Bienes',
    'bienes-categorias.create': 'Crear Categorías de Bienes',
    'bienes-categorias.edit': 'Editar Categorías de Bienes',
    'bienes-categorias.delete': 'Eliminar Categorías de Bienes',
    'reports.view': 'Ver Reportes Generales',
    'reports.associates.view': 'Ver Reporte Estado Cuenta Conductores',
    'auditoria.view': 'Ver Auditoría',
    'configuracion.view': 'Ver Configuración',
    'config.company.edit': 'Editar Datos de la Empresa',
    'config.users.manage': 'Gestionar Usuarios',
    'config.users.edit_protected': 'Editar Usuarios Protegidos (Sistema)',
    'config.users.manage_tech_users': 'Gestionar Usuarios de Soporte',
    'config.profile.edit': 'Editar Perfil Propio (Cabecera)',
    'config.roles.view': 'Ver Roles del Sistema',
    'config.roles.manage': 'Gestionar (Crear/Editar/Borrar) Roles',
    'categories.view': 'Ver Categorías de Mercancía',
    'categories.create': 'Crear Categorías',
    'categories.edit': 'Editar Categorías',
    'categories.delete': 'Eliminar Categorías',
    'offices.view': 'Ver Oficinas',
    'offices.create': 'Crear Oficinas',
    'offices.edit': 'Editar Oficinas',
    'offices.delete': 'Eliminar Oficinas',
    'shipping-types.view': 'Ver Tipos de Envío',
    'shipping-types.create': 'Crear Tipos de Envío',
    'shipping-types.edit': 'Editar Tipos de Envío',
    'shipping-types.delete': 'Eliminar Tipos de Envío',
    'payment-methods.view': 'Ver Formas de Pago',
    'payment-methods.create': 'Crear Formas de Pago',
    'payment-methods.edit': 'Editar Formas de Pago',
    'payment-methods.delete': 'Eliminar Formas de Pago',
};

// --- DEFINICIÓN EXACTA DE ROLES ---
const fullAccess: Record<string, boolean> = ALL_PERMISSION_KEYS.reduce((acc, key) => { acc[key] = true; return acc; }, {} as Record<string, boolean>);

const admin2Permissions: Record<string, boolean> = {
    ...fullAccess,
    'config.roles.manage': false,
    'config.roles.view': true,
};

const operatorPermissions: Record<string, boolean> = {
    'dashboard.view': true,
    'shipping-guide.view': true,
    'invoices.view': true, 'invoices.create': true, 'invoices.edit': true, 'invoices.changeStatus': true, 'invoices.void': true, 'invoices.delete': true,
    'flota.view': true, 'flota.create': true, 'flota.edit': true, 'flota.delete': true, 'flota.dispatch': true,
    'remesas.view': true, 'remesas.create': true, 'remesas.delete': true,
    'clientes.view': true, 'clientes.create': true, 'clientes.edit': true, 'clientes.delete': true,
    'proveedores.view': true, 'proveedores.create': true, 'proveedores.edit': true, 'proveedores.delete': true,
    'libro-contable.view': true, 'libro-contable.create': true, 'libro-contable.edit': true, 'libro-contable.delete': true,
    'reports.view': true,
    'config.profile.edit': true,
    'plan-contable.view': false,
    'invoices.manage_all_offices': false,
    'expenses.manage_all_offices': false,
    'asociados.view': false,
    'inventario.view': false,
    'configuracion.view': false,
    'auditoria.view': false
};

const assistantPermissions: Record<string, boolean> = {
    ...operatorPermissions,
    'asociados.view': true,
    'asociados.create': true,
    'asociados.edit': true,
    'asociados.delete': false,
    'reports.associates.view': true,
    'config.profile.edit': true
};

const accountantPermissions: Record<string, boolean> = {
    'dashboard.view': true,
    'reports.view': true,
    'reports.associates.view': true,
    'libro-contable.view': true,
    'libro-contable.create': true,
    'libro-contable.edit': true,
    'libro-contable.delete': true,
    'plan-contable.view': true,
    'plan-contable.create': true,
    'plan-contable.edit': true,
    'plan-contable.delete': true,
    'config.profile.edit': true,
    'invoices.manage_all_offices': true,
    'expenses.manage_all_offices': true,
    'shipping-guide.view': false,
    'invoices.view': false,
    'flota.view': false,
    'remesas.view': false,
    'asociados.view': false,
    'clientes.view': false,
    'proveedores.view': false,
    'inventario.view': false,
    'configuracion.view': false,
    'auditoria.view': false
};

export const DEFAULT_ROLE_PERMISSIONS: Record<string, Record<string, boolean>> = {
    'role-admin': fullAccess,
    'role-admin-2': admin2Permissions,
    'role-tech': fullAccess,
    'role-op': operatorPermissions,
    'role-assistant': assistantPermissions,
    'role-accountant': accountantPermissions,
};
