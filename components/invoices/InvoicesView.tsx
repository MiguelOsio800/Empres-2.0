
import React, { useState, useMemo, useEffect } from 'react';
import { Invoice, CompanyInfo, Permissions, Client, Category, PaymentStatus, ShippingStatus, MasterStatus, Office } from '../../types';
import Card, { CardHeader, CardTitle } from '../ui/Card';
import Button from '../ui/Button';
import Input from '../ui/Input';
import InvoiceDetailView from './InvoiceDetailView';
import { EditIcon, SearchIcon, ArchiveBoxIcon, ArrowsRightLeftIcon, TrashIcon } from '../icons/Icons';
import Select from '../ui/Select';
import usePagination from '../../hooks/usePagination';
import PaginationControls from '../ui/PaginationControls';
import { useData } from '../../contexts/DataContext';
import QuickStatusModal from './QuickStatusModal';
import ClientFilterAutocomplete from './ClientFilterAutocomplete';
import { useConfirm } from '../../contexts/ConfirmationContext';
import { useAuth } from '../../contexts/AuthContext';

const paymentStatusOptions: PaymentStatus[] = ['Pendiente', 'Pagada'];
const shippingStatusOptions: ShippingStatus[] = ['Pendiente para Despacho', 'En Tránsito', 'En Oficina Destino', 'Entregada'];

const paymentStatusColors: { [key in PaymentStatus]: string } = {
    'Pagada': 'bg-green-100 dark:bg-green-900/50 text-green-800 dark:text-green-300',
    'Pendiente': 'bg-yellow-100 dark:bg-yellow-900/50 text-yellow-800 dark:text-yellow-300',
};
const shippingStatusColors: { [key in ShippingStatus]: string } = {
    'Pendiente para Despacho': 'bg-gray-200 text-gray-800 dark:bg-gray-600 dark:text-gray-200',
    'En Tránsito': 'bg-blue-100 dark:bg-blue-900/50 text-blue-800 dark:text-blue-300',
    'En Oficina Destino': 'bg-indigo-100 dark:bg-indigo-900/50 text-indigo-800 dark:text-indigo-300',
    'Entregada': 'bg-purple-100 dark:bg-purple-900/50 text-purple-800 dark:text-purple-300',
    'Reportada Falta': 'bg-red-100 dark:bg-red-900/50 text-red-800 dark:text-red-300',
};

interface InvoicesViewProps {
    invoices: Invoice[];
    clients: Client[];
    categories: Category[];
    userPermissions: Permissions;
    onUpdateStatuses: (invoiceId: string, newStatuses: { paymentStatus?: PaymentStatus, shippingStatus?: ShippingStatus, status?: MasterStatus }) => Promise<void>;
    onDeleteInvoice: (invoiceId: string) => Promise<void>;
    companyInfo: CompanyInfo;
    initialFilter?: { type: string; value: string } | null;
    offices: Office[];
}

const ITEMS_PER_PAGE = 7;

const InvoicesView: React.FC<InvoicesViewProps> = ({ invoices, clients, categories, userPermissions, onUpdateStatuses, onDeleteInvoice, companyInfo, initialFilter, offices }) => {
    const { currentUser, hasGlobalAccess } = useAuth();
    const { handleCreateCreditNote, handleCreateDebitNote } = useData();
    const { confirm } = useConfirm();
    const [isModalOpen, setIsModalOpen] = useState(false);
    
    const [isQuickStatusModalOpen, setIsQuickStatusModalOpen] = useState(false);
    const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);

    // Filter state
    const [searchTerm, setSearchTerm] = useState('');
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');
    const [paymentStatusFilter, setPaymentStatusFilter] = useState('');
    const [shippingStatusFilter, setShippingStatusFilter] = useState('');
    const [clientFilter, setClientFilter] = useState('');
    const [receiverFilter, setReceiverFilter] = useState('');

    const filteredInvoices = useMemo(() => {
        return invoices.filter(invoice => {
            const invoiceDateStr = invoice.date.split('T')[0];
            const startStr = startDate ? startDate.split('T')[0] : null;
            const endStr = endDate ? endDate.split('T')[0] : null;

            if (startStr && invoiceDateStr < startStr) return false;
            if (endStr && invoiceDateStr > endStr) return false;
            if (paymentStatusFilter && invoice.paymentStatus !== paymentStatusFilter) return false;
            if (shippingStatusFilter && invoice.shippingStatus !== shippingStatusFilter) return false;
            if (clientFilter && invoice.clientIdNumber !== clientFilter) return false;
            if (receiverFilter && invoice.guide?.receiver?.idNumber !== receiverFilter) return false;
            if (searchTerm && !(
                (invoice.invoiceNumber || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
                (invoice.clientName || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
                (invoice.guide?.receiver?.name || '').toLowerCase().includes(searchTerm.toLowerCase())
            )) return false;

            return true;
        });
    }, [invoices, searchTerm, startDate, endDate, paymentStatusFilter, shippingStatusFilter, clientFilter, receiverFilter]);
    
    const { 
        paginatedData, 
        currentPage, 
        totalPages, 
        setCurrentPage, 
        totalItems
    } = usePagination(filteredInvoices, ITEMS_PER_PAGE);

     useEffect(() => {
        if (initialFilter) {
            if (initialFilter.type === 'shippingStatus') {
                setShippingStatusFilter(initialFilter.value);
            }
            if (initialFilter.type === 'paymentStatus') {
                setPaymentStatusFilter(initialFilter.value);
            }
            setCurrentPage(1);
        }
    }, [initialFilter, setCurrentPage]);

    const totals = useMemo(() => {
        return filteredInvoices.reduce((acc, inv) => {
            if (inv.status !== 'Anulada') {
                acc.totalAmount += inv.totalAmount;
            }
            return acc;
        }, { totalAmount: 0 });
    }, [filteredInvoices]);

    const openModal = (invoice: Invoice) => {
        setSelectedInvoice(invoice);
        setIsModalOpen(true);
    };

    const openQuickStatusModal = (invoice: Invoice) => {
        setSelectedInvoice(invoice);
        setIsQuickStatusModalOpen(true);
    }

    const closeModal = () => {
        setIsModalOpen(false);
        setIsQuickStatusModalOpen(false);
        setSelectedInvoice(null);
    };

    const handleEdit = (invoiceId: string) => {
        window.location.hash = `edit-invoice/${invoiceId}`;
    }

    const formatCurrency = (amount: number) => `Bs. ${amount.toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    const formatInvoiceNumber = (num: string) => num.startsWith('F-') ? num : `F-${num}`;

    const handleVoidClick = async (invoiceId: string) => {
        const isConfirmed = await confirm({
            title: 'Anular Factura',
            message: '¿Está seguro de que desea anular esta factura? Esta acción afectará el libro de ventas y no se puede deshacer.',
            confirmText: 'Anular Factura',
            variant: 'danger'
        });

        if (isConfirmed) {
            await onDeleteInvoice(invoiceId);
        }
    };

    return (
        <div className="space-y-6">
            <Card>
                <CardHeader>
                    <div className="flex justify-between items-center flex-wrap gap-4">
                        <CardTitle>Listado de Facturas</CardTitle>
                    </div>
                    <div className="mt-4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 items-end">
                         <Input label="Buscar" id="search" placeholder="Por N° o Cliente..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} icon={<SearchIcon className="w-4 h-4 text-gray-400"/>} />
                         <Input label="Desde" type="date" id="start-date" value={startDate} onChange={e => setStartDate(e.target.value)} />
                         <Input label="Hasta" type="date" id="end-date" value={endDate} onChange={e => setEndDate(e.target.value)} />
                        <ClientFilterAutocomplete
                            label="Remitente / Cliente"
                            id="client-filter"
                            clients={clients}
                            value={clientFilter}
                            onChange={setClientFilter}
                        />
                        <ClientFilterAutocomplete
                            label="Destinatario"
                            id="receiver-filter"
                            clients={clients}
                            value={receiverFilter}
                            onChange={setReceiverFilter}
                        />
                        <Select label="Estado de Pago" id="payment-status-filter" value={paymentStatusFilter} onChange={e => setPaymentStatusFilter(e.target.value)}>
                            <option value="">Todos</option>
                            {paymentStatusOptions.map(s => <option key={s} value={s}>{s}</option>)}
                        </Select>
                        <Select label="Estado de Envío" id="shipping-status-filter" value={shippingStatusFilter} onChange={e => setShippingStatusFilter(e.target.value)}>
                            <option value="">Todos</option>
                            {shippingStatusOptions.map(s => <option key={s} value={s}>{s}</option>)}
                        </Select>
                    </div>
                </CardHeader>
                <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                        <thead className="bg-gray-50 dark:bg-gray-700/50">
                            <tr>
                                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">N° Factura</th>
                                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Fecha</th>
                                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Cliente</th>
                                {hasGlobalAccess && (
                                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Oficina</th>
                                )}
                                <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Monto Total</th>
                                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Estado Pago</th>
                                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Estado Envío</th>
                                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Remesa</th>
                                <th scope="col" className="relative px-6 py-3"><span className="sr-only">Acciones</span></th>
                            </tr>
                        </thead>
                        <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                            {paginatedData.map((invoice) => (
                                <tr key={invoice.id} className={`hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors ${invoice.status === 'Anulada' ? 'bg-red-50 dark:bg-red-900/20 opacity-60' : ''}`}>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-primary-600 dark:text-primary-400 cursor-pointer" onClick={() => openModal(invoice)}>{formatInvoiceNumber(invoice.invoiceNumber)}</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-300">{invoice.date}</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-300">{invoice.clientName}</td>
                                    {hasGlobalAccess && (
                                        <td className="px-6 py-4 whitespace-nowrap text-sm">
                                            <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200 border border-gray-200 dark:border-gray-600">
                                                {invoice.Office?.name || 'Oficina Principal'}
                                            </span>
                                        </td>
                                    )}
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-800 dark:text-gray-200 font-semibold text-right">{formatCurrency(invoice.totalAmount)}</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${paymentStatusColors[invoice.paymentStatus]}`}>
                                            {invoice.paymentStatus}
                                        </span>
                                    </td>
                                     <td className="px-6 py-4 whitespace-nowrap text-sm">
                                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${shippingStatusColors[invoice.shippingStatus] || 'bg-gray-100'}`}>
                                            {invoice.shippingStatus}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                                        {invoice.remesaId ? (
                                            <div className="relative group inline-block">
                                                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900/50 dark:text-blue-300 cursor-help">
                                                    Remesada
                                                </span>
                                                <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 hidden group-hover:block w-max bg-gray-900 text-white text-xs rounded py-1 px-2 z-10 shadow-lg">
                                                    N°: {invoice.Remesa?.remesaNumber || 'N/A'}<br/>
                                                    Fecha: {invoice.Remesa?.date || 'N/A'}
                                                </div>
                                            </div>
                                        ) : (
                                            <span className="text-gray-400 dark:text-gray-600">-</span>
                                        )}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium space-x-2">
                                        {userPermissions['invoices.changeStatus'] && invoice.status === 'Activa' && (
                                            <Button variant="secondary" size="sm" onClick={() => openQuickStatusModal(invoice)} title="Cambio Rápido de Estado">
                                                <ArrowsRightLeftIcon className="w-4 h-4" />
                                            </Button>
                                        )}
                                        
                                        <Button variant="secondary" size="sm" onClick={() => openModal(invoice)} title="Ver Detalles Completa">Detalles</Button>
                                        
                                        <Button variant="secondary" size="sm" onClick={() => window.location.hash = `inventario-envios/${invoice.id}`} title="Ver en Inventario">
                                            <ArchiveBoxIcon className="w-4 h-4" />
                                        </Button>
                                        {userPermissions['invoices.edit'] && invoice.status === 'Activa' && (
                                            <Button variant="secondary" size="sm" onClick={() => handleEdit(invoice.id)}><EditIcon className="w-4 h-4" /></Button>
                                        )}
                                        {userPermissions['invoices.void'] && invoice.status === 'Activa' && (
                                            <Button 
                                                variant="danger" 
                                                size="sm" 
                                                onClick={() => handleVoidClick(invoice.id)}
                                            >
                                                Anular
                                            </Button>
                                        )}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                        <tfoot className="bg-gray-50 dark:bg-gray-700/50 font-semibold">
                            <tr>
                                <td className="px-6 py-3 text-left text-sm text-gray-900 dark:text-gray-100" colSpan={hasGlobalAccess ? 4 : 3}>
                                    Total de Facturas (Filtrados): {totalItems}
                                </td>
                                <td className="px-6 py-3 text-right text-sm text-gray-900 dark:text-gray-100">
                                    {formatCurrency(totals.totalAmount)}
                                </td>
                                <td className="px-6 py-3" colSpan={4}></td>
                            </tr>
                        </tfoot>
                    </table>
                     {paginatedData.length === 0 && (
                        <p className="text-center py-10 text-gray-500 dark:text-gray-400">No se encontraron facturas con los filtros aplicados.</p>
                    )}
                </div>
                <PaginationControls
                    currentPage={currentPage}
                    totalPages={totalPages}
                    onPageChange={setCurrentPage}
                    totalItems={totalItems}
                    itemsPerPage={ITEMS_PER_PAGE}
                />
            </Card>

            {selectedInvoice && (
                <InvoiceDetailView 
                    isOpen={isModalOpen} 
                    onClose={closeModal} 
                    invoice={selectedInvoice} 
                    companyInfo={companyInfo} 
                    clients={clients} 
                    categories={categories}
                    offices={offices}
                    onCreateCreditNote={handleCreateCreditNote}
                    onCreateDebitNote={handleCreateDebitNote}
                    permissions={userPermissions}
                />
            )}

            {selectedInvoice && isQuickStatusModalOpen && (
                <QuickStatusModal
                    isOpen={isQuickStatusModalOpen}
                    onClose={closeModal}
                    invoice={selectedInvoice}
                    onUpdate={onUpdateStatuses}
                />
            )}
        </div>
    );
};

export default InvoicesView;
