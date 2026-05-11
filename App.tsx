
import React, { useState, useEffect, useMemo } from 'react';
import Sidebar from './components/layout/Sidebar';
import Header from './components/layout/Header';
import LoginView from './components/auth/LoginView';
import DashboardView from './components/dashboard/DashboardView';
import InvoicesView from './components/invoices/InvoicesView';
import ReportsView from './components/reports/ReportsView';
import { Page, Report } from './types';
import ShippingGuideView from './components/shipping-guide/ShippingGuideView';
import EditInvoiceView from './components/invoices/EditInvoiceView';
import AsociadosLandingView from './components/asociados/AsociadosLandingView';
import AsociadosGestionView from './components/asociados/AsociadosView';
import EstadisticasAsociadosView from './components/asociados/EstadisticasAsociadosView';
import ConfiguracionView from './components/configuracion/ConfiguracionView';
import CategoryView from './components/categories/CategoryView';
import ReportDetailView from './components/reports/ReportDetailView';
import ClientsView from './components/clients/ClientsView';
import OfficesView from './components/offices/OfficesView';
import ShippingTypesView from './components/shipping-types/ShippingTypesView';
import PaymentMethodsView from './components/payment-methods/PaymentMethodsView';
import { SYSTEM_REPORTS } from './constants';
import LibroContableView from './components/libro-contable/LibroContableView';
import GastosView from './components/gastos/GastosView';
import InventarioView from './components/inventario/InventarioView';
import InventarioLandingView from './components/inventario/InventarioLandingView';
import BienesView from './components/inventario/BienesView';
import AuditLogView from './components/auditoria/AuditLogView';
import BienesCategoryView from './components/inventario/BienesCategoryView';
import SuppliersView from './components/proveedores/SuppliersView';
import FlotaView from './components/flota/FlotaView';

import AppProviders from './contexts/AppProviders';
import { useAuth } from './contexts/AuthContext';
import { useConfig } from './contexts/ConfigContext';
import { useData } from './contexts/DataContext';
import { useSystem } from './contexts/SystemContext';
import ReportesAsociadosView from './components/asociados/ReportesAsociadosView';
import AsociadosPagosView from './components/asociados/AsociadosPagosView';
import CobranzasView from './components/asociados/CobranzasView';
import RemesasView from './components/remesas/RemesasView';
import FlotaVehiculosPorAsociadoView from './components/flota/FlotaVehiculosPorAsociadoView';
import { PackageIcon } from './components/icons/Icons';
import SessionWarningModal from './components/auth/SessionWarningModal';
import ErrorBoundary from './components/ui/ErrorBoundary';

const AppContent: React.FC = () => {
    const { isAuthenticated, currentUser, isAuthLoading, isWarningModalOpen, countdown, handleExtendSession } = useAuth();
    const { 
        companyInfo, users, roles, offices, categories, shippingTypes, paymentMethods, 
        expenseCategories, userPermissions, isLoading: isLoadingConfig,
        handleLogin, handleLogout,
        handleCompanyInfoSave, handleSaveUser, onDeleteUser, handleSaveRole, onDeleteRole, 
        onUpdateRolePermissions, handleSaveCategory, onDeleteCategory, handleSaveOffice,
        onDeleteOffice, handleSaveShippingType, onDeleteShippingType, handleSavePaymentMethod, 
        onDeletePaymentMethod, handleSaveExpenseCategory, onDeleteExpenseCategory,
        handleSaveCuentaContable, handleDeleteCuentaContable
    } = useConfig();
    const {
        invoices, clients, suppliers, vehicles, expenses, inventory, assets, assetCategories,
        asociados, certificados, pagosAsociados, recibosPagoAsociados, remesas, asientosManuales, isLoading: isLoadingData,
        handleSaveClient, handleDeleteClient, handleSaveSupplier, handleDeleteSupplier,
        handleSaveInvoice, handleUpdateInvoice, handleUpdateInvoiceStatuses, handleDeleteInvoice,
        handleSaveVehicle, handleDeleteVehicle, handleSaveExpense,
        handleDeleteExpense, handleSaveAsset, handleDeleteAsset, handleSaveAssetCategory,
        handleDeleteAssetCategory,
        handleSaveAsociado, handleDeleteAsociado,
        handleSaveCertificado, handleDeleteCertificado,
        handleSavePagoAsociado, handleDeletePagoAsociado,
        handleSaveRecibo, handleDeleteRemesa,
        handleAssignToVehicle, handleUnassignInvoice, handleDispatchVehicle,
        handleSaveAsientoManual, handleDeleteAsientoManual, handleGenerateMassiveDebt
    } = useData();
    const { auditLog } = useSystem();

    const [currentPage, setCurrentPage] = useState<Page>('dashboard');
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);
    const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
    
    const [editingInvoiceId, setEditingInvoiceId] = useState<string | null>(null);
    const [viewingReport, setViewingReport] = useState<Report | null>(null);
    const [reportOfficeId, setReportOfficeId] = useState<string | null>(null);
    const [inventoryFilter, setInventoryFilter] = useState<string | null>(null);
    const [invoiceFilter, setInvoiceFilter] = useState<{ type: string, value: string } | null>(null);
    const [selectedAsociadoId, setSelectedAsociadoId] = useState<string | null>(null);

    // --- DATA SEGREGATION LOGIC (PURE PERMISSION BASED) ---
    
    // Helper: Determine if user has Global Access (Admin, Support, Accountant)
    const hasGlobalAccess = useMemo(() => {
        if (!currentUser) return false;
        // Admins, Support, and Accountants (who need to see all financials) get global access.
        // We explicitly include 'role-accountant' to ensure they see data from ALL offices for the accounting books.
        return userPermissions['invoices.manage_all_offices'] || 
               userPermissions['plan-contable.view'] || 
               currentUser.roleId === 'role-accountant';
    }, [userPermissions, currentUser]);

    // Backend ya filtra la data por seguridad. 
    // Usamos las variables en su estado natural para conservar dependencias.
    const filteredInvoices = invoices;
    const filteredExpenses = hasGlobalAccess ? expenses : expenses.filter(e => e.officeId === currentUser?.officeId);
    const filteredInventory = inventory;
    const filteredRemesas = remesas;
    const viewableOffices = offices;

    useEffect(() => {
        if (!isAuthenticated) return;

        const handleHashChange = () => {
            const hash = window.location.hash.replace('#', '');
            const [page, param, subParam, ...filterValueParts] = hash.split('/');
            const filterValue = filterValueParts.join('/');
            
            const validPages: Page[] = ['dashboard', 'shipping-guide', 'invoices', 'asociados', 'reports', 'configuracion', 'categories', 'edit-invoice', 'report-detail', 'clientes', 'proveedores', 'gastos', 'offices', 'shipping-types', 'payment-methods', 'libro-contable', 'inventario', 'auditoria', 'inventario-bienes', 'inventario-envios', 'bienes-categorias', 'asociados-gestion', 'asociados-estadisticas', 'asociados-reportes', 'asociados-pagos', 'remesas', 'flota', 'flota-vehiculos', 'cobranzas'];
            
            setEditingInvoiceId(null);
            setViewingReport(null);
            setReportOfficeId(null);
            setInventoryFilter(null);
            setInvoiceFilter(null);
            setSelectedAsociadoId(null);

            // --- STRICT PERMISSION CHECK FOR ROUTING ---
            const pagePermissionMap: Partial<Record<Page, string>> = {
                'dashboard': 'dashboard.view',
                'shipping-guide': 'shipping-guide.view',
                'invoices': 'invoices.view',
                'flota': 'flota.view',
                'flota-vehiculos': 'flota.view',
                'remesas': 'remesas.view',
                'asociados': 'asociados.view',
                'asociados-gestion': 'asociados.view',
                'asociados-estadisticas': 'asociados.view',
                'asociados-pagos': 'asociados.view',
                'clientes': 'clientes.view',
                'proveedores': 'proveedores.view',
                'gastos': 'gastos.create',
                'libro-contable': 'libro-contable.view',
                'inventario': 'inventario.view',
                'inventario-envios': 'inventario-envios.view',
                'inventario-bienes': 'inventario-bienes.view',
                'bienes-categorias': 'bienes-categorias.view',
                'reports': 'reports.view',
                'report-detail': 'reports.view',
                'auditoria': 'auditoria.view',
                'configuracion': 'configuracion.view',
                'categories': 'categories.view',
                'offices': 'offices.view',
                'shipping-types': 'shipping-types.view',
                'payment-methods': 'payment-methods.view',
                'cobranzas': 'cobranzas.view'
            };

            const requiredPermission = pagePermissionMap[page as Page];
            if (requiredPermission && !userPermissions[requiredPermission]) {
                if (userPermissions['dashboard.view']) {
                    window.location.hash = 'dashboard';
                    setCurrentPage('dashboard');
                } else {
                    setCurrentPage('dashboard');
                }
                return;
            }

            if (page === 'flota-vehiculos' && param) {
                setSelectedAsociadoId(param);
                setCurrentPage('flota-vehiculos');
            } else if (page === 'asociados' && param === 'gestion') {
                 setCurrentPage('asociados-gestion');
            } else if (page === 'asociados' && param === 'estadisticas') {
                setCurrentPage('asociados-estadisticas');
            } else if (page === 'asociados' && param === 'pagos') {
                setCurrentPage('asociados-pagos');
            } else if (page === 'asociados' && param === 'cobranzas') {
                setCurrentPage('cobranzas');
            } else if (page === 'invoices' && param === 'filter' && subParam && filterValue) {
                setInvoiceFilter({ type: subParam, value: decodeURIComponent(filterValue) });
                setCurrentPage('invoices');
            } else if (page === 'inventario-envios' && param) {
                setInventoryFilter(param);
                setCurrentPage('inventario-envios');
            } else if (validPages.includes(page as Page)) {
                 if(page === 'edit-invoice' && param) {
                    setEditingInvoiceId(param);
                }
                 if(page === 'report-detail' && param) {
                    setViewingReport(SYSTEM_REPORTS.find(r => r.id === param) || null);
                    if (subParam) {
                        setReportOfficeId(subParam);
                    }
                }
                setCurrentPage(page as Page);
            } else {
                if (userPermissions['dashboard.view']) {
                    setCurrentPage('dashboard');
                    window.location.hash = 'dashboard';
                }
            }
        };

        window.addEventListener('hashchange', handleHashChange);
        handleHashChange();

        return () => window.removeEventListener('hashchange', handleHashChange);
    }, [isAuthenticated, userPermissions]);

    useEffect(() => {
        if (isAuthenticated && isWarningModalOpen && countdown <= 0) {
            handleLogout();
        }
    }, [countdown, isAuthenticated, isWarningModalOpen, handleLogout]);
    
    const renderPage = () => {
        if (!currentUser) return null; 
        if (isLoadingConfig || isLoadingData) {
            return (
                <div className="flex h-full items-center justify-center">
                    <div className="text-center">
                        <PackageIcon className="mx-auto h-10 w-10 text-primary-600 animate-pulse" />
                        <h2 className="mt-2 text-md font-medium text-gray-700 dark:text-gray-300">Cargando datos...</h2>
                    </div>
                </div>
            );
        }
        
        return (
            <ErrorBoundary>
                {(() => {
                    switch (currentPage) {
                        case 'dashboard': return <DashboardView invoices={filteredInvoices} vehicles={vehicles} companyInfo={companyInfo} offices={offices} permissions={userPermissions} />;
                        case 'shipping-guide': return <ShippingGuideView onSaveInvoice={handleSaveInvoice} categories={categories} clients={clients} offices={offices} shippingTypes={shippingTypes} paymentMethods={paymentMethods} companyInfo={companyInfo} currentUser={currentUser} permissions={userPermissions} />;
                        case 'edit-invoice':
                            const invoiceToEdit = invoices.find(inv => inv.id === editingInvoiceId);
                            // Security check for Edit: Allow if global permission OR owns the invoice
                            if (invoiceToEdit && !hasGlobalAccess && invoiceToEdit.guide.originOfficeId !== currentUser.officeId) {
                                return <div className="text-center p-8">No tiene permiso para editar facturas de otra oficina.</div>;
                            }
                            return invoiceToEdit ? <EditInvoiceView invoice={invoiceToEdit} onSaveInvoice={handleUpdateInvoice} categories={categories} clients={clients} offices={offices} shippingTypes={shippingTypes} paymentMethods={paymentMethods} companyInfo={companyInfo} currentUser={currentUser} permissions={userPermissions} /> : <div>Factura no encontrada</div>;
                        case 'invoices': return <InvoicesView invoices={filteredInvoices} clients={clients} categories={categories} userPermissions={userPermissions} onUpdateStatuses={handleUpdateInvoiceStatuses} onDeleteInvoice={handleDeleteInvoice} companyInfo={companyInfo} initialFilter={invoiceFilter} offices={offices} />;
                        case 'gastos': return <GastosView 
                            expenses={filteredExpenses}
                            suppliers={suppliers}
                            expenseCategories={expenseCategories}
                            offices={offices}
                            paymentMethods={paymentMethods}
                            currentUser={currentUser}
                            permissions={userPermissions}
                            onSaveExpense={handleSaveExpense}
                            onDeleteExpense={handleDeleteExpense}
                        />;
                        case 'remesas': return <RemesasView 
                            remesas={filteredRemesas} 
                            asociados={asociados}
                            vehicles={vehicles}
                            invoices={filteredInvoices}
                            offices={offices}
                            clients={clients}
                            categories={categories}
                            shippingTypes={shippingTypes}
                            onAssignToVehicle={handleAssignToVehicle}
                            onUnassignInvoice={handleUnassignInvoice}
                            onDispatchVehicle={handleDispatchVehicle}
                            onDeleteRemesa={handleDeleteRemesa}
                            permissions={userPermissions}
                            companyInfo={companyInfo}
                        />;
                        case 'flota': return <FlotaView 
                            asociados={asociados} 
                            vehicles={vehicles} 
                        />;
                        case 'flota-vehiculos': {
                            const selectedAsociado = asociados.find(a => a.id === selectedAsociadoId);
                            return selectedAsociado ? <FlotaVehiculosPorAsociadoView
                                asociado={selectedAsociado}
                                vehicles={vehicles}
                                invoices={invoices}
                                offices={offices}
                                clients={clients}
                                onUnassignInvoice={handleUnassignInvoice}
                                onSaveVehicle={handleSaveVehicle}
                                onDeleteVehicle={handleDeleteVehicle}
                                permissions={userPermissions}
                                companyInfo={companyInfo}
                            /> : <div>Asociado no encontrado. <a href="#flota" className="text-primary-600 hover:underline">Volver a la lista</a>.</div>;
                        }
                        case 'asociados': return <AsociadosLandingView permissions={userPermissions} />;
                        case 'asociados-gestion': return <AsociadosGestionView 
                            asociados={asociados} onSaveAsociado={handleSaveAsociado} onDeleteAsociado={handleDeleteAsociado}
                            vehicles={vehicles} onSaveVehicle={handleSaveVehicle} onDeleteVehicle={handleDeleteVehicle}
                            certificados={certificados} onSaveCertificado={handleSaveCertificado} onDeleteCertificado={handleDeleteCertificado}
                            pagos={pagosAsociados} onSavePago={handleSavePagoAsociado} onDeletePago={handleDeletePagoAsociado}
                            recibos={recibosPagoAsociados} onSaveRecibo={handleSaveRecibo}
                            permissions={userPermissions} companyInfo={companyInfo}
                        />;
                        case 'asociados-estadisticas': return <EstadisticasAsociadosView asociados={asociados} pagos={pagosAsociados} />;
                        case 'asociados-pagos': return <AsociadosPagosView 
                            asociados={asociados}
                            pagos={pagosAsociados}
                            recibos={recibosPagoAsociados}
                            onSavePago={handleSavePagoAsociado}
                            onDeletePago={handleDeletePagoAsociado}
                            onSaveRecibo={handleSaveRecibo}
                            companyInfo={companyInfo}
                            permissions={userPermissions}
                        />;
                        case 'cobranzas': return <CobranzasView 
                            asociados={asociados}
                            pagosAsociados={pagosAsociados}
                            recibosAsociados={recibosPagoAsociados}
                            onGenerateMassiveDebt={handleGenerateMassiveDebt}
                            onSaveRecibo={handleSaveRecibo}
                            onDeletePago={handleDeletePagoAsociado}
                            companyInfo={companyInfo}
                            permissions={userPermissions}
                        />;
                        case 'reports': return <ReportsView reports={SYSTEM_REPORTS} invoices={filteredInvoices} offices={offices} companyInfo={companyInfo} />;
                        case 'report-detail': 
                            if (viewingReport?.id === 'reporte_asociados') {
                                if (userPermissions['reports.associates.view']) {
                                    return <ReportesAsociadosView asociados={asociados} pagos={pagosAsociados} recibos={recibosPagoAsociados} companyInfo={companyInfo} />;
                                } else {
                                    return <div className="text-center p-8 text-gray-500">No tiene permisos para ver este reporte.</div>;
                                }
                            }
                            
                            // Apply office filter if specified in the report URL
                            const reportInvoices = reportOfficeId && reportOfficeId !== 'all' 
                                ? filteredInvoices.filter(inv => inv.guide.originOfficeId === reportOfficeId)
                                : filteredInvoices;
                            const reportExpenses = reportOfficeId && reportOfficeId !== 'all'
                                ? filteredExpenses.filter(e => e.officeId === reportOfficeId)
                                : filteredExpenses;

                            return viewingReport ? <ReportDetailView report={viewingReport} invoices={reportInvoices} clients={clients} expenses={reportExpenses} offices={viewableOffices} companyInfo={companyInfo} paymentMethods={paymentMethods} vehicles={vehicles} categories={categories} asociados={asociados} shippingTypes={shippingTypes} reportOfficeId={reportOfficeId} /> : <div>Reporte no encontrado</div>;
                        case 'categories': return <CategoryView categories={categories} onSave={handleSaveCategory} onDelete={onDeleteCategory} permissions={userPermissions} />;
                        case 'clientes': return <ClientsView clients={clients} onSave={handleSaveClient} onDelete={handleDeleteClient} permissions={userPermissions} />;
                        case 'proveedores': return <SuppliersView suppliers={suppliers} onSave={handleSaveSupplier} onDelete={handleDeleteSupplier} permissions={userPermissions} />;
                        case 'offices': return <OfficesView offices={offices} onSave={handleSaveOffice} onDelete={onDeleteOffice} permissions={userPermissions} />;
                        case 'shipping-types': return <ShippingTypesView shippingTypes={shippingTypes} onSave={handleSaveShippingType} onDelete={onDeleteShippingType} permissions={userPermissions} />;
                        case 'payment-methods': return <PaymentMethodsView paymentMethods={paymentMethods} onSave={handleSavePaymentMethod} onDelete={onDeletePaymentMethod} permissions={userPermissions} />;
                        case 'libro-contable': return <LibroContableView 
                            invoices={filteredInvoices} 
                            expenses={filteredExpenses} 
                            expenseCategories={expenseCategories} 
                            onSaveExpense={handleSaveExpense} 
                            onDeleteExpense={handleDeleteExpense} 
                            onSaveExpenseCategory={handleSaveExpenseCategory} 
                            onDeleteExpenseCategory={onDeleteExpenseCategory} 
                            permissions={userPermissions} 
                            offices={offices} 
                            currentUser={currentUser} 
                            paymentMethods={paymentMethods} 
                            companyInfo={companyInfo} 
                            suppliers={suppliers} 
                            asientosManuales={asientosManuales} 
                            onSaveAsientoManual={handleSaveAsientoManual} 
                            onDeleteAsientoManual={handleDeleteAsientoManual} 
                        />;
                        case 'inventario': return <InventarioLandingView permissions={userPermissions} />;
                        case 'inventario-envios': return <InventarioView items={filteredInventory} permissions={userPermissions} filter={inventoryFilter} currentUser={currentUser!} offices={offices} />;
                        case 'inventario-bienes': return <BienesView assets={assets} onSave={handleSaveAsset} onDelete={handleDeleteAsset} permissions={userPermissions} offices={offices} assetCategories={assetCategories} />;
                        case 'bienes-categorias': return <BienesCategoryView categories={assetCategories} onSave={handleSaveAssetCategory} onDelete={handleDeleteAssetCategory} permissions={userPermissions} />;
                        case 'auditoria': return <AuditLogView auditLog={auditLog} users={users} />;
                        case 'configuracion': 
                            if (userPermissions['configuracion.view']) {
                                return (
                                    <ConfiguracionView
                                        companyInfo={companyInfo} onCompanyInfoSave={handleCompanyInfoSave}
                                        users={users} roles={roles} offices={offices} 
                                        onSaveUser={handleSaveUser} onDeleteUser={onDeleteUser} 
                                        permissions={userPermissions}
                                        currentUser={currentUser}
                                        onSaveRole={handleSaveRole}
                                        onDeleteRole={onDeleteRole}
                                        onUpdateRolePermissions={onUpdateRolePermissions}
                                        asociados={asociados}
                                    />
                                );
                            } else {
                                return <DashboardView invoices={filteredInvoices} vehicles={vehicles} companyInfo={companyInfo} offices={offices} permissions={userPermissions} />;
                            }
                        default:
                            if (userPermissions['dashboard.view']) {
                                return <DashboardView invoices={filteredInvoices} vehicles={vehicles} companyInfo={companyInfo} offices={offices} permissions={userPermissions} />;
                            }
                            return <div className="p-8 text-center text-gray-500">Bienvenido. No tienes permisos para ver el panel de inicio. Contacta a soporte.</div>;
                    }
                })()}
            </ErrorBoundary>
        );
    };

    if (isAuthLoading) {
        return (
            <div className="flex h-screen w-full items-center justify-center bg-gray-50 dark:bg-gray-900">
                <div className="text-center">
                    <PackageIcon className="mx-auto h-12 w-12 text-primary-600 animate-pulse" />
                    <h2 className="mt-4 text-lg font-medium text-gray-700 dark:text-gray-300">Iniciando Sistema...</h2>
                </div>
            </div>
        );
    }

    if (!isAuthenticated || !currentUser) {
        return <LoginView onLogin={handleLogin} companyInfo={companyInfo} />;
    }

    return (
        <>
            <div className="flex h-screen bg-gray-50 dark:bg-gray-900 text-gray-800 dark:text-gray-200">
                <Sidebar 
                    currentPage={currentPage} 
                    permissions={userPermissions} 
                    isSidebarOpen={isSidebarOpen} 
                    setIsSidebarOpen={setIsSidebarOpen} 
                    companyInfo={companyInfo}
                    isSidebarCollapsed={isSidebarCollapsed}
                    setIsSidebarCollapsed={setIsSidebarCollapsed}
                    currentUser={currentUser}
                />
                <div className="flex-1 flex flex-col overflow-hidden">
                    <Header 
                        currentPage={currentPage} 
                        onToggleSidebar={() => setIsSidebarOpen(!isSidebarOpen)} 
                        companyInfo={companyInfo} 
                        onUpdateCompanyInfo={handleCompanyInfoSave}
                        currentUser={currentUser}
                        onLogout={handleLogout}
                        permissions={userPermissions}
                        // Props for Profile Edit
                        roles={roles}
                        offices={offices}
                        asociados={asociados}
                        onSaveUser={handleSaveUser}
                    />
                    <main className="flex-1 overflow-x-hidden overflow-y-auto bg-gray-100 dark:bg-gray-800">
                        <div className="max-w-7xl mx-auto p-4 sm:p-6 lg:p-8">
                            {renderPage()}
                        </div>
                    </main>
                </div>
            </div>
            <SessionWarningModal
                isOpen={isWarningModalOpen}
                countdown={countdown}
                onExtend={handleExtendSession}
                onLogout={handleLogout}
            />
        </>
    );
};

const App: React.FC = () => (
    <AppProviders>
        <AppContent />
    </AppProviders>
);

export default App;
