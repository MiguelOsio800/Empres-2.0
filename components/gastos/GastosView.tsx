import React, { useState } from 'react';
import { Expense, Supplier, ExpenseCategory, Office, PaymentMethod, User } from '../../types';
import Card, { CardHeader, CardTitle } from '../ui/Card';
import Button from '../ui/Button';
import { TrashIcon, PlusIcon } from '../icons/Icons';
import Input from '../ui/Input';
import Select from '../ui/Select';

interface GastosViewProps {
    expenses: Expense[];
    suppliers: Supplier[];
    expenseCategories: ExpenseCategory[];
    offices: Office[];
    paymentMethods: PaymentMethod[];
    currentUser: User;
    onSaveExpense: (expense: Expense) => Promise<void>;
    onDeleteExpense: (expenseId: string) => Promise<void>;
}

const GastosView: React.FC<GastosViewProps> = ({ expenses, suppliers, expenseCategories, offices, paymentMethods, currentUser, onSaveExpense, onDeleteExpense }) => {
    // We will keep a local state for the "new" expenses being drafted.
    // The previously saved expenses will be listed below, or just have a single dynamic list?
    // "El modulo de gastos va a funcionar como un crud, pero va a ser con el diseño de captura de pantalla... un crud que solo me permita escoger el proveedor la categoria del gasto y los datos de cuanto fue"
    // So basically a dynamic list of new expenses to be saved.
    
    const [draftExpenses, setDraftExpenses] = useState<Partial<Expense>[]>([{ id: 'draft-1', amount: 0, date: new Date().toISOString().slice(0, 10), officeId: currentUser.officeId || offices[0]?.id || '' }]);

    const handleAddRow = () => {
        setDraftExpenses([...draftExpenses, { id: `draft-${Date.now()}`, amount: 0, date: new Date().toISOString().slice(0, 10), officeId: currentUser.officeId || offices[0]?.id || '' }]);
    };

    const handleRemoveRow = (id: string) => {
        setDraftExpenses(draftExpenses.filter(e => e.id !== id));
    };

    const handleChange = (id: string, field: keyof Expense, value: any) => {
        setDraftExpenses(draftExpenses.map(e => e.id === id ? { ...e, [field]: value } : e));
    };

    const handleSaveAll = async () => {
        for (const draft of draftExpenses) {
            if (draft.supplierId && draft.categoryId && draft.amount && draft.amount > 0) {
                const newId = draft.id?.startsWith('draft-') ? `exp-${Date.now()}-${Math.floor(Math.random()*1000)}` : draft.id;
                const fullExpense: Expense = {
                    id: newId!,
                    amount: draft.amount,
                    currency: 'Bs',
                    date: draft.date || new Date().toISOString(),
                    supplierId: draft.supplierId,
                    categoryId: draft.categoryId,
                    description: draft.description || 'Gasto registrado',
                    officeId: draft.officeId || currentUser.officeId || offices[0]?.id || '',
                    paymentMethodId: paymentMethods[0]?.id || '', // Default as it wasn't requested
                    status: 'Pagado',
                    createdAt: new Date().toISOString()
                };
                await onSaveExpense(fullExpense);
            }
        }
        // Reset after saving
        setDraftExpenses([{ id: `draft-${Date.now()}`, amount: 0, date: new Date().toISOString().slice(0, 10), officeId: currentUser.officeId || offices[0]?.id || '' }]);
        alert('Gastos guardados exitosamente');
    };

    const handleDeleteSaved = async (id: string) => {
         if (window.confirm('¿Eliminar este gasto?')) {
             await onDeleteExpense(id);
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
                        <Button onClick={handleAddRow}><PlusIcon className="w-4 h-4 mr-2" /> Añadir Fila</Button>
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
                                            <Input type="number" min="0" step="0.01" value={draft.amount || 0} onChange={e => handleChange(draft.id!, 'amount', parseFloat(e.target.value))} />
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
                        <Button onClick={handleSaveAll} variant="primary">Guardar Novedades</Button>
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
                                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Monto (Bs)</th>
                                    <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">Acción</th>
                                </tr>
                            </thead>
                            <tbody className="bg-white dark:bg-gray-900 divide-y divide-gray-200 dark:divide-gray-800">
                                {expenses.sort((a,b)=> new Date(b.date).getTime() - new Date(a.date).getTime()).map(exp => (
                                    <tr key={exp.id}>
                                         <td className="px-4 py-3 text-sm">{exp.date.split('T')[0]}</td>
                                         <td className="px-4 py-3 text-sm">{suppliers.find(s => s.id === exp.supplierId)?.name || 'N/A'}</td>
                                         <td className="px-4 py-3 text-sm">{expenseCategories.find(c => c.id === exp.categoryId)?.name || 'N/A'}</td>
                                         <td className="px-4 py-3 text-sm text-right text-red-600 font-semibold">{exp.amount.toLocaleString('es-VE', { minimumFractionDigits: 2 })}</td>
                                         <td className="px-4 py-3 text-center">
                                            <Button variant="danger" size="sm" onClick={() => handleDeleteSaved(exp.id)}>
                                                <TrashIcon className="w-4 h-4" />
                                            </Button>
                                         </td>
                                    </tr>
                                ))}
                                {expenses.length === 0 && (
                                    <tr><td colSpan={5} className="px-4 py-8 text-center text-gray-500">No hay gastos guardados.</td></tr>
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
