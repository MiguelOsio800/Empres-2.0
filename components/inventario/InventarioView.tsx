import React, { useMemo, useState } from 'react';
import { InventoryItem, Permissions, ShippingStatus, User, Office } from '../../types';
import Card, { CardHeader, CardTitle } from '../ui/Card';
import Button from '../ui/Button';
import { ArrowLeftIcon } from '../icons/Icons';
import usePagination from '../../hooks/usePagination';
import PaginationControls from '../ui/PaginationControls';
import Select from '../ui/Select';

const statusColors: { [key in ShippingStatus]: string } = {
    'Pendiente para Despacho': 'bg-gray-200 text-gray-800 dark:bg-gray-600 dark:text-gray-200',
    'En Tránsito': 'bg-blue-100 dark:bg-blue-900/50 text-blue-800 dark:text-blue-300',
    'Entregada': 'bg-purple-100 dark:bg-purple-900/50 text-purple-800 dark:text-purple-300',
    'En Oficina Destino': 'bg-indigo-100 dark:bg-indigo-900/50 text-indigo-800 dark:text-indigo-300',
    'Reportada Falta': 'bg-red-100 dark:bg-red-900/50 text-red-800 dark:text-red-300',
};

const ITEMS_PER_PAGE = 15;

interface InventarioViewProps {
    items: InventoryItem[];
    permissions: Permissions;
    filter?: string | null;
    currentUser: User;
    offices: Office[];
}

const InventarioView: React.FC<InventarioViewProps> = ({ items, permissions, filter, currentUser, offices }) => {
    
    const canManageAllOffices = ['role-admin', 'role-tecnologia', 'role-soporte'].includes(currentUser.roleId);
    const [selectedOfficeId, setSelectedOfficeId] = useState<string>('');

    const filteredItems = useMemo(() => {
        // Filter out items that are no longer considered active in inventory
        let activeItems = items.filter(item => 
            item.shippingStatus !== 'Entregada'
        );

        if (!canManageAllOffices) {
            activeItems = activeItems.filter(item => item.officeId === currentUser.officeId);
        } else if (selectedOfficeId) {
            activeItems = activeItems.filter(item => item.officeId === selectedOfficeId);
        }

        const sortedItems = [...activeItems].sort((a, b) => {
            if (a.invoiceNumber && !b.invoiceNumber) return -1;
            if (!a.invoiceNumber && b.invoiceNumber) return 1;
            return (a.name || '').localeCompare(b.name || '');
        });

        if (!filter) return sortedItems;
        return sortedItems.filter(item => item.invoiceId === filter);
    }, [items, filter, canManageAllOffices, currentUser.officeId, selectedOfficeId]);

    const { 
        paginatedData, 
        currentPage, 
        totalPages, 
        setCurrentPage,
        totalItems
    } = usePagination(filteredItems, ITEMS_PER_PAGE);

    const totals = useMemo(() => {
        return filteredItems.reduce((acc, item) => {
            acc.packages += item.stock || 0;
            acc.weight += item.weight || 0;
            return acc;
        }, { packages: 0, weight: 0 });
    }, [filteredItems]);


    if (!permissions['inventario-envios.view']) {
        return (
            <Card>
                <CardTitle>Acceso Denegado</CardTitle>
                <p>No tienes permiso para ver esta sección.</p>
            </Card>
        );
    }

    return (
        <div className="space-y-6">
            <div className="mb-4">
                <Button variant="secondary" onClick={() => window.location.hash = 'inventario'}>
                    <ArrowLeftIcon className="w-4 h-4 mr-2" />
                    Volver a Inventario
                </Button>
            </div>
            <Card>
                <CardHeader>
                    <div className="flex flex-wrap justify-between items-center gap-4">
                        <CardTitle>{filter ? `Inventario para la Factura ${items.find(i => i.invoiceId === filter)?.invoiceNumber}` : 'Inventario de Envíos (Cargas)'}</CardTitle>
                        {canManageAllOffices && !filter && (
                            <div className="w-64">
                                <Select
                                    label="Filtrar por Oficina"
                                    value={selectedOfficeId}
                                    onChange={e => setSelectedOfficeId(e.target.value)}
                                >
                                    <option value="">Todas las Oficinas</option>
                                    {offices.map(o => (
                                        <option key={o.id} value={o.id}>{o.name}</option>
                                    ))}
                                </Select>
                            </div>
                        )}
                    </div>
                     <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Este inventario se genera automáticamente al crear una factura. No se pueden añadir ni eliminar artículos manualmente desde aquí.</p>
                </CardHeader>
                <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                        <thead className="bg-gray-50 dark:bg-gray-700/50">
                            <tr>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Artículo</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Factura</th>
                                {canManageAllOffices && (
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Oficina</th>
                                )}
                                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Paquetes</th>
                                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Peso (Kg)</th>
                                <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Estado Envío</th>
                            </tr>
                        </thead>
                        <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                            {paginatedData.map(item => (
                                <tr key={item.id} className={`hover:bg-gray-50 dark:hover:bg-gray-700/50`}>
                                    <td className="px-6 py-4 whitespace-normal align-top">
                                        <div className="font-semibold text-gray-900 dark:text-gray-100">{item.name}</div>
                                        <div className="font-mono text-xs text-gray-500 dark:text-gray-400">{item.sku}</div>
                                        {item.description && <div className="text-xs text-gray-500 dark:text-gray-400 mt-1 italic">{item.description}</div>}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap align-top font-mono text-sm text-primary-600 dark:text-primary-400">{item.invoiceNumber || 'Manual'}</td>
                                    {canManageAllOffices && (
                                        <td className="px-6 py-4 whitespace-nowrap align-top text-sm text-gray-500 dark:text-gray-400">
                                            {offices.find(o => o.id === item.officeId)?.name || 'N/A'}
                                        </td>
                                    )}
                                    <td className="px-6 py-4 whitespace-nowrap align-top text-right font-bold text-lg text-gray-900 dark:text-gray-100">{item.stock}</td>
                                    <td className="px-6 py-4 whitespace-nowrap align-top text-right text-sm text-gray-600 dark:text-gray-400">{item.weight?.toFixed(2) ?? 'N/A'}</td>
                                    <td className="px-6 py-4 whitespace-nowrap align-top text-center">
                                        {item.shippingStatus && <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${statusColors[item.shippingStatus]}`}>{item.shippingStatus}</span>}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                        <tfoot className="bg-gray-50 dark:bg-gray-700/50 font-semibold">
                            <tr>
                                <td className="px-6 py-3 text-left text-sm text-gray-900 dark:text-gray-100" colSpan={canManageAllOffices ? 3 : 2}>
                                    TOTALES ({totalItems} items)
                                </td>
                                <td className="px-6 py-3 text-right text-sm text-gray-900 dark:text-gray-100">
                                    {totals.packages} Paquetes
                                </td>
                                <td className="px-6 py-3 text-right text-sm text-gray-900 dark:text-gray-100">
                                    {totals.weight.toFixed(2)} Kg
                                </td>
                                <td className="px-6 py-3"></td>
                            </tr>
                        </tfoot>
                    </table>
                     {paginatedData.length === 0 && <p className="text-center py-10 text-gray-500">No hay envíos que coincidan con su búsqueda.</p>}
                </div>
                 <PaginationControls
                    currentPage={currentPage}
                    totalPages={totalPages}
                    onPageChange={setCurrentPage}
                    totalItems={totalItems}
                    itemsPerPage={ITEMS_PER_PAGE}
                />
            </Card>
        </div>
    );
};

export default InventarioView;