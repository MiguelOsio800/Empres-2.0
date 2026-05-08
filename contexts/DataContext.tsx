
import React, { createContext, useContext, ReactNode, useState, useEffect, useCallback, useRef } from 'react';
import { 
    Invoice, Client, Vehicle, Expense, InventoryItem, Asset, AssetCategory, Supplier,
    PaymentStatus, ShippingStatus, MasterStatus, Asociado, Certificado, PagoAsociado, ReciboPagoAsociado, Remesa, AsientoManual 
} from '../types';
import { useToast } from '../components/ui/ToastProvider';
import { useAuth } from './AuthContext';
import { useSystem } from './SystemContext';
import { apiFetch } from '../utils/api';
import { deriveInventoryFromInvoices } from '../utils/inventory';

type DataContextType = {
    invoices: Invoice[];
    clients: Client[];
    suppliers: Supplier[];
    vehicles: Vehicle[];
    expenses: Expense[];
    inventory: InventoryItem[];
    assets: Asset[];
    assetCategories: AssetCategory[];
    asociados: Asociado[];
    certificados: Certificado[];
    pagosAsociados: PagoAsociado[];
    recibosPagoAsociados: ReciboPagoAsociado[];
    remesas: Remesa[];
    asientosManuales: AsientoManual[];
    isLoading: boolean;
    handleSaveClient: (client: Client) => Promise<void>;
    handleDeleteClient: (clientId: string) => Promise<void>;
    handleSaveSupplier: (supplier: Supplier) => Promise<void>;
    handleDeleteSupplier: (supplierId: string) => Promise<void>;
    handleSaveInvoice: (invoice: any) => Promise<Invoice | null>;
    handleCreateCreditNote: (invoiceId: string, reason: string) => Promise<void>;
    handleCreateDebitNote: (invoiceId: string, reason: string) => Promise<void>;
    handleUpdateInvoice: (updatedInvoice: Invoice) => Promise<Invoice | null>;
    handleUpdateInvoiceStatuses: (invoiceId: string, newStatuses: any) => Promise<void>;
    handleDeleteInvoice: (invoiceId: string) => Promise<void>;
    handleSaveVehicle: (vehicle: Vehicle) => Promise<void>;
    handleDeleteVehicle: (vehicleId: string) => Promise<void>;
    handleAssignToVehicle: (invoiceIds: string[], vehicleId: string) => Promise<void>;
    handleUnassignInvoice: (invoiceId: string) => Promise<void>;
    handleDispatchVehicle: (vehicleId: string, invoiceIds: string[], exchangeRate: number, asociadoId: string, cooperativeAmount: number) => Promise<Remesa | null>;
    handleSaveExpense: (expense: Expense) => Promise<void>;
    handleDeleteExpense: (expenseId: string) => Promise<void>;
    handleSaveAsset: (asset: Asset) => Promise<void>;
    handleDeleteAsset: (assetId: string) => Promise<void>;
    handleSaveAssetCategory: (category: AssetCategory) => Promise<void>;
    handleDeleteAssetCategory: (categoryId: string) => Promise<void>;
    handleSaveAsociado: (asociado: Asociado) => Promise<Asociado>;
    handleDeleteAsociado: (asociadoId: string) => Promise<void>;
    handleSaveCertificado: (certificado: Certificado) => Promise<void>;
    handleDeleteCertificado: (certificadoId: string) => Promise<void>;
    handleSavePagoAsociado: (pago: PagoAsociado) => Promise<void>;
    handleDeletePagoAsociado: (pagoId: string) => Promise<void>;
    handleSaveRecibo: (recibo: ReciboPagoAsociado) => Promise<void>;
    handleDeleteRemesa: (remesaId: string) => Promise<void>;
    handleSaveAsientoManual: (asiento: AsientoManual) => Promise<void>;
    handleDeleteAsientoManual: (asientoId: string) => Promise<void>;
    handleGenerateMassiveDebt: (debtData: any) => Promise<void>;
    fetchAsociadoData: (asociadoId: string) => Promise<void>;
};

const DataContext = createContext<DataContextType | undefined>(undefined);

export const DataProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const { addToast } = useToast();
    const { isAuthenticated, currentUser } = useAuth();
    const { logAction } = useSystem();
    const dataLoadedForUserRef = useRef<string | null>(null);

    const [invoices, setInvoices] = useState<Invoice[]>([]);
    const [clients, setClients] = useState<Client[]>([]);
    const [suppliers, setSuppliers] = useState<Supplier[]>([]);
    const [vehicles, setVehicles] = useState<Vehicle[]>([]);
    const [expenses, setExpenses] = useState<Expense[]>([]);
    const [inventory, setInventory] = useState<InventoryItem[]>([]);
    const [assets, setAssets] = useState<Asset[]>([]);
    const [assetCategories, setAssetCategories] = useState<AssetCategory[]>([]);
    const [asociados, setAsociados] = useState<Asociado[]>([]);
    const [certificados, setCertificados] = useState<Certificado[]>([]);
    const [pagosAsociados, setPagosAsociados] = useState<PagoAsociado[]>([]);
    const [recibosPagoAsociados, setRecibosPagoAsociados] = useState<ReciboPagoAsociado[]>([]);
    const [remesas, setRemesas] = useState<Remesa[]>([]);
    const [asientosManuales, setAsientosManuales] = useState<AsientoManual[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    const fetchSafe = useCallback(async <T,>(endpoint: string, fallbackValue: T): Promise<T> => {
        try {
            return await apiFetch<T>(endpoint);
        } catch (error: any) {
            const msg = error.message || '';
            // No loguear como error si es falta de permisos o endpoint no encontrado (ya manejado por el backend)
            if (!msg.includes('permisos') && !msg.includes('403') && !msg.includes('404')) {
                console.error(`FetchSafe error for ${endpoint}:`, error);
            }
            return fallbackValue;
        }
    }, []);
    
    useEffect(() => {
        if (!isAuthenticated) {
            dataLoadedForUserRef.current = null;
            setIsLoading(false);
            return;
        }
    }, [isAuthenticated]);

    const fetchData = useCallback(async () => {
        if (!isAuthenticated || !currentUser) return;
        
        try {
            setIsLoading(true);
            dataLoadedForUserRef.current = currentUser?.id || 'authed';
            
            const promises: Promise<any>[] = [];

            // Peticiones base que SIEMPRE deben ejecutarse (El backend filtra por seguridad)
            promises.push(fetchSafe<Invoice[]>('/invoices', []).then(d => { setInvoices(d); setInventory(deriveInventoryFromInvoices(d)); }));
            promises.push(fetchSafe<Client[]>('/clients', []).then(setClients));
            promises.push(fetchSafe<Supplier[]>('/suppliers', []).then(setSuppliers));
            promises.push(fetchSafe<Vehicle[]>('/vehicles', []).then(setVehicles));
            promises.push(fetchSafe<Remesa[]>('/remesas', []).then(setRemesas));
            promises.push(fetchSafe<Asset[]>('/assets', []).then(setAssets));
            promises.push(fetchSafe<AssetCategory[]>('/asset-categories', []).then(setAssetCategories));
            promises.push(fetchSafe<Expense[]>('/expenses', []).then(setExpenses));
            promises.push(fetchSafe<AsientoManual[]>('/asientos-manuales', []).then(setAsientosManuales));

            // Para asociados y sus recibos:
            const asocsResponse = await fetchSafe<any>('/asociados?limit=1000', { data: [], total: 0 });
            const asocs = Array.isArray(asocsResponse) ? asocsResponse : (asocsResponse?.data || []);
            setAsociados(asocs);
            promises.push(fetchSafe<ReciboPagoAsociado[]>('/asociados/recibos', []).then(setRecibosPagoAsociados));

            await Promise.all(promises);
        } finally {
            setIsLoading(false);
        }
    }, [isAuthenticated, currentUser, fetchSafe]);

    useEffect(() => {
        if (!isAuthenticated) return;
        if (dataLoadedForUserRef.current === currentUser?.id || !currentUser) return;
        fetchData();
    }, [isAuthenticated, currentUser?.id, fetchData]);

    const handleGenericSave = async <T extends { id?: string; name?: string; }>(
        item: T, 
        endpoint: string, 
        stateSetter: React.Dispatch<React.SetStateAction<T[]>>,
        entityName: string
    ): Promise<T> => {
        const isUpdating = !!item.id;
        const method = isUpdating ? 'PUT' : 'POST';
        const url = isUpdating ? `${endpoint}/${item.id}` : endpoint;
        
        const payload = { ...item };
        if (!isUpdating) {
            delete payload.id;
        }

        try {
            const saved = await apiFetch<T>(url, { method, body: JSON.stringify(payload) });
            stateSetter(prev => isUpdating ? prev.map(i => (i as any).id === saved.id ? saved : i) : [saved, ...prev]);
            
            if (currentUser) {
                const action = isUpdating ? `ACTUALIZAR_${entityName}` : `CREAR_${entityName}`;
                const details = `${isUpdating ? 'Actualizó' : 'Creó'} ${entityName.toLowerCase()} ${(saved as any).name || (saved as any).nombre || (saved as any).placa || saved.id}`;
                logAction(currentUser, action, details, saved.id);
            }
            
            addToast({ 
                type: 'success', 
                title: `${isUpdating ? 'Actualizado' : 'Creado'}`, 
                message: `${entityName} guardado correctamente.` 
            });

            return saved;
        } catch (error: any) {
            addToast({ 
                type: 'error', 
                title: 'Error', 
                message: `No se pudo guardar ${entityName.toLowerCase()}: ${error.message}` 
            });
            throw error;
        }
    };

    return (
        <DataContext.Provider value={{
            invoices, clients, suppliers, vehicles, expenses, inventory, assets, assetCategories, 
            asociados, certificados, pagosAsociados, recibosPagoAsociados, remesas, asientosManuales, isLoading,
            handleSaveClient: (c) => handleGenericSave(c, '/clients', setClients, 'CLIENTE'),
            handleDeleteClient: async (id) => {
                try {
                    const item = clients.find(i => i.id === id);
                    await apiFetch(`/clients/${id}`, { method: 'DELETE' });
                    setClients(p => p.filter(i => i.id !== id));
                    if (currentUser && item) logAction(currentUser, 'ELIMINAR_CLIENTE', `Eliminó cliente ${item.name || item.id}`, id);
                    addToast({ type: 'success', title: 'Eliminado', message: 'Cliente eliminado correctamente.' });
                } catch (error: any) {
                    addToast({ type: 'error', title: 'Error', message: 'No se pudo eliminar el cliente.' });
                }
            },
            handleSaveSupplier: (s) => handleGenericSave(s, '/suppliers', setSuppliers, 'PROVEEDOR'),
            handleDeleteSupplier: async (id) => {
                try {
                    const item = suppliers.find(i => i.id === id);
                    await apiFetch(`/suppliers/${id}`, { method: 'DELETE' });
                    setSuppliers(p => p.filter(i => i.id !== id));
                    if (currentUser && item) logAction(currentUser, 'ELIMINAR_PROVEEDOR', `Eliminó proveedor ${item.name || item.id}`, id);
                    addToast({ type: 'success', title: 'Eliminado', message: 'Proveedor eliminado correctamente.' });
                } catch (error: any) {
                    addToast({ type: 'error', title: 'Error', message: 'No se pudo eliminar el proveedor.' });
                }
            },
            handleSaveInvoice: async (d) => {
                const inv = await apiFetch<Invoice>('/invoices', { method: 'POST', body: JSON.stringify(d) });
                setInvoices(p => [inv, ...p]);
                if (currentUser) logAction(currentUser, 'CREAR_FACTURA', `Creó factura ${inv.invoiceNumber}`, inv.id);
                return inv;
            },
            handleCreateCreditNote: async (id, r) => { 
                await apiFetch(`/invoices/${id}/credit-note`, { method: 'POST', body: JSON.stringify({ motivo: r }) });
                if (currentUser) logAction(currentUser, 'CREAR_NOTA_CREDITO', `Creó nota de crédito para factura ID ${id}`, id);
            },
            handleCreateDebitNote: async (id, r) => { 
                await apiFetch(`/invoices/${id}/debit-note`, { method: 'POST', body: JSON.stringify({ motivo: r }) });
                if (currentUser) logAction(currentUser, 'CREAR_NOTA_DEBITO', `Creó nota de débito para factura ID ${id}`, id);
            },
            handleUpdateInvoice: async (d) => {
                const inv = await apiFetch<Invoice>(`/invoices/${d.id}`, { method: 'PUT', body: JSON.stringify(d) });
                if (inv && inv.id) {
                    setInvoices(p => p.map(i => i.id === inv.id ? inv : i));
                    if (currentUser) logAction(currentUser, 'ACTUALIZAR_FACTURA', `Actualizó factura ${inv.invoiceNumber}`, inv.id);
                    return inv;
                }
                return null;
            },
            handleUpdateInvoiceStatuses: async (id, s) => {
                const current = invoices.find(i => i.id === id);
                const inv = await apiFetch<Invoice>(`/invoices/${id}`, { method: 'PUT', body: JSON.stringify({...current, ...s}) });
                setInvoices(p => p.map(i => i.id === id ? inv : i));
                if (currentUser) logAction(currentUser, 'ACTUALIZAR_ESTADO_FACTURA', `Actualizó estados de factura ${inv.invoiceNumber}`, id);
            },
            handleDeleteInvoice: async (id) => { 
                const item = invoices.find(i => i.id === id);
                await apiFetch(`/invoices/${id}`, { method: 'DELETE' }); 
                setInvoices(p => p.map(i => i.id === id ? {...i, status: 'Anulada'} : i));
                if (currentUser && item) logAction(currentUser, 'ANULAR_FACTURA', `Anuló factura ${item.invoiceNumber}`, id);
            },
            handleSaveVehicle: (v) => handleGenericSave(v, '/vehicles', setVehicles, 'VEHICULO'),
            handleDeleteVehicle: async (id) => {
                try {
                    const item = vehicles.find(i => i.id === id);
                    await apiFetch(`/vehicles/${id}`, { method: 'DELETE' });
                    setVehicles(p => p.filter(i => i.id !== id));
                    if (currentUser && item) logAction(currentUser, 'ELIMINAR_VEHICULO', `Eliminó vehículo ${item.placa}`, id);
                } catch (error: any) {
                    console.error('Error deleting vehicle:', error);
                    throw error;
                }
            },
            handleAssignToVehicle: async (ids, vId) => {
                const resp = await apiFetch<any>(`/vehicles/${vId}/assign-invoices`, { method: 'POST', body: JSON.stringify({invoiceIds: ids}) });
                let updatedInvoices = resp?.updatedInvoices;
                if (!updatedInvoices && Array.isArray(resp)) {
                    updatedInvoices = resp;
                }
                
                if (Array.isArray(updatedInvoices) && updatedInvoices.length > 0) {
                    const map = new Map(updatedInvoices.map(i => [i.id, i]));
                    setInvoices(p => p.map(i => map.get(i.id) || i));
                } else {
                    // Fallback: fetch all invoices to ensure sync
                    const allInvoices = await apiFetch<Invoice[]>('/invoices');
                    if (Array.isArray(allInvoices)) {
                        setInvoices(allInvoices);
                    }
                }
                if (currentUser) logAction(currentUser, 'ASIGNAR_VEHICULO', `Asignó ${ids.length} facturas al vehículo ID ${vId}`, vId);
            },
            handleUnassignInvoice: async (id) => {
                const inv = invoices.find(i => i.id === id);
                if (!inv) return;
                
                // Optimistic update for immediate UI feedback
                setInvoices(prev => prev.map(i => i.id === id ? { ...i, vehicleId: null, shippingStatus: 'Pendiente para Despacho' } : i));

                try {
                    const resp = await apiFetch<any>(`/vehicles/${inv.vehicleId}/unassign-invoice`, { method: 'POST', body: JSON.stringify({invoiceId: id}) });
                    
                    const updatedInvoice = resp?.updatedInvoice || (resp?.id ? resp : null);
                    
                    if (updatedInvoice) {
                        setInvoices(p => p.map(i => i.id === id ? updatedInvoice : i));
                    } else {
                        // Fallback: fetch all invoices to ensure sync
                        const allInvoices = await apiFetch<Invoice[]>('/invoices');
                        if (Array.isArray(allInvoices)) {
                            setInvoices(allInvoices);
                        }
                    }
                } catch (error) {
                    console.error("Error unassigning invoice:", error);
                    // Rollback on error
                    const allInvoices = await apiFetch<Invoice[]>('/invoices');
                    if (Array.isArray(allInvoices)) {
                        setInvoices(allInvoices);
                    }
                }
                
                if (currentUser) logAction(currentUser, 'DESASIGNAR_VEHICULO', `Desasignó factura ${id} del vehículo`, id);
            },
            handleDispatchVehicle: async (vId, invoiceIds, exchangeRate, asociadoId, cooperativeAmount) => {
                const resp = await apiFetch<{newRemesa: Remesa, updatedVehicle: Vehicle, updatedInvoices: Invoice[]}>(`/remesas`, { 
                    method: 'POST',
                    body: JSON.stringify({ 
                        vehicleId: vId, 
                        invoiceIds: invoiceIds,
                        exchangeRate: exchangeRate, 
                        asociadoId: asociadoId,
                        cooperativeAmount: cooperativeAmount
                    })
                });
                
                // Optimistic update to ensure invoices are marked as 'En Tránsito' immediately
                setInvoices(prev => prev.map(inv => 
                    invoiceIds.includes(inv.id) ? { ...inv, shippingStatus: 'En Tránsito' } : inv
                ));

                const [newVehicles, newRemesas, newInvoices] = await Promise.all([
                    fetchSafe<Vehicle[]>('/vehicles', []),
                    fetchSafe<Remesa[]>('/remesas', []),
                    fetchSafe<Invoice[]>('/invoices', [])
                ]);
                
                setVehicles(newVehicles);
                setRemesas(newRemesas);
                setInvoices(newInvoices);
                setInventory(deriveInventoryFromInvoices(newInvoices));
                
                if (currentUser) logAction(currentUser, 'DESPACHAR_VEHICULO', `Despachó vehículo ID ${vId} con ${invoiceIds.length} facturas`, vId);
                
                return resp.newRemesa || (resp as any);
            },
            handleSaveExpense: (e) => handleGenericSave(e, '/expenses', setExpenses, 'GASTO'),
            handleDeleteExpense: async (id) => {
                const item = expenses.find(i => i.id === id);
                await apiFetch(`/expenses/${id}`, { method: 'DELETE' });
                setExpenses(p => p.filter(i => i.id !== id));
                if (currentUser && item) logAction(currentUser, 'ELIMINAR_GASTO', `Eliminó gasto ${item.description}`, id);
            },
            handleSaveAsset: (a) => handleGenericSave(a, '/assets', setAssets, 'ACTIVO_FIJO'),
            handleDeleteAsset: async (id) => {
                const item = assets.find(i => i.id === id);
                await apiFetch(`/assets/${id}`, { method: 'DELETE' });
                setAssets(p => p.filter(i => i.id !== id));
                if (currentUser && item) logAction(currentUser, 'ELIMINAR_ACTIVO_FIJO', `Eliminó activo fijo ${item.name}`, id);
            },
            handleSaveAssetCategory: (c) => handleGenericSave(c, '/asset-categories', setAssetCategories, 'CATEGORIA_ACTIVO'),
            handleDeleteAssetCategory: async (id) => {
                const item = assetCategories.find(i => i.id === id);
                await apiFetch(`/asset-categories/${id}`, { method: 'DELETE' });
                setAssetCategories(p => p.filter(i => i.id !== id));
                if (currentUser && item) logAction(currentUser, 'ELIMINAR_CATEGORIA_ACTIVO', `Eliminó categoría de activo ${item.name}`, id);
            },
            handleSaveAsociado: (a) => handleGenericSave(a, '/asociados', setAsociados, 'ASOCIADO'),
            handleDeleteAsociado: async (id) => {
                try {
                    const item = asociados.find(i => i.id === id);
                    await apiFetch(`/asociados/${id}`, { method: 'DELETE' });
                    setAsociados(p => p.filter(i => i.id !== id));
                    if (currentUser && item) logAction(currentUser, 'ELIMINAR_ASOCIADO', `Eliminó asociado ${item.nombre}`, id);
                    addToast({ type: 'success', title: 'Eliminado', message: 'Asociado eliminado correctamente.' });
                } catch (error: any) {
                    addToast({ type: 'error', title: 'Error', message: 'No se pudo eliminar el asociado.' });
                }
            },
            handleSaveCertificado: async (c) => {
                const saved = await handleGenericSave(c, '/asociados/certificados', setCertificados, 'CERTIFICADO');
                addToast({ type: 'success', title: 'Certificado Guardado', message: 'El certificado se ha guardado correctamente.' });
                if (currentUser) logAction(currentUser, 'GUARDAR_CERTIFICADO', `Guardó certificado ${saved.codigo}`, saved.id);
            },
            handleDeleteCertificado: async (id) => {
                const item = certificados.find(i => i.id === id);
                await apiFetch(`/asociados/certificados/${id}`, { method: 'DELETE' });
                setCertificados(p => p.filter(i => i.id !== id));
                addToast({ type: 'success', title: 'Certificado Eliminado', message: 'El certificado ha sido eliminado.' });
                if (currentUser && item) logAction(currentUser, 'ELIMINAR_CERTIFICADO', `Eliminó certificado ${item.codigo}`, id);
            },
            handleSavePagoAsociado: (p) => handleGenericSave(p, '/asociados/pagos', setPagosAsociados, 'PAGO_ASOCIADO'),
            handleDeletePagoAsociado: async (id) => {
                try {
                    const item = pagosAsociados.find(i => i.id === id);
                    await apiFetch(`/asociados/pagos/${id}`, { method: 'DELETE' });
                    setPagosAsociados(p => p.filter(i => i.id !== id));
                    if (currentUser && item) logAction(currentUser, 'ELIMINAR_PAGO_ASOCIADO', `Eliminó pago de asociado ${item.concepto}`, id);
                    addToast({ type: 'success', title: 'Eliminado', message: 'Deuda eliminada correctamente.' });
                } catch (error: any) {
                    addToast({ type: 'error', title: 'Error', message: 'No se pudo eliminar la deuda.' });
                }
            },
            handleSaveRecibo: (r) => handleGenericSave(r, '/asociados/recibos', setRecibosPagoAsociados, 'RECIBO_PAGO'),
            handleDeleteRemesa: async (id) => {
                const item = remesas.find(i => i.id === id);
                if (!item) return;

                // Optimistic update: mark invoices as 'Pendiente para Despacho' immediately
                setInvoices(prev => prev.map(inv => 
                    item.invoiceIds.includes(inv.id) ? { ...inv, shippingStatus: 'Pendiente para Despacho' } : inv
                ));
                setRemesas(prev => prev.filter(r => r.id !== id));

                try {
                    await apiFetch(`/remesas/${id}`, { method: 'DELETE' });
                    
                    // Refetch to ensure total sync with backend
                    const [newVehicles, newRemesas, newInvoices] = await Promise.all([
                        fetchSafe<Vehicle[]>('/vehicles', []),
                        fetchSafe<Remesa[]>('/remesas', []),
                        fetchSafe<Invoice[]>('/invoices', [])
                    ]);
                    
                    setVehicles(newVehicles);
                    setRemesas(newRemesas);
                    setInvoices(newInvoices);
                    setInventory(deriveInventoryFromInvoices(newInvoices));
                    
                    if (currentUser) logAction(currentUser, 'ELIMINAR_REMESA', `Eliminó remesa ${item.remesaNumber}`, id);
                    addToast({ type: 'success', title: 'Remesa Eliminada', message: 'La remesa ha sido eliminada y las facturas están disponibles nuevamente.' });
                } catch (error) {
                    // Rollback on error
                    await fetchData();
                    addToast({ type: 'error', title: 'Error', message: 'No se pudo eliminar la remesa.' });
                }
            },
            handleSaveAsientoManual: async (a) => {
                const body = {
                    date: a.fecha,
                    description: a.descripcion,
                    entries: a.entries.map(e => ({
                        cuentaContableId: e.cuentaId,
                        debe: e.debe,
                        haber: e.haber
                    }))
                };
                const saved = await apiFetch<AsientoManual>('/asientos-manuales', { method: 'POST', body: JSON.stringify(body) });
                setAsientosManuales(p => [saved, ...p]);
                addToast({ type: 'success', title: 'Asiento Guardado', message: 'El asiento contable se sincronizó con el backend.' });
                if (currentUser) logAction(currentUser, 'CREAR_ASIENTO_CONTABLE', `Creó asiento contable manual: ${saved.descripcion}`, saved.id);
            },
            handleDeleteAsientoManual: async (id) => { 
                const item = asientosManuales.find(i => i.id === id);
                await apiFetch(`/asientos-manuales/${id}`, { method: 'DELETE' });
                setAsientosManuales(p => p.filter(a => a.id !== id)); 
                if (currentUser && item) logAction(currentUser, 'ELIMINAR_ASIENTO_CONTABLE', `Eliminó asiento contable manual ${id}`, id);
            },
            handleGenerateMassiveDebt: async (d) => { 
                const payload = { 
                    ...d, 
                    montoBs: (d as any).montoBs || (d as any).monto,
                    montoUsd: (d as any).montoUsd || ((d as any).monto / (d.tasaCambio || 1))
                };
                
                const resp = await apiFetch<any>('/asociados/deuda-masiva', { method: 'POST', body: JSON.stringify(payload) }); 
                
                let rawPayments: any[] = [];
                if (Array.isArray(resp)) {
                    rawPayments = resp;
                } else if (resp && resp.newPayments && Array.isArray(resp.newPayments)) {
                    rawPayments = resp.newPayments;
                } else if (resp && resp.data && Array.isArray(resp.data)) {
                    rawPayments = resp.data;
                }

                const newPayments: PagoAsociado[] = rawPayments.map(p => ({
                    id: String(p.id || p._id),
                    asociadoId: String(p.asociadoId || p.asociado_id),
                    concepto: p.concepto || payload.concepto,
                    cuotas: p.cuotas || payload.cuotas,
                    montoBs: Number(p.montoBs || p.monto_bs || p.monto || payload.montoBs),
                    montoUsd: Number(p.montoUsd || p.monto_usd || payload.montoUsd),
                    tasaCambio: Number(p.tasaCambio || p.tasa_cambio || payload.tasaCambio),
                    status: p.status || 'Pendiente',
                    reciboId: p.reciboId || p.recibo_id,
                    fecha: p.fecha || p.fecha_generacion || (payload as any).fecha || new Date().toISOString().split('T')[0]
                }));

                if (newPayments.length > 0) {
                    setPagosAsociados(prev => [...newPayments, ...prev]);
                } else {
                    await fetchData();
                }
                addToast({ type: 'success', title: 'Cargos Generados', message: `Se han generado cargos para ${d.asociadoIds?.length || 'los'} socios.` });
                if (currentUser) logAction(currentUser, 'GENERAR_DEUDA_MASIVA', `Generó deuda masiva para asociados`, 'N/A');
            },
            fetchAsociadoData: useCallback(async (asociadoId: string) => {
                const [debts, certs] = await Promise.all([
                    fetchSafe<PagoAsociado[]>(`/asociados/${asociadoId}/deudas`, []),
                    fetchSafe<Certificado[]>(`/asociados/${asociadoId}/certificados`, [])
                ]);
                setPagosAsociados(prev => [...prev.filter(p => p.asociadoId !== asociadoId), ...debts]);
                setCertificados(prev => [...prev.filter(c => !certs.find(cert => cert.id === c.id)), ...certs]);
            }, [fetchSafe])
        }}>
            {children}
        </DataContext.Provider>
    );
};

export const useData = () => {
    const context = useContext(DataContext);
    if (!context) throw new Error('useData must be used within a DataProvider');
    return context;
};
