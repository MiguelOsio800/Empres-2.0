
import React, { useState, useMemo } from 'react';
import { Invoice, Expense, Permissions, ExpenseCategory, Office, User, PaymentMethod, CompanyInfo, Supplier, AsientoManual } from '../../types';
import Card, { CardHeader, CardTitle } from '../ui/Card';
import Input from '../ui/Input';
import { BookOpenIcon, TagIcon, ArrowsRightLeftIcon } from '../icons/Icons';
import Select from '../ui/Select';
import LibroDiarioModal from './LibroDiarioModal';
import TransactionsModal from './TransactionsModal';
import ExpenseCategoryManagementModal from './ExpenseCategoryManagementModal';
import AccountingTile from './AccountingTile';
import LibroVentasModal from './LibroVentasModal';
import LibroDeComprasModal from './LibroDeComprasModal';
import LibroMayorModal from './LibroMayorModal';
import LibroAuxiliarModal from './LibroAuxiliarModal';
import { useConfig } from '../../contexts/ConfigContext';
import AsientoManualModal from './AsientoManualModal';


interface LibroContableViewProps {
    invoices: Invoice[];
    expenses: Expense[];
    expenseCategories: ExpenseCategory[];
    offices: Office[];
    paymentMethods: PaymentMethod[];
    companyInfo: CompanyInfo;
    suppliers: Supplier[];
    asientosManuales: AsientoManual[];
    onSaveExpense: (expense: Expense) => Promise<void>;
    onDeleteExpense: (expenseId: string) => Promise<void>;
    onSaveExpenseCategory: (category: ExpenseCategory) => Promise<void>;
    onDeleteExpenseCategory: (categoryId: string) => Promise<void>;
    onSaveAsientoManual: (asiento: AsientoManual) => Promise<void>;
    onDeleteAsientoManual: (asientoId: string) => Promise<void>;
    permissions: Permissions;
    currentUser: User;
}

export type Transaction = {
    id: string;
    date: string;
    description: string;
    type: 'Ingreso' | 'Gasto';
    amount: number;
    status?: string;
    originalDoc: Invoice | Expense;
};

const LibroContableView: React.FC<LibroContableViewProps> = (props) => {
    const { 
        invoices, expenses, expenseCategories, offices, paymentMethods, 
        companyInfo, suppliers, asientosManuales, 
        onSaveExpense, onDeleteExpense, onSaveExpenseCategory, onDeleteExpenseCategory, 
        onSaveAsientoManual, onDeleteAsientoManual, permissions, currentUser
    } = props;
    
    const { cuentasContables, roles } = useConfig();
    const [activeModal, setActiveModal] = useState<string | null>(null);
    
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');
    const [transactionType, setTransactionType] = useState('gastos'); // Default to 'gastos'

    const filteredTransactions = useMemo((): Transaction[] => {
        const startStr = startDate ? startDate.split('T')[0] : null;
        const endStr = endDate ? endDate.split('T')[0] : null;

        const incomeTransactions: Transaction[] = invoices
            .filter(inv => inv.status !== 'Anulada') 
            .map(inv => ({
                id: `inc-${inv.id}`,
                date: inv.date,
                description: `Ingreso por Factura N° ${inv.invoiceNumber}`,
                type: 'Ingreso',
                amount: inv.totalAmount,
                status: inv.status,
                originalDoc: inv,
            }));

        const expenseTransactions: Transaction[] = expenses.map(exp => ({
            id: `exp-${exp.id}`,
            date: exp.date,
            description: exp.description,
            type: 'Gasto',
            amount: exp.amount,
            status: exp.status,
            originalDoc: exp,
        }));

        let combined = [...incomeTransactions, ...expenseTransactions];

        combined = combined.filter(t => {
            const tDateStr = t.date.split('T')[0];
            if (startStr && tDateStr < startStr) return false;
            if (endStr && tDateStr > endStr) return false;
            return true;
        });
        
        let displayedTransactions = [...combined];
        if (transactionType === 'ingresos') {
            displayedTransactions = combined.filter(t => t.type === 'Ingreso');
        } else if (transactionType === 'gastos') {
            displayedTransactions = combined.filter(t => t.type === 'Gasto');
        }
        
        return displayedTransactions.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    }, [invoices, expenses, startDate, endDate, transactionType]);


    if (!permissions['libro-contable.view']) {
        return <Card><CardTitle>Acceso Denegado</CardTitle><p>No tienes permiso para ver esta sección.</p></Card>;
    }
    
    const handleCloseAllModals = () => {
        setActiveModal(null);
    }

    const filteredDateInvoices = useMemo(() => invoices.filter(t => {
        const tDateStr = t.date.split('T')[0];
        const startStr = startDate ? startDate.split('T')[0] : null;
        const endStr = endDate ? endDate.split('T')[0] : null;
        if (startStr && tDateStr < startStr) return false;
        if (endStr && tDateStr > endStr) return false;
        return true;
    }), [invoices, startDate, endDate]);
    
    const filteredDateExpenses = useMemo(() => expenses.filter(t => {
        const tDateStr = t.date.split('T')[0];
        const startStr = startDate ? startDate.split('T')[0] : null;
        const endStr = endDate ? endDate.split('T')[0] : null;
        if (startStr && tDateStr < startStr) return false;
        if (endStr && tDateStr > endStr) return false;
        return true;
    }), [expenses, startDate, endDate]);

    const filteredAsientosManuales = useMemo(() => asientosManuales.filter(a => {
        const aDateStr = a.fecha.split('T')[0];
        const startStr = startDate ? startDate.split('T')[0] : null;
        const endStr = endDate ? endDate.split('T')[0] : null;
        if (startStr && aDateStr < startStr) return false;
        if (endStr && aDateStr > endStr) return false;
        return true;
    }), [asientosManuales, startDate, endDate]);

    // CHECK FOR FULL ACCOUNTING ACCESS
    // Determine user role and name to guarantee full access for Accountant
    const userRole = roles.find(r => r.id === currentUser.roleId);
    const roleName = userRole?.name?.toLowerCase() || '';
    const username = currentUser.username.toLowerCase();

    // Check if user is explicitly an Accountant or Admin by ID, Role Name, or Username
    const isAccountantIdentity = 
        currentUser.roleId === 'role-accountant' || 
        roleName.includes('contador') || 
        roleName.includes('contable') ||
        roleName.includes('admin') ||
        username.includes('contador');

    const hasFullAccountingAccess = 
        permissions['plan-contable.view'] || 
        permissions['expenses.manage_all_offices'] ||
        isAccountantIdentity;

    if (!hasFullAccountingAccess) {
        // OPERATOR VIEW: Simplified Expenses Only
        return (
            <div className="space-y-6">
                <Card>
                    <CardHeader>
                        <CardTitle>Registro de Gastos Operativos</CardTitle>
                        <p className="text-sm text-gray-500">Gestione los gastos asociados a su oficina o caja chica.</p>
                    </CardHeader>
                    {/* Embedded Transactions Modal (View Only Mode mostly) */}
                    <TransactionsModal
                        isOpen={true} // Always "open" as embedded component
                        onClose={() => {}}
                        transactions={filteredTransactions.filter(t => t.type === 'Gasto')} // Force show only expenses
                        permissions={permissions}
                        onSaveExpense={onSaveExpense}
                        onDeleteExpense={onDeleteExpense}
                        expenseCategories={expenseCategories}
                        offices={offices}
                        paymentMethods={paymentMethods}
                        currentUser={currentUser}
                        companyInfo={companyInfo}
                        suppliers={suppliers}
                        embedded={true}
                    />
                </Card>
            </div>
        );
    }

    // FULL ACCOUNTING VIEW (Admin / Accountant / Tech)
    return (
        <div className="space-y-6">
             <Card>
                <CardHeader>
                    <CardTitle>Contabilidad General</CardTitle>
                     <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Filtros globales para libros y balances.</p>
                </CardHeader>
                <div className="flex flex-wrap items-end gap-4">
                    <div className="flex-grow">
                        <Input label="Desde" id="start-date" type="date" value={startDate} onChange={e => setStartDate(e.target.value)} />
                    </div>
                     <div className="flex-grow">
                        <Input label="Hasta" id="end-date" type="date" value={endDate} onChange={e => setEndDate(e.target.value)} />
                    </div>
                     <div className="flex-grow">
                        <Select label="Tipo de Transacción" id="type-filter" value={transactionType} onChange={e => setTransactionType(e.target.value)}>
                            <option value="todos">Todos</option>
                            <option value="ingresos">Solo Ingresos</option>
                            <option value="gastos">Solo Gastos</option>
                        </Select>
                    </div>
                </div>
            </Card>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                <AccountingTile
                    title="Transacciones"
                    description="Ver y gestionar ingresos y gastos."
                    icon={ArrowsRightLeftIcon}
                    onClick={() => setActiveModal('transactions')}
                    colorVariant="blue"
                />
                 <AccountingTile
                    title="Libro Diario"
                    description="Registro cronológico de asientos."
                    icon={BookOpenIcon}
                    onClick={() => setActiveModal('libroDiario')}
                    colorVariant="purple"
                />
                <AccountingTile
                    title="Libro Mayor"
                    description="Movimientos y saldos por cuenta."
                    icon={BookOpenIcon}
                    onClick={() => setActiveModal('libroMayor')}
                    colorVariant="blue"
                />
                <AccountingTile
                    title="Libro Auxiliar"
                    description="Detalle de movimientos por cuenta."
                    icon={BookOpenIcon}
                    onClick={() => setActiveModal('libroAuxiliar')}
                    colorVariant="purple"
                />
                <AccountingTile
                    title="Libro de Ventas"
                    description="Registro SENIAT de todas las ventas."
                    icon={BookOpenIcon}
                    onClick={() => setActiveModal('libroVentas')}
                    colorVariant="green"
                />
                 <AccountingTile
                    title="Libro de Compras"
                    description="Registro SENIAT de todas las compras."
                    icon={BookOpenIcon}
                    onClick={() => setActiveModal('libroCompras')}
                    colorVariant="orange"
                />
                 <AccountingTile
                    title="Categorías de Gastos"
                    description="Organizar y clasificar los gastos."
                    icon={TagIcon}
                    onClick={() => setActiveModal('expenseCategories')}
                    colorVariant="orange"
                />
            </div>

            {activeModal === 'transactions' && (
                <TransactionsModal
                    isOpen={activeModal === 'transactions'}
                    onClose={handleCloseAllModals}
                    transactions={filteredTransactions}
                    permissions={permissions}
                    onSaveExpense={onSaveExpense}
                    onDeleteExpense={onDeleteExpense}
                    expenseCategories={expenseCategories}
                    offices={offices}
                    paymentMethods={paymentMethods}
                    currentUser={currentUser}
                    companyInfo={companyInfo}
                    suppliers={suppliers}
                />
            )}
            
            {activeModal === 'expenseCategories' && (
                 <ExpenseCategoryManagementModal
                    isOpen={activeModal === 'expenseCategories'}
                    onClose={handleCloseAllModals}
                    expenseCategories={expenseCategories}
                    onSaveExpenseCategory={onSaveExpenseCategory}
                    onDeleteExpenseCategory={onDeleteExpenseCategory}
                    permissions={permissions}
                />
            )}

            {activeModal === 'libroMayor' && (
                <LibroMayorModal
                    isOpen={activeModal === 'libroMayor'}
                    onClose={handleCloseAllModals}
                    transactions={filteredTransactions}
                    asientosManuales={filteredAsientosManuales}
                    cuentasContables={cuentasContables}
                    companyInfo={companyInfo}
                    paymentMethods={paymentMethods}
                />
            )}

            {activeModal === 'libroAuxiliar' && (
                <LibroAuxiliarModal
                    isOpen={activeModal === 'libroAuxiliar'}
                    onClose={handleCloseAllModals}
                    transactions={filteredTransactions}
                    asientosManuales={filteredAsientosManuales}
                    cuentasContables={cuentasContables}
                    companyInfo={companyInfo}
                    paymentMethods={paymentMethods}
                />
            )}

            {activeModal === 'libroDiario' && (
                <LibroDiarioModal 
                    isOpen={activeModal === 'libroDiario'} 
                    onClose={handleCloseAllModals} 
                    transactions={filteredTransactions}
                    asientosManuales={filteredAsientosManuales}
                    cuentasContables={cuentasContables}
                    companyInfo={companyInfo}
                    paymentMethods={paymentMethods}
                />
            )}
            {activeModal === 'libroVentas' && (
                <LibroVentasModal
                    isOpen={activeModal === 'libroVentas'}
                    onClose={handleCloseAllModals}
                    invoices={filteredDateInvoices}
                    companyInfo={companyInfo}
                />
            )}
            {activeModal === 'libroCompras' && (
                 <LibroDeComprasModal
                    isOpen={activeModal === 'libroCompras'}
                    onClose={handleCloseAllModals}
                    expenses={filteredDateExpenses}
                />
            )}
        </div>
    );
};

export default LibroContableView;
