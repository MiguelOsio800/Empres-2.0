import React, { useState } from 'react';
import { Expense, Supplier, ExpenseCategory, Office, PaymentMethod, User } from '../../types';
import Card, { CardHeader, CardTitle } from '../ui/Card';
import Button from '../ui/Button';
import { TrashIcon, PlusIcon } from '../icons/Icons';
import Input from '../ui/Input';
import Select from '../ui/Select';
import { useToast } from '../ui/ToastProvider';

interface GastosViewProps {
    expenses: Expense[];
    suppliers: Supplier[];
    expenseCategories: ExpenseCategory[];
    offices: Office[];
    paymentMethods: PaymentMethod[];
    currentUser: User;
    permissions: Record<string, boolean>;
    onSaveExpense: (expense: Expense) => Promise<void>;
    onDeleteExpense: (expenseId: string) => Promise<void>;
}

const GastosView: React.FC<GastosViewProps> = ({ expenses, suppliers, expenseCategories, offices, paymentMethods, currentUser, permissions, onSaveExpense, onDeleteExpense }) => {
    // We will keep a local state for the "new" expenses being drafted.
    // The previously saved expenses will be listed below, or just have a single dynamic list?
    // "El modulo de gastos va a funcionar como un crud, pero va a ser con el diseño de captura de pantalla... un crud que solo me permita escoger el proveedor la categoria del gasto y los datos de cuanto fue"
    // So basically a dynamic list of new expenses to be saved.
    
    const [draftExpenses, setDraftExpenses] = useState<Partial<Expense>[]>([{ id: 'draft-1', date: new Date(Date.now() - new Date().getTimezoneOffset() * 60000).toISOString().split('T')[0], officeId: currentUser.officeId || offices[0]?.id || '' }]);
    const { showToast } = useToast();

    const handleAddRow = () => {
        setDraftExpenses([...draftExpenses, { id: `draft-${Date.now()}`, date: new Date(Date.now() - new Date().getTimezoneOffset() * 60000).toISOString().split('T')[0], officeId: currentUser.officeId || offices[0]?.id || '' }]);
    };

    const handleRemoveRow = (id: string) => {
        setDraftExpenses(draftExpenses.filter(e => e.id !== id));
    };

    const handleChange = (id: string, field: keyof Expense, value: any) => {
        setDraftExpenses(draftExpenses.map(e => e.id === id ? { ...e, [field]: value } : e));
    };

    const handleSaveAll = async () => {
        try {
            for (const draft of draftExpenses) {
                if (draft.supplierId && draft.categoryId && draft.amount && draft.amount > 0 && draft.description) {
                    const newId = draft.id?.startsWith('draft-') ? '' : draft.id;
                    const fullExpense: Expense = {
                        id: newId!,
                        amount: draft.amount,
                        currency: 'Bs',
                        date: draft.date || new Date(Date.now() - new Date().getTimezoneOffset() * 60000).toISOString(),
                        supplierId: draft.supplierId,
                        supplierName: suppliers.find(s => s.id === draft.supplierId)?.name || '',
                        categoryId: draft.categoryId,
                        category: expenseCategories.find(c => c.id === draft.categoryId)?.name || '',
                        description: draft.description,
                        officeId: draft.officeId || currentUser.officeId || offices[0]?.id || '',
                        paymentMethodId: paymentMethods[0]?.id || '', 
                        status: 'Pagado',
                        createdAt: new Date(Date.now() - new Date().getTimezoneOffset() * 60000).toISOString()
                    };
                    await onSaveExpense(fullExpense);
                }
            }
            setDraftExpenses([{ id: `draft-${Date.now()}`, date: new Date(Date.now() - new Date().getTimezoneOffset() * 60000).toISOString().split('T')[0], officeId: currentUser.officeId || offices[0]?.id || '' }]);
            showToast('Gastos guardados exitosamente', 'success');
        } catch (error: any) {
            showToast('Error al guardar gastos: ' + error.message, 'error');
        }
    };

    const handleDeleteSaved = async (id: string) => {
         if (window.confirm('¿Eliminar este gasto?')) {
             try {
                 await onDeleteExpense(id);
                 showToast('Gasto eliminado', 'success');
             } catch (error: any) {
                 showToast('Error al eliminar: ' + error.message, 'error');
             }
         }
    };

    return (
        <div className="space-y-6">
            <Card>
                <CardHeader>
                    <div className="flex justify-between items-center">
                        <div>
                            <CardTitle>Registro de Gastos</CardTitle>
                            <p className="text-sm text-gray-500">Añada los gastos de forma rápida seleccionando Proveedor, Categoría y Monto.</p>
                        </div>
                        <Button onClick={handleAddRow}><PlusIcon className="w-4 h-4" /></Button>
                    </div>
                </CardHeader>
                <div className="px-6 py-4">
                    <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                            <thead className="bg-gray-50 dark:bg-gray-800">
                                <tr>
                                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Fecha</th>
                                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Proveedor</th>
                                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Categoría</th>
                                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Descripción</th>
                                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Monto (Bs)</th>
                                    <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">Acción</th>
                                </tr>
                            </thead>
                            <tbody className="bg-white dark:bg-gray-900 divide-y divide-gray-200 dark:divide-gray-800">
                                {draftExpenses.map(draft => (
                                    <tr key={draft.id}>
                                        <td className="px-2 py-2">
                                            <Input type="date" value={draft.date?.split('T')[0] || ''} onChange={e => handleChange(draft.id!, 'date', e.target.value)} />
                                        </td>
                                        <td className="px-2 py-2">
                                            <Select value={draft.supplierId || ''} onChange={e => handleChange(draft.id!, 'supplierId', e.target.value)}>
                                                <option value="">Seleccione Proveedor...</option>
                                                {suppliers.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                                            </Select>
                                        </td>
                                        <td className="px-2 py-2">
                                            <Select value={draft.categoryId || ''} onChange={e => handleChange(draft.id!, 'categoryId', e.target.value)}>
                                                <option value="">Seleccione Categoría...</option>
                                                {expenseCategories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                                            </Select>
                                        </td>
                                        <td className="px-2 py-2">
                                            <Input placeholder="Descripción del gasto" value={draft.description || ''} onChange={e => handleChange(draft.id!, 'description', e.target.value)} />
                                        </td>
                                        <td className="px-2 py-2">
                                            <Input type="number" min="0" step="any" value={draft.amount === undefined ? '' : draft.amount} onChange={e => handleChange(draft.id!, 'amount', e.target.value === '' ? undefined : parseFloat(e.target.value))} />
                                        </td>
                                        <td className="px-2 py-2 text-center">
                                            <Button variant="danger" size="sm" onClick={() => handleRemoveRow(draft.id!)}>
                                                <TrashIcon className="w-4 h-4" />
                                            </Button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                    <div className="mt-4 flex justify-end">
                        <Button onClick={handleSaveAll} variant="primary">Guardar Gasto</Button>
                    </div>
                </div>
            </Card>

            <Card>
                <CardHeader>
                    <CardTitle>Gastos Registrados</CardTitle>
                </CardHeader>
                <div className="px-6 py-4">
                    <div className="overflow-x-auto max-h-[50vh]">
                         <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                            <thead className="bg-gray-50 dark:bg-gray-800">
                                <tr>
                                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Fecha</th>
                                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Proveedor</th>
                                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Categoría</th>
                                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Descripción</th>
                                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Monto (Bs)</th>
                                    <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">Acción</th>
                                </tr>
                            </thead>
                            <tbody className="bg-white dark:bg-gray-900 divide-y divide-gray-200 dark:divide-gray-800">
                                {expenses.sort((a,b)=> new Date(b.date).getTime() - new Date(a.date).getTime()).map(exp => (
                                    <tr key={exp.id}>
                                         <td className="px-4 py-3 text-sm">{exp.date.split('T')[0]}</td>
                                         <td className="px-4 py-3 text-sm">{(exp.supplierId ? suppliers.find(s => s.id === exp.supplierId)?.name : exp.supplierName) || 'N/A'}</td>
                                         <td className="px-4 py-3 text-sm">{(exp.categoryId ? expenseCategories.find(c => c.id === exp.categoryId)?.name : exp.category) || 'N/A'}</td>
                                         <td className="px-4 py-3 text-sm">{exp.description}</td>
                                         <td className="px-4 py-3 text-sm text-right text-red-600 font-semibold">{exp.amount.toLocaleString('es-VE', { minimumFractionDigits: 2 })}</td>
                                         <td className="px-4 py-3 text-center">
                                            {permissions['gastos.delete'] && (
                                                <Button variant="danger" size="sm" onClick={() => handleDeleteSaved(exp.id)}>
                                                    <TrashIcon className="w-4 h-4" />
                                                </Button>
                                            )}
                                         </td>
                                    </tr>
                                ))}
                                {expenses.length === 0 && (
                                    <tr><td colSpan={6} className="px-4 py-8 text-center text-gray-500">No hay gastos guardados.</td></tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            </Card>
        </div>
    );
};

export default GastosView;
