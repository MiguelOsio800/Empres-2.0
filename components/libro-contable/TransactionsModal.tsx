
import React, { useState, useMemo } from 'react';
import { Transaction } from './LibroContableView';
import { Permissions, Expense, ExpenseCategory, Office, User, PaymentMethod, CompanyInfo, Supplier, PaymentStatus, ShippingStatus } from '../../types';
import Modal from '../ui/Modal';
import Button from '../ui/Button';
import { FileSpreadsheetIcon } from '../icons/Icons';
import usePagination from '../../hooks/usePagination';
import PaginationControls from '../ui/PaginationControls';
import { exportToExcel as utilsExportToExcel } from '../../utils/exportUtils';
import { useConfirm } from '../../contexts/ConfirmationContext';

const formatCurrency = (amount: number) => `Bs. ${amount.toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

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

const expenseStatusColors: { [key: string]: string } = {
    'Pagado': 'bg-green-100 dark:bg-green-900/50 text-green-800 dark:text-green-300',
    'Pendiente': 'bg-yellow-100 dark:bg-yellow-900/50 text-yellow-800 dark:text-yellow-300',
};

const ITEMS_PER_PAGE = 7;

interface TransactionsModalProps {
    isOpen: boolean;
    onClose: () => void;
    transactions: Transaction[];
    permissions: Permissions;
    onSaveExpense: (expense: Expense) => Promise<void>;
    onDeleteExpense: (expenseId: string) => Promise<void>;
    expenseCategories: ExpenseCategory[];
    offices: Office[];
    paymentMethods: PaymentMethod[];
    currentUser: User;
    companyInfo: CompanyInfo;
    suppliers: Supplier[];
    embedded?: boolean; // New prop to allow rendering without Modal wrapper
}

const TransactionsModal: React.FC<TransactionsModalProps> = ({ 
    isOpen, onClose, transactions, permissions, onSaveExpense, onDeleteExpense, 
    expenseCategories, offices, paymentMethods, currentUser, companyInfo, suppliers, embedded = false 
}) => {
    const { confirm } = useConfirm();
    const { 
        paginatedData, 
        currentPage, 
        totalPages, 
        setCurrentPage, 
        totalItems
    } = usePagination(transactions, ITEMS_PER_PAGE);

    const totals = useMemo(() => {
        return transactions.reduce((acc, t) => {
            if (t.type === 'Ingreso') {
                acc.income += t.amount;
            } else {
                acc.expense += t.amount;
            }
            return acc;
        }, { income: 0, expense: 0 });
    }, [transactions]);

    const exportToExcel = () => {
        const data = transactions.map(t => ({
            Fecha: t.date,
            Descripción: t.description,
            Ingreso: t.type === 'Ingreso' ? t.amount : 0,
            Gasto: t.type === 'Gasto' ? t.amount : 0
        }));

        data.push({
            Fecha: 'TOTALES',
            Descripción: `TOTAL NETO: ${totals.income - totals.expense}`,
            Ingreso: totals.income,
            Gasto: totals.expense
        });

        utilsExportToExcel(data, 'Libro_Transacciones');
    };
    
    const getStatusBadge = (t: Transaction) => {
        if (t.type === 'Ingreso') {
            const invoice = t.originalDoc as any;
            return (
                <div className="flex flex-col items-center gap-1">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${paymentStatusColors[invoice.paymentStatus]}`}>
                        {invoice.paymentStatus}
                    </span>
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${shippingStatusColors[invoice.shippingStatus] || 'bg-gray-100'}`}>
                        {invoice.shippingStatus}
                    </span>
                </div>
            );
        }
        if (t.type === 'Gasto' && t.status) {
            return (
                 <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${expenseStatusColors[t.status]}`}>
                    {t.status}
                </span>
            );
        }
        return null;
    };

    const Content = (
        <>
                <div className="flex justify-between mb-4">
                    <h3 className="text-lg font-medium leading-6 text-gray-900 dark:text-white">Transacciones (Ingresos y Gastos)</h3>
                    <Button onClick={exportToExcel} variant="secondary">
                        <FileSpreadsheetIcon className="w-4 h-4 mr-2" /> Exportar a Excel
                    </Button>
                </div>
                <div className="overflow-x-auto max-h-[60vh]">
                    <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                        <thead className="bg-gray-50 dark:bg-gray-700/50 sticky top-0">
                            <tr>
                                <th className="px-6 py-3 text-left text-xs font-medium text-black uppercase">Fecha</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-black uppercase">Descripción</th>
                                <th className="px-6 py-3 text-right text-xs font-medium text-black uppercase">Ingreso</th>
                                <th className="px-6 py-3 text-right text-xs font-medium text-black uppercase">Gasto</th>
                            </tr>
                        </thead>
                        <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700 text-black">
                            {paginatedData.map(t => (
                                <tr key={t.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-black">{t.date}</td>
                                    <td className="px-6 py-4 text-sm text-black">{t.description}</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-right font-semibold text-sm text-green-600">
                                        {t.type === 'Ingreso' ? formatCurrency(t.amount) : ''}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-right font-semibold text-sm text-red-600">
                                        {t.type === 'Gasto' ? formatCurrency(t.amount) : ''}
                                    </td>
                                </tr>
                            ))}
                                {paginatedData.length === 0 && (
                                <tr><td colSpan={4} className="px-6 py-12 text-center text-gray-500">No hay transacciones para mostrar.</td></tr>
                                )}
                        </tbody>
                        <tfoot className="bg-gray-50 dark:bg-gray-700/50 font-semibold text-black">
                            <tr>
                                <td className="px-6 py-3 text-left text-sm text-black" colSpan={2}>
                                    TOTAL NETO (Ingresos - Gastos): <span className={totals.income - totals.expense >= 0 ? 'text-green-600' : 'text-red-600'}>{formatCurrency(totals.income - totals.expense)}</span>
                                </td>
                                <td className="px-6 py-3 text-right text-sm text-green-600">
                                    {formatCurrency(totals.income)}
                                </td>
                                <td className="px-6 py-3 text-right text-sm text-red-600">
                                    {formatCurrency(totals.expense)}
                                </td>
                            </tr>
                        </tfoot>
                    </table>
                </div>
                <PaginationControls
                currentPage={currentPage}
                totalPages={totalPages}
                onPageChange={setCurrentPage}
                totalItems={totalItems}
                itemsPerPage={ITEMS_PER_PAGE}
            />
        </>
    );

    if (embedded) {
        return Content;
    }

    return (
        <Modal isOpen={isOpen} onClose={onClose} title="Libro de Transacciones" size="4xl">
            {Content}
        </Modal>
    );
};

export default TransactionsModal;
