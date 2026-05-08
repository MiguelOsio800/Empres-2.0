
import React, { useState, useMemo } from 'react';
import { Asociado, PagoAsociado, ReciboPagoAsociado, CompanyInfo, Permissions } from '../../types';
import Card from '../ui/Card';
import Button from '../ui/Button';
import Input from '../ui/Input';
import { EyeIcon, CurrencyDollarIcon, DocumentTextIcon, PlusIcon, SearchIcon, FilterIcon, ArrowLeftIcon } from '../icons/Icons';
import GenerarCargoMasivoModal from './GenerarCargoMasivoModal';
import AsociadoFinanzasModal from './AsociadoFinanzasModal';

interface CobranzasViewProps {
    asociados: Asociado[];
    pagosAsociados: PagoAsociado[];
    recibosAsociados: ReciboPagoAsociado[];
    onGenerateMassiveDebt: (data: { concepto: string, monto: number, montoUsd: number, tasaCambio: number, cuotas: string, asociadoIds: string[] }) => Promise<void>;
    onSaveRecibo: (recibo: ReciboPagoAsociado) => Promise<void>;
    onDeletePago: (pagoId: string) => Promise<void>;
    companyInfo: CompanyInfo;
    permissions: Permissions;
}

const CobranzasView: React.FC<CobranzasViewProps> = ({ 
    asociados, 
    pagosAsociados, 
    recibosAsociados,
    onGenerateMassiveDebt, 
    onSaveRecibo,
    onDeletePago,
    companyInfo,
    permissions
}) => {
    const [searchTerm, setSearchTerm] = useState('');
    const [isMassiveModalOpen, setIsMassiveModalOpen] = useState(false);
    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = 10;

    // Period Filter State
    const [selectedMonth, setSelectedMonth] = useState<string>(String(new Date().getMonth() + 1).padStart(2, '0'));
    const [selectedYear, setSelectedYear] = useState<string>(String(new Date().getFullYear()));

    // Financial Modal State
    const [isFinanzasModalOpen, setIsFinanzasModalOpen] = useState(false);
    const [selectedAsociado, setSelectedAsociado] = useState<Asociado | null>(null);
    const [initialFinanzasTab, setInitialFinanzasTab] = useState<'deudas' | 'recibos' | 'pagar'>('deudas');

    const meses = [
        { value: '01', label: 'Enero' },
        { value: '02', label: 'Febrero' },
        { value: '03', label: 'Marzo' },
        { value: '04', label: 'Abril' },
        { value: '05', label: 'Mayo' },
        { value: '06', label: 'Junio' },
        { value: '07', label: 'Julio' },
        { value: '08', label: 'Agosto' },
        { value: '09', label: 'Septiembre' },
        { value: '10', label: 'Octubre' },
        { value: '11', label: 'Noviembre' },
        { value: '12', label: 'Diciembre' },
    ];

    const años = Array.from({ length: 5 }, (_, i) => String(new Date().getFullYear() - 2 + i));

    const asociadosWithDebt = useMemo(() => {
        return asociados.map(a => {
            const allPending = pagosAsociados.filter(p => String(p.asociadoId) === String(a.id) && p.status === 'Pendiente');
            
            const periodPending = allPending.filter(p => {
                // Priorizamos createdAt como solicitó el usuario para filtrado estricto
                const dateToUse = p.createdAt || p.fecha;
                if (!dateToUse) return false;
                
                const date = new Date(dateToUse);
                const year = date.getFullYear();
                const month = String(date.getMonth() + 1).padStart(2, '0');
                
                return String(year) === selectedYear && month === selectedMonth;
            });
            
            // La suma en Bolívares debe ser: montoUsd * tasaCambio (usando la tasa guardada en cada registro)
            const calculateBs = (p: PagoAsociado) => {
                if (p.montoUsd && p.tasaCambio) {
                    return p.montoUsd * p.tasaCambio;
                }
                return Number(p.montoBs) || 0;
            };

            const totalDebtPeriod = periodPending.reduce((sum, p) => sum + calculateBs(p), 0);
            const totalDebtGlobal = allPending.reduce((sum, p) => sum + calculateBs(p), 0);
            
            return {
                ...a,
                totalDebt: totalDebtPeriod,
                globalDebt: totalDebtGlobal,
                isPendingInPeriod: totalDebtPeriod > 0,
                isGlobalPending: allPending.length > 0
            };
        });
    }, [asociados, pagosAsociados, selectedMonth, selectedYear]);

    const { totalPeriodBs, totalPeriodUsd, countDeudores } = useMemo(() => {
        let bs = 0;
        let usd = 0;
        let deudores = 0;
        
        asociadosWithDebt.forEach(a => {
            if (a.totalDebt > 0) {
                bs += a.totalDebt;
                // Para el USD global del periodo, sumamos los pagos individuales
                const periodPagos = pagosAsociados.filter(p => {
                    if (String(p.asociadoId) !== String(a.id) || p.status !== 'Pendiente') return false;
                    const dateToUse = p.createdAt || p.fecha;
                    if (!dateToUse) return false;
                    const date = new Date(dateToUse);
                    return String(date.getFullYear()) === selectedYear && String(date.getMonth() + 1).padStart(2, '0') === selectedMonth;
                });
                usd += periodPagos.reduce((sum, p) => sum + (p.montoUsd || 0), 0);
                deudores++;
            }
        });
        
        return { totalPeriodBs: bs, totalPeriodUsd: usd, countDeudores: deudores };
    }, [asociadosWithDebt, pagosAsociados, selectedMonth, selectedYear]);

    const filteredAsociados = useMemo(() => {
        return asociadosWithDebt.filter(a => 
            a.nombre.toLowerCase().includes(searchTerm.toLowerCase()) || 
            a.codigo.toLowerCase().includes(searchTerm.toLowerCase()) ||
            a.cedula.includes(searchTerm)
        );
    }, [asociadosWithDebt, searchTerm]);

    const totalPages = Math.ceil(filteredAsociados.length / itemsPerPage);
    const paginatedAsociados = filteredAsociados.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

    const handleGenerateMassive = async (data: { concepto: string, monto: number, montoUsd: number, tasaCambio: number, cuotas: string, fecha: string, asociadoIds: string[] }) => {
        await onGenerateMassiveDebt(data);
        setIsMassiveModalOpen(false);
    };

    const handleOpenFinanzas = (asociado: Asociado, tab: 'deudas' | 'recibos' | 'pagar') => {
        setSelectedAsociado(asociado);
        setInitialFinanzasTab(tab);
        setIsFinanzasModalOpen(true);
    };

    return (
        <div className="space-y-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                    <button 
                        onClick={() => window.location.hash = 'asociados'}
                        className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full transition-colors"
                        title="Volver"
                    >
                        <ArrowLeftIcon className="w-6 h-6 text-gray-600 dark:text-gray-400" />
                    </button>
                    <div>
                        <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Gestión de Cobranzas Mensual</h2>
                        <p className="text-gray-500 dark:text-gray-400">Administra las deudas y pagos de los socios por periodo.</p>
                    </div>
                </div>
                {permissions['asociados.create'] && (
                    <Button onClick={() => setIsMassiveModalOpen(true)}>
                        <PlusIcon className="w-5 h-5 mr-2" />
                        Generar Cargo Masivo
                    </Button>
                )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Card className="p-4 border-l-4 border-red-500">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Deuda Total ({meses.find(m => m.value === selectedMonth)?.label})</p>
                            <p className="text-2xl font-bold text-red-600 dark:text-red-400">
                                {totalPeriodBs.toLocaleString('es-VE', { style: 'currency', currency: 'VES' })}
                            </p>
                        </div>
                        <div className="p-3 bg-red-100 dark:bg-red-900/30 rounded-full">
                            <CurrencyDollarIcon className="w-6 h-6 text-red-600 dark:text-red-400" />
                        </div>
                    </div>
                </Card>
                <Card className="p-4 border-l-4 border-amber-500">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Deuda en Divisas ({meses.find(m => m.value === selectedMonth)?.label})</p>
                            <p className="text-2xl font-bold text-amber-600 dark:text-amber-400">
                                ${totalPeriodUsd.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            </p>
                        </div>
                        <div className="p-3 bg-amber-100 dark:bg-amber-900/30 rounded-full">
                            <CurrencyDollarIcon className="w-6 h-6 text-amber-600 dark:text-amber-400" />
                        </div>
                    </div>
                </Card>
                <Card className="p-4 border-l-4 border-primary-500">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Socios con Deuda</p>
                            <p className="text-2xl font-bold text-primary-600 dark:text-primary-400">
                                {countDeudores}
                            </p>
                        </div>
                        <div className="p-3 bg-primary-100 dark:bg-primary-900/30 rounded-full">
                            <FilterIcon className="w-6 h-6 text-primary-600 dark:text-primary-400" />
                        </div>
                    </div>
                </Card>
            </div>

            <Card className="p-0 overflow-hidden">
                <div className="p-4 border-b dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50 flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div className="flex flex-col md:flex-row items-start md:items-center gap-4 w-full md:w-auto">
                        <div className="relative w-full md:w-80">
                            <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                            <input 
                                type="text"
                                placeholder="Buscar socio..."
                                className="w-full pl-10 pr-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 focus:ring-2 focus:ring-primary-500 outline-none"
                                value={searchTerm}
                                onChange={(e) => {
                                    setSearchTerm(e.target.value);
                                    setCurrentPage(1);
                                }}
                            />
                        </div>
                        <div className="flex items-center gap-2 w-full md:w-auto">
                            <select 
                                className="px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 outline-none focus:ring-2 focus:ring-primary-500"
                                value={selectedMonth}
                                onChange={(e) => setSelectedMonth(e.target.value)}
                            >
                                {meses.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
                            </select>
                            <select 
                                className="px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 outline-none focus:ring-2 focus:ring-primary-500"
                                value={selectedYear}
                                onChange={(e) => setSelectedYear(e.target.value)}
                            >
                                {años.map(a => <option key={a} value={a}>{a}</option>)}
                            </select>
                        </div>
                    </div>
                    <div className="flex items-center gap-2 text-sm text-gray-500">
                        <FilterIcon className="w-4 h-4" />
                        <span>Mostrando {paginatedAsociados.length} de {filteredAsociados.length} socios</span>
                    </div>
                </div>

                <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                        <thead className="bg-gray-50 dark:bg-gray-800">
                            <tr>
                                <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Código</th>
                                <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Nombre</th>
                                <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Deuda en {meses.find(m => m.value === selectedMonth)?.label}</th>
                                <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Estado Morosidad</th>
                                <th className="px-6 py-3 text-right text-xs font-bold text-gray-500 uppercase tracking-wider">Acciones</th>
                            </tr>
                        </thead>
                        <tbody className="bg-white dark:bg-gray-900 divide-y divide-gray-200 dark:divide-gray-800">
                            {paginatedAsociados.map((a) => (
                                <tr key={a.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
                                    <td className="px-6 py-4 whitespace-nowrap text-sm font-mono font-bold text-primary-600 dark:text-primary-400">
                                        {a.codigo}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <div className="text-sm font-medium text-gray-900 dark:text-white">{a.nombre}</div>
                                        <div className="text-xs text-gray-500">{a.cedula}</div>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <div className={`text-sm font-bold ${a.totalDebt > 0 ? 'text-red-600 dark:text-red-400' : 'text-green-600 dark:text-green-400'}`}>
                                            {a.totalDebt.toLocaleString('es-VE', { style: 'currency', currency: 'VES' })}
                                        </div>
                                        {a.globalDebt > a.totalDebt && (
                                            <div className="text-[10px] text-red-500 font-medium mt-0.5">
                                                Deuda Total: {a.globalDebt.toLocaleString('es-VE', { style: 'currency', currency: 'VES' })}
                                            </div>
                                        )}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                                            a.isGlobalPending 
                                            ? 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300' 
                                            : 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300'
                                        }`}>
                                            <span className={`w-2 h-2 rounded-full mr-1.5 ${a.isGlobalPending ? 'bg-red-500' : 'bg-green-500'}`}></span>
                                            {a.isGlobalPending 
                                                ? (a.totalDebt > 0 ? 'Con Deuda' : 'Mora Anterior') 
                                                : 'Solvente'
                                            }
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                        <div className="flex justify-end gap-2">
                                            <button 
                                                title="Ver Deudas"
                                                onClick={() => handleOpenFinanzas(a, 'deudas')}
                                                className="p-1.5 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-colors"
                                            >
                                                <EyeIcon className="w-5 h-5" />
                                            </button>
                                            <button 
                                                title="Pagar Deuda"
                                                onClick={() => handleOpenFinanzas(a, 'pagar')}
                                                className="p-1.5 text-green-600 hover:bg-green-50 dark:hover:bg-green-900/20 rounded-lg transition-colors"
                                            >
                                                <CurrencyDollarIcon className="w-5 h-5" />
                                            </button>
                                            <button 
                                                title="Ver Recibos"
                                                onClick={() => handleOpenFinanzas(a, 'recibos')}
                                                className="p-1.5 text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-900/20 rounded-lg transition-colors"
                                            >
                                                <DocumentTextIcon className="w-5 h-5" />
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                            {paginatedAsociados.length === 0 && (
                                <tr>
                                    <td colSpan={5} className="px-6 py-12 text-center text-gray-500">
                                        No se encontraron socios que coincidan con la búsqueda.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>

                {totalPages > 1 && (
                    <div className="px-6 py-4 border-t dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50 flex items-center justify-between">
                        <div className="text-sm text-gray-500">
                            Página {currentPage} de {totalPages}
                        </div>
                        <div className="flex gap-2">
                            <Button 
                                variant="secondary" 
                                size="sm" 
                                disabled={currentPage === 1}
                                onClick={() => setCurrentPage(prev => prev - 1)}
                            >
                                Anterior
                            </Button>
                            <Button 
                                variant="secondary" 
                                size="sm" 
                                disabled={currentPage === totalPages}
                                onClick={() => setCurrentPage(prev => prev + 1)}
                            >
                                Siguiente
                            </Button>
                        </div>
                    </div>
                )}
            </Card>

            <GenerarCargoMasivoModal 
                isOpen={isMassiveModalOpen}
                onClose={() => setIsMassiveModalOpen(false)}
                onConfirm={handleGenerateMassive}
                asociados={asociados}
                bcvRate={companyInfo.bcvRate || 1}
            />

            {isFinanzasModalOpen && selectedAsociado && (
                <AsociadoFinanzasModal 
                    isOpen={isFinanzasModalOpen}
                    onClose={() => setIsFinanzasModalOpen(false)}
                    asociado={selectedAsociado}
                    pagos={pagosAsociados}
                    recibos={recibosAsociados}
                    onSaveRecibo={onSaveRecibo}
                    onDeletePago={onDeletePago}
                    companyInfo={companyInfo}
                    permissions={permissions}
                    initialTab={initialFinanzasTab}
                    selectedMonth={selectedMonth}
                    selectedYear={selectedYear}
                />
            )}
        </div>
    );
};

export default CobranzasView;
