
import React, { useState, useMemo, useRef } from 'react';
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import html2canvas from 'html2canvas';
import { Report, Invoice, Client, Expense, Office, CompanyInfo, PaymentMethod, Vehicle, Category, ShippingStatus, PaymentStatus, Asociado, ShippingType } from '../../types';
import Card, { CardTitle, CardHeader } from '../ui/Card';
import Button from '../ui/Button';
import Input from '../ui/Input';
import { FileSpreadsheetIcon, ArrowLeftIcon, TruckIcon, ChevronDownIcon, ChevronUpIcon } from '../icons/Icons';
import { calculateFinancialDetails, calculateInvoiceChargeableWeight } from '../../utils/financials';
import Select from '../ui/Select';
import usePagination from '../../hooks/usePagination';
import PaginationControls from '../ui/PaginationControls';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { useSystem } from '../../contexts/SystemContext';
import { useAuth } from '../../contexts/AuthContext';
import { useConfig } from '../../contexts/ConfigContext';


interface ReportDetailViewProps {
    report: Report;
    invoices: Invoice[];
    clients: Client[];
    expenses: Expense[];
    offices: Office[];
    companyInfo: CompanyInfo;
    paymentMethods: PaymentMethod[];
    vehicles: Vehicle[];
    categories: Category[];
    asociados: Asociado[];
    shippingTypes: ShippingType[];
    reportOfficeId?: string | null;
}

const formatCurrency = (amount: number = 0) => `Bs. ${amount.toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

const ITEMS_PER_PAGE = 20;

const ReportCompanyHeader: React.FC<{ companyInfo: CompanyInfo, reportTitle: string, startDate: string, endDate: string, officeName?: string }> = ({ companyInfo, reportTitle, startDate, endDate, officeName }) => (
    <div className="mb-6 border-b border-gray-200 dark:border-gray-700 pb-4">
        <div className="flex flex-col md:flex-row items-start md:items-center gap-4 md:justify-between">
            <div className="flex items-center gap-4">
                {companyInfo.logoUrl ? (
                    <img src={companyInfo.logoUrl} alt="Logo" className="h-16 w-16 object-contain" referrerPolicy="no-referrer" />
                ) : (
                    <div className="h-16 w-16 bg-gray-200 dark:bg-gray-700 rounded flex items-center justify-center text-gray-500 dark:text-gray-400 font-bold shrink-0">LOGO</div>
                )}
                <div>
                    <h2 className="text-2xl font-bold text-gray-900 dark:text-white uppercase leading-tight">{companyInfo.name || 'Nombre de Empresa'}</h2>
                    <div className="mt-1 flex flex-col gap-0.5 text-sm">
                        <p className="text-gray-600 dark:text-gray-400"><span className="font-semibold">RIF:</span> {companyInfo.rif || 'J-00000000-0'}</p>
                        <p className="text-gray-600 dark:text-gray-400">{companyInfo.address || 'Dirección no configurada'}</p>
                        <p className="text-gray-600 dark:text-gray-400"><span className="font-semibold">Tel:</span> {companyInfo.phone || 'Teléfono no configurado'}</p>
                    </div>
                </div>
            </div>
            
            <div className="flex flex-col items-start md:items-end w-full md:w-auto mt-4 md:mt-0">
                <h3 className="text-xl font-bold text-primary-600 dark:text-primary-400 uppercase whitespace-nowrap">{reportTitle}</h3>
                <p className="text-sm font-semibold text-primary-600 dark:text-primary-400 mt-1">
                    OFICINA: {officeName || 'TODAS LAS SUCURSALES'}
                </p>
                <div className="text-left md:text-right mt-2 text-sm text-gray-500 dark:text-gray-400 font-medium">
                    <p>
                        {startDate && endDate ? `Desde: ${startDate} Hasta: ${endDate}` : 
                        startDate ? `Desde: ${startDate}` : 
                        endDate ? `Hasta: ${endDate}` : 'Todos los registros'}
                    </p>
                    <p className="text-xs text-gray-400 italic mt-1">Generado: {new Date().toLocaleDateString('es-VE')} {new Date().toLocaleTimeString('es-VE')}</p>
                </div>
            </div>
        </div>
    </div>
);

const ReportDetailView: React.FC<ReportDetailViewProps> = ({ report, invoices, clients, expenses, offices, companyInfo, paymentMethods, vehicles, asociados, shippingTypes, reportOfficeId }) => {
    const { currentUser, hasGlobalAccess } = useAuth();
    const { roles } = useConfig();
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');
    const [expandedCard, setExpandedCard] = useState<string | null>(null);
    const reportRef = useRef<HTMLDivElement>(null);

    const officeName = useMemo(() => {
        if (!reportOfficeId || reportOfficeId === 'all') return 'Todas las Sucursales';
        return offices.find(o => o.id === reportOfficeId)?.name || 'Sucursal';
    }, [reportOfficeId, offices]);

    const dateFilteredInvoices = useMemo(() => {
        return invoices.filter(invoice => {
            if (!startDate && !endDate) return true;
            const invoiceDateStr = invoice.date.split('T')[0];
            const startStr = startDate ? startDate.split('T')[0] : null;
            const endStr = endDate ? endDate.split('T')[0] : null;
            if (startStr && invoiceDateStr < startStr) return false;
            if (endStr && invoiceDateStr > endStr) return false;
            return true;
        });
    }, [invoices, startDate, endDate]);
    
    const dateFilteredExpenses = useMemo(() => {
        return expenses.filter(expense => {
            if (!startDate && !endDate) return true;
            const expenseDateStr = expense.date.split('T')[0];
            const startStr = startDate ? startDate.split('T')[0] : null;
            const endStr = endDate ? endDate.split('T')[0] : null;
            if (startStr && expenseDateStr < startStr) return false;
            if (endStr && expenseDateStr > endStr) return false;
            return true;
        });
    }, [expenses, startDate, endDate]);

    const reportData = useMemo(() => {
        switch(report.id) {
            case 'general_envios':
                return dateFilteredInvoices.filter(i => i.status === 'Activa');
            case 'libro_venta':
                return dateFilteredInvoices;
            case 'cuentas_cobrar':
                return dateFilteredInvoices.filter(inv => inv.paymentStatus === 'Pendiente' && inv.status === 'Activa');
            case 'cuentas_pagar':
                return dateFilteredExpenses.filter(exp => exp.status === 'Pendiente');
            case 'facturas_anuladas':
                return dateFilteredInvoices.filter(invoice => invoice.status === 'Anulada');
            case 'ipostel':
                return dateFilteredInvoices.filter(inv => inv.status !== 'Anulada' && calculateFinancialDetails(inv.guide, companyInfo).ipostel > 0);
            case 'seguro':
                 return dateFilteredInvoices.filter(inv => inv.status !== 'Anulada' && inv.guide.hasInsurance);
            case 'clientes':
                 const clientMov = dateFilteredInvoices.filter(inv => inv.status !== 'Anulada').reduce((acc, inv) => {
                    const clientId = inv.clientIdNumber;
                    if (!acc[clientId]) {
                        const clientInfo = clients.find(c => c.idNumber === clientId);
                        acc[clientId] = { id: clientId, name: inv.clientName, phone: clientInfo?.phone || 'N/A', count: 0, total: 0 };
                    }
                    acc[clientId].count++;
                    acc[clientId].total += inv.totalAmount;
                    return acc;
                }, {} as Record<string, { id: string, name: string, phone: string, count: number, total: number }>);
                // FIX: Add explicit types to sort parameters to resolve 'unknown' type error.
                return Object.values(clientMov).sort((a: { total: number; }, b: { total: number; }) => b.total - a.total);
            case 'iva':
                return dateFilteredInvoices.filter(inv => inv.status !== 'Anulada');
            case 'cuadre_caja':
                if (!startDate && !endDate) return [];
                const validInvoices = dateFilteredInvoices.filter(i => i.status !== 'Anulada');
                const produccionDelDia = validInvoices.reduce((sum, inv) => sum + inv.totalAmount, 0);

                const cashFlowMap = paymentMethods.reduce((acc, pm) => {
                    acc[pm.id] = { id: pm.id, name: pm.name, income: 0, expense: 0, incomes: [], expenses: [] };
                    return acc;
                }, {} as Record<string, { id: string; name: string; income: number; expense: number; incomes: Invoice[]; expenses: Expense[] }>);

                validInvoices.filter(i => i.paymentStatus === 'Pagada').forEach(inv => {
                    if (cashFlowMap[inv.guide.paymentMethodId]) {
                        cashFlowMap[inv.guide.paymentMethodId].income += inv.totalAmount;
                        cashFlowMap[inv.guide.paymentMethodId].incomes.push(inv);
                    }
                });
                dateFilteredExpenses.filter(e => e.status === 'Pagado' && e.paymentMethodId).forEach(exp => {
                    if (exp.paymentMethodId && cashFlowMap[exp.paymentMethodId]) {
                        cashFlowMap[exp.paymentMethodId].expense += exp.amount;
                        cashFlowMap[exp.paymentMethodId].expenses.push(exp);
                    }
                });
                
                const paymentMethodsData = Object.values(cashFlowMap).filter((item: { income: number; expense: number; }) => item.income > 0 || item.expense > 0);
                
                return [{
                    produccionDelDia,
                    invoices: validInvoices,
                    paymentMethods: paymentMethodsData
                }];
            case 'envios_oficina':
                const officeProductivity = dateFilteredInvoices.filter(inv => inv.status !== 'Anulada').reduce((acc, inv) => {
                    const officeId = inv.guide.originOfficeId;
                    if (!acc[officeId]) acc[officeId] = { id: officeId, name: offices.find(o => o.id === officeId)?.name || 'Desconocida', totalFacturado: 0, envios: 0, totalKg: 0 };
                    acc[officeId].totalFacturado += inv.totalAmount;
                    acc[officeId].envios++;
                    acc[officeId].totalKg += calculateInvoiceChargeableWeight(inv);
                    return acc;
                }, {} as Record<string, { id: string, name: string, totalFacturado: number, envios: number, totalKg: number }>);
                return Object.values(officeProductivity);
            case 'gastos_oficina':
                const officeExpenses: Record<string, { id: string; name: string; total: number; count: number; expenses: Expense[] }> = {};
                dateFilteredExpenses.forEach(exp => {
                    const officeId = exp.officeId || 'general';
                    if (!officeExpenses[officeId]) {
                        officeExpenses[officeId] = {
                            id: officeId,
                            name: offices.find(o => o.id === officeId)?.name || 'Gastos Generales',
                            total: 0,
                            count: 0,
                            expenses: []
                        };
                    }
                    officeExpenses[officeId].total += exp.amount;
                    officeExpenses[officeId].count++;
                    officeExpenses[officeId].expenses.push(exp);
                });
                return Object.values(officeExpenses);
            case 'reporte_kilogramos':
                return dateFilteredInvoices.filter(inv => inv.status !== 'Anulada');
            case 'reporte_comisiones':
                return dateFilteredInvoices.filter(inv => inv.status !== 'Anulada');
            case 'reporte_envios_vehiculo':
                const vehicleInvoices = dateFilteredInvoices.filter(inv => inv.status !== 'Anulada' && inv.vehicleId);
                const groupedByVehicleId = vehicleInvoices.reduce((acc, inv) => {
                    const key = inv.vehicleId!;
                    if (!acc[key]) {
                        const vehicle = vehicles.find(v => v.id === key);
                        const asociado = vehicle ? asociados.find(a => a.id === vehicle.asociadoId) : undefined;
                        acc[key] = { vehicle, asociado, invoices: [] };
                    }
                    acc[key].invoices.push(inv);
                    return acc;
                }, {} as Record<string, { vehicle: Vehicle | undefined, asociado: Asociado | undefined, invoices: Invoice[] }>);
                return Object.values(groupedByVehicleId);
            default:
                return [];
        }
    }, [report.id, dateFilteredInvoices, dateFilteredExpenses, companyInfo, clients, paymentMethods, offices, vehicles, asociados]);

    const { paginatedData, currentPage, totalPages, setCurrentPage, totalItems } = usePagination<any>(
        Array.isArray(reportData) ? reportData : [],
        ITEMS_PER_PAGE
    );

    const getExportDataForReport = () => {
        let dataToExport: any[] = [];
        let sheetName = report.title.replace(/\s/g, '_').substring(0, 30);
        let totalsRow: any = {};
        let headers: string[] = [];
        let isAoa = false; // Array of Arrays for complex reports like cuadre_caja

        const sourceData = Array.isArray(reportData) ? reportData : [];

        switch(report.id) {
            case 'general_envios':
                headers = ["Fecha", "N° Factura", "N° Control", "Cliente", "Tipo de Envío", "Flete", "Seguro", "Manejo", "Ipostel", "Kg", "Paquetes", "Monto Total"];
                dataToExport = (sourceData as unknown as Invoice[]).map(inv => {
                    const fin = calculateFinancialDetails(inv.guide, companyInfo);
                    const kg = calculateInvoiceChargeableWeight(inv);
                    const paquetes = inv.guide.merchandise.reduce((acc, m) => acc + (parseFloat(String(m.quantity)) || 1), 0);
                    const tipoEnvio = inv.guide.paymentType === 'flete-destino' ? 'Destino' : 'Pagado';
                    return {
                        [headers[0]]: inv.date.split('T')[0].split('-').reverse().join('/'),
                        [headers[1]]: inv.invoiceNumber,
                        [headers[2]]: inv.controlNumber,
                        [headers[3]]: inv.clientName,
                        [headers[4]]: tipoEnvio,
                        [headers[5]]: fin.freight,
                        [headers[6]]: fin.insuranceCost,
                        [headers[7]]: fin.handling,
                        [headers[8]]: fin.ipostel,
                        [headers[9]]: kg,
                        [headers[10]]: paquetes,
                        [headers[11]]: inv.totalAmount,
                    };
                });
                const generalTotals = (sourceData as unknown as Invoice[]).reduce((acc, inv) => {
                    const fin = calculateFinancialDetails(inv.guide, companyInfo);
                    const kg = calculateInvoiceChargeableWeight(inv);
                    const paquetes = inv.guide.merchandise.reduce((sum, m) => sum + (parseFloat(String(m.quantity)) || 1), 0);
                    acc.flete += fin.freight;
                    acc.seguro += fin.insuranceCost;
                    acc.manejo += fin.handling;
                    acc.ipostel += fin.ipostel;
                    acc.kg += kg;
                    acc.paquetes += paquetes;
                    acc.total += inv.totalAmount;
                    return acc;
                }, { flete: 0, seguro: 0, manejo: 0, ipostel: 0, kg: 0, paquetes: 0, total: 0 });
                totalsRow = { 
                    [headers[3]]: "TOTALES", 
                    [headers[5]]: generalTotals.flete,
                    [headers[6]]: generalTotals.seguro, 
                    [headers[7]]: generalTotals.manejo, 
                    [headers[8]]: generalTotals.ipostel, 
                    [headers[9]]: generalTotals.kg, 
                    [headers[10]]: generalTotals.paquetes, 
                    [headers[11]]: generalTotals.total 
                };
                break;
            case 'libro_venta':
                headers = ["Fecha", "N° Factura", "N° Control", "Oficina Origen", "Nombre/Razón Social Cliente", "RIF/CI Cliente", "Venta Total", "Flete", "IVA (16%)", "IPOSTEL"];
                dataToExport = (sourceData as unknown as Invoice[]).map(inv => {
                    const fin = calculateFinancialDetails(inv.guide, companyInfo);
                    const originOffice = offices.find(o => o.id === inv.guide.originOfficeId)?.name || 'N/A';
                    return inv.status === 'Anulada' ? {
                        [headers[0]]: inv.date.split('T')[0].split('-').reverse().join('/'), [headers[1]]: inv.invoiceNumber, [headers[2]]: inv.controlNumber, [headers[3]]: originOffice, [headers[4]]: inv.clientName, [headers[5]]: inv.clientIdNumber, [headers[6]]: "ANULADA", [headers[7]]: 0, [headers[8]]: 0, [headers[9]]: 0
                    } : {
                        [headers[0]]: inv.date.split('T')[0].split('-').reverse().join('/'), [headers[1]]: inv.invoiceNumber, [headers[2]]: inv.controlNumber, [headers[3]]: originOffice, [headers[4]]: inv.clientName, [headers[5]]: inv.clientIdNumber, [headers[6]]: fin.total, [headers[7]]: fin.freight, [headers[8]]: fin.iva, [headers[9]]: fin.ipostel
                    };
                });
                const salesTotals = (sourceData as unknown as Invoice[]).reduce((acc, inv) => {
                    if (inv.status !== 'Anulada') {
                        const fin = calculateFinancialDetails(inv.guide, companyInfo);
                        acc.total += fin.total; acc.flete += fin.freight; acc.iva += fin.iva; acc.ipostel += fin.ipostel;
                    } return acc;
                }, { total: 0, flete: 0, iva: 0, ipostel: 0 });
                totalsRow = { [headers[5]]: "TOTALES", [headers[6]]: salesTotals.total, [headers[7]]: salesTotals.flete, [headers[8]]: salesTotals.iva, [headers[9]]: salesTotals.ipostel };
                break;
            case 'cuentas_cobrar':
                headers = ["Fecha de Emisión", "N° Factura", "Oficina", "Cliente", "Teléfono del Cliente", "Días Vencidos", "Monto Pendiente"];
                dataToExport = (sourceData as unknown as Invoice[]).map(inv => {
                    const days = Math.floor((new Date().getTime() - new Date(inv.date).getTime()) / (1000 * 3600 * 24));
                    const client = clients.find(c => c.idNumber === inv.clientIdNumber);
                    const originOffice = offices.find(o => o.id === inv.guide.originOfficeId)?.name || 'N/A';
                    return { [headers[0]]: inv.date, [headers[1]]: inv.invoiceNumber, [headers[2]]: originOffice, [headers[3]]: inv.clientName, [headers[4]]: client?.phone, [headers[5]]: days, [headers[6]]: inv.totalAmount };
                });
                totalsRow = { [headers[2]]: "TOTAL", [headers[5]]: (sourceData as unknown as Invoice[]).reduce((sum, inv) => sum + inv.totalAmount, 0) };
                break;
            case 'cuentas_pagar':
                headers = ["Fecha", "Proveedor", "RIF Proveedor", "N° Factura", "Descripción del Gasto", "Días Vencidos", "Monto Pendiente"];
                dataToExport = (sourceData as unknown as Expense[]).map(exp => {
                    const days = Math.floor((new Date().getTime() - new Date(exp.date).getTime()) / (1000 * 3600 * 24));
                    return { [headers[0]]: exp.date, [headers[1]]: exp.supplierName, [headers[2]]: exp.supplierRif, [headers[3]]: exp.invoiceNumber, [headers[4]]: exp.description, [headers[5]]: days, [headers[6]]: exp.amount };
                });
                totalsRow = { [headers[1]]: "TOTAL", [headers[6]]: (sourceData as unknown as Expense[]).reduce((sum, exp) => sum + exp.amount, 0) };
                break;
            case 'facturas_anuladas':
                headers = ["Fecha de Anulación", "N° Factura", "N° Control", "Oficina Origen", "Cliente", "Monto Original"];
                dataToExport = (sourceData as unknown as Invoice[]).map(inv => ({
                    [headers[0]]: inv.date, [headers[1]]: inv.invoiceNumber, [headers[2]]: inv.controlNumber, [headers[3]]: offices.find(o => o.id === inv.guide.originOfficeId)?.name || 'N/A', [headers[4]]: inv.clientName, [headers[5]]: inv.totalAmount
                }));
                break;
            case 'iva':
                headers = ["Fecha", "N° Factura", "Oficina Origen", "Cliente", "Monto Total", "IVA (16%)"];
                dataToExport = (sourceData as unknown as Invoice[]).map(inv => {
                    const fin = calculateFinancialDetails(inv.guide, companyInfo);
                    return {
                        [headers[0]]: inv.date,
                        [headers[1]]: inv.invoiceNumber,
                        [headers[2]]: offices.find(o => o.id === inv.guide.originOfficeId)?.name || 'N/A',
                        [headers[3]]: inv.clientName,
                        [headers[4]]: inv.totalAmount,
                        [headers[5]]: fin.iva,
                    };
                });
                const ivaTotals = (sourceData as unknown as Invoice[]).reduce((acc, inv) => {
                    if (inv.status !== 'Anulada') {
                        const fin = calculateFinancialDetails(inv.guide, companyInfo);
                        acc.total += inv.totalAmount;
                        acc.iva += fin.iva;
                    }
                    return acc;
                }, { total: 0, iva: 0 });
                totalsRow = {
                    [headers[2]]: "TOTALES",
                    [headers[3]]: ivaTotals.total,
                    [headers[4]]: ivaTotals.iva,
                };
                break;
            case 'cuadre_caja': {
                 const reportDataObj = (sourceData as any[])[0];
                 if (!reportDataObj) return null;

                 const invoicesData = reportDataObj.invoices || [];
                 const wsData: any[][] = [];
                 
                 wsData.push([{ content: "FACTURAS DEL DÍA", colSpan: 9, styles: { fillColor: [220, 220, 220], fontStyle: 'bold', halign: 'center' } }]);
                 wsData.push([
                     { content: "Factura N°", styles: { fontStyle: 'bold', fillColor: [240, 240, 240], halign: 'center' } }, 
                     { content: "Fecha", styles: { fontStyle: 'bold', fillColor: [240, 240, 240], halign: 'center' } }, 
                     { content: "Cliente", styles: { fontStyle: 'bold', fillColor: [240, 240, 240], halign: 'center' } }, 
                     { content: "Estado", styles: { fontStyle: 'bold', fillColor: [240, 240, 240], halign: 'center' } }, 
                     { content: "Flete", styles: { fontStyle: 'bold', fillColor: [240, 240, 240], halign: 'right' } }, 
                     { content: "Ipostel", styles: { fontStyle: 'bold', fillColor: [240, 240, 240], halign: 'right' } }, 
                     { content: "Seguro", styles: { fontStyle: 'bold', fillColor: [240, 240, 240], halign: 'right' } }, 
                     { content: "Manejo", styles: { fontStyle: 'bold', fillColor: [240, 240, 240], halign: 'right' } }, 
                     { content: "Monto Total", styles: { fontStyle: 'bold', fillColor: [240, 240, 240], halign: 'right' } }
                 ]);
                 
                 let sumFlete = 0, sumFleteUSD = 0;
                 let sumSeguro = 0, sumSeguroUSD = 0;
                 let sumManejo = 0, sumManejoUSD = 0;
                 let sumIpostel = 0, sumIpostelUSD = 0;
                 let sumTotalEnvio = 0, sumTotalEnvioUSD = 0;
                 let sumTotalAmount = 0, sumTotalAmountUSD = 0;
                 
                 let totalPagadas = 0, totalPagadasUSD = 0;
                 let totalCobroDestino = 0;
                 let totalCredito = 0;

                 invoicesData.forEach((inv: Invoice) => {
                     const fin = calculateFinancialDetails(inv.guide, companyInfo);
                     const rate = inv.exchangeRate || companyInfo.exchangeRate || 1;
                     
                     const handling = inv.Montomanejo !== undefined ? inv.Montomanejo : fin.handling;
                     const ipostel = inv.ipostelFee !== undefined ? inv.ipostelFee : fin.ipostel;
                     const freight = fin.freight;
                     const insuranceCost = fin.insuranceCost;
                     const totalEnvio = freight + insuranceCost + handling + ipostel;
                     
                     sumFlete += freight; sumFleteUSD += freight / rate;
                     sumSeguro += insuranceCost; sumSeguroUSD += insuranceCost / rate;
                     sumManejo += handling; sumManejoUSD += handling / rate;
                     sumIpostel += ipostel; sumIpostelUSD += ipostel / rate;
                     sumTotalEnvio += totalEnvio; sumTotalEnvioUSD += totalEnvio / rate;
                     sumTotalAmount += inv.totalAmount; sumTotalAmountUSD += inv.totalAmount / rate;
                     
                     let status = 'Pagadas';
                     if (inv.guide.paymentType === 'flete-destino') status = 'Cobro a Destino';
                     else {
                         const pm = paymentMethods.find(p => p.id === inv.guide.paymentMethodId);
                         const isCredito = pm?.type === 'Credito' || pm?.name?.toLowerCase().includes('credito') || pm?.name?.toLowerCase().includes('crédito');
                         if (isCredito) status = 'Crédito';
                     }
                     
                     if (status === 'Cobro a Destino') totalCobroDestino += inv.totalAmount;
                     else if (status === 'Crédito') totalCredito += inv.totalAmount;
                     else {
                         totalPagadas += inv.totalAmount;
                         totalPagadasUSD += inv.totalAmount / rate;
                     }

                     wsData.push([
                         { content: inv.invoiceNumber, styles: { halign: 'center', valign: 'middle' } }, 
                         { content: inv.date.split('T')[0].split('-').reverse().join('/'), styles: { halign: 'center', valign: 'middle' } },
                         { content: inv.clientName || 'Consumidor Final', styles: { halign: 'center', valign: 'middle' } },
                         { content: status, styles: { halign: 'center', valign: 'middle' } },
                         { content: `Bs. ${freight.toLocaleString('es-VE', { minimumFractionDigits: 2 })}\n$ ${(freight / rate).toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`, styles: { halign: 'right' } },
                         { content: `Bs. ${ipostel.toLocaleString('es-VE', { minimumFractionDigits: 2 })}\n$ ${(ipostel / rate).toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`, styles: { halign: 'right' } },
                         { content: `Bs. ${insuranceCost.toLocaleString('es-VE', { minimumFractionDigits: 2 })}\n$ ${(insuranceCost / rate).toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`, styles: { halign: 'right' } },
                         { content: `Bs. ${handling.toLocaleString('es-VE', { minimumFractionDigits: 2 })}\n$ ${(handling / rate).toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`, styles: { halign: 'right' } },
                         { content: `Bs. ${inv.totalAmount.toLocaleString('es-VE', { minimumFractionDigits: 2 })}\n$ ${(inv.totalAmount / rate).toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`, styles: { halign: 'right', fontStyle: 'bold' } }
                     ]);
                 });
                 
                 wsData.push([
                     { content: "TOTALES", colSpan: 4, styles: { fontStyle: 'bold', halign: 'right', valign: 'middle', fillColor: [245, 245, 245] } }, 
                     { content: `Bs. ${sumFlete.toLocaleString('es-VE', { minimumFractionDigits: 2 })}\n$ ${sumFleteUSD.toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`, styles: { fontStyle: 'bold', halign: 'right', fillColor: [245, 245, 245] } },
                     { content: `Bs. ${sumIpostel.toLocaleString('es-VE', { minimumFractionDigits: 2 })}\n$ ${sumIpostelUSD.toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`, styles: { fontStyle: 'bold', halign: 'right', fillColor: [245, 245, 245] } },
                     { content: `Bs. ${sumSeguro.toLocaleString('es-VE', { minimumFractionDigits: 2 })}\n$ ${sumSeguroUSD.toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`, styles: { fontStyle: 'bold', halign: 'right', fillColor: [245, 245, 245] } },
                     { content: `Bs. ${sumManejo.toLocaleString('es-VE', { minimumFractionDigits: 2 })}\n$ ${sumManejoUSD.toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`, styles: { fontStyle: 'bold', halign: 'right', fillColor: [245, 245, 245] } },
                     { content: `Bs. ${sumTotalAmount.toLocaleString('es-VE', { minimumFractionDigits: 2 })}\n$ ${sumTotalAmountUSD.toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`, styles: { fontStyle: 'bold', halign: 'right', fillColor: [245, 245, 245] } }
                 ]);
                 
                 wsData.push([{ content: "", colSpan: 9, styles: { minCellHeight: 15, fillColor: [255, 255, 255], lineWidth: 0 } }]);
                 
                 wsData.push([{ content: "SUBTOTALES ENVIADAS", colSpan: 9, styles: { fillColor: [220, 220, 220], fontStyle: 'bold', halign: 'center' } }]);
                 wsData.push([
                     { content: "Facturas Pagadas", colSpan: 7, styles: { fontStyle: 'bold', valign: 'middle' } }, 
                     { content: `Bs. ${totalPagadas.toLocaleString('es-VE', { minimumFractionDigits: 2 })}`, colSpan: 2, styles: { halign: 'right', fontStyle: 'bold', textColor: [0, 128, 0] } }
                 ]);
                 wsData.push([
                     { content: "Facturas Cobro a Destino", colSpan: 7, styles: { fontStyle: 'bold', valign: 'middle' } }, 
                     { content: `Bs. ${totalCobroDestino.toLocaleString('es-VE', { minimumFractionDigits: 2 })}`, colSpan: 2, styles: { halign: 'right', fontStyle: 'bold', textColor: [0, 0, 255] } }
                 ]);
                 wsData.push([
                     { content: "Facturas a Crédito", colSpan: 7, styles: { fontStyle: 'bold', valign: 'middle' } }, 
                     { content: `Bs. ${totalCredito.toLocaleString('es-VE', { minimumFractionDigits: 2 })}`, colSpan: 2, styles: { halign: 'right', fontStyle: 'bold', textColor: [255, 140, 0] } }
                 ]);
                 
                 wsData.push([{ content: "", colSpan: 9, styles: { minCellHeight: 15, fillColor: [255, 255, 255], lineWidth: 0 } }]);
                 
                 wsData.push([{ content: "CUADRE", colSpan: 9, styles: { fillColor: [200, 220, 255], fontStyle: 'bold', halign: 'center' } }]);
                 wsData.push([
                     { content: "Monto en Caja (Bs)", colSpan: 7, styles: { fontStyle: 'bold', valign: 'middle', fillColor: [240, 248, 255] } }, 
                     { content: `Bs. ${totalPagadas.toLocaleString('es-VE', { minimumFractionDigits: 2 })}`, colSpan: 2, styles: { halign: 'right', fontStyle: 'bold', fontSize: 10, fillColor: [240, 248, 255] } }
                 ]);
                 wsData.push([
                     { content: "Referencia en Divisas ($)", colSpan: 7, styles: { fontStyle: 'bold', valign: 'middle', fillColor: [240, 248, 255] } }, 
 
                     { content: `$ ${totalPagadasUSD.toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`, colSpan: 2, styles: { halign: 'right', fontStyle: 'bold', fontSize: 10, fillColor: [240, 248, 255] } }
                 ]);

                 dataToExport = wsData;
                 isAoa = true;
                 break;
            }
            case 'envios_oficina':
                headers = ["Oficina", "Total Facturado", "N° Envíos", "Total Kilos Movilizados"];
                dataToExport = (sourceData as any[]).map(d => ({ [headers[0]]: d.name, [headers[1]]: d.totalFacturado, [headers[2]]: d.envios, [headers[3]]: d.totalKg }));
                const enviosTotals = (sourceData as any[]).reduce((acc, d) => ({ tf: acc.tf + d.totalFacturado, env: acc.env + d.envios, tkg: acc.tkg + d.totalKg}), {tf: 0, env: 0, tkg: 0});
                totalsRow = { [headers[0]]: "TOTALES", [headers[1]]: enviosTotals.tf, [headers[2]]: enviosTotals.env, [headers[3]]: enviosTotals.tkg };
                break;
            case 'gastos_oficina':
                headers = ["Oficina", "Fecha", "Descripción", "Categoría", "Monto"];
                dataToExport = (sourceData as any[]).flatMap(d => 
                    d.expenses.map((exp: any) => ({
                        [headers[0]]: d.name,
                        [headers[1]]: exp.date,
                        [headers[2]]: exp.description,
                        [headers[3]]: exp.category,
                        [headers[4]]: exp.amount
                    }))
                );
                const gastosTotals = (sourceData as any[]).reduce((acc, d) => ({ t: acc.t + d.total }), {t: 0});
                totalsRow = { [headers[0]]: "TOTALES GENERAL", [headers[1]]: "", [headers[2]]: "", [headers[3]]: "", [headers[4]]: gastosTotals.t };
                break;
             case 'reporte_kilogramos':
                headers = ["Fecha", "N° Factura", "Cliente", "Total Kilogramos"];
                dataToExport = (sourceData as unknown as Invoice[]).map(inv => ({
                    [headers[0]]: inv.date,
                    [headers[1]]: inv.invoiceNumber,
                    [headers[2]]: inv.clientName,
                    [headers[3]]: calculateInvoiceChargeableWeight(inv)
                }));
                totalsRow = { [headers[2]]: "TOTAL", [headers[3]]: (sourceData as unknown as Invoice[]).reduce((sum, inv) => sum + calculateInvoiceChargeableWeight(inv), 0) };
                break;
             case 'reporte_envios_vehiculo':
                 headers = ["Asociado", "Vehículo", "Placa", "Factura #", "Cliente", "Monto", "Kg"];
                 dataToExport = (sourceData as any[]).flatMap(d => d.invoices.map((inv: Invoice) => ({
                    [headers[0]]: d.asociado?.nombre, [headers[1]]: d.vehicle?.modelo, [headers[2]]: d.vehicle?.placa, [headers[3]]: inv.invoiceNumber, [headers[4]]: inv.clientName, [headers[5]]: inv.totalAmount, [headers[6]]: calculateInvoiceChargeableWeight(inv)
                 })));
                 const vehiculoTotals = (sourceData as any[]).flatMap(d => d.invoices).reduce((acc: any, inv: Invoice) => {
                     acc.monto += inv.totalAmount;
                     acc.kg += calculateInvoiceChargeableWeight(inv);
                     return acc;
                 }, { monto: 0, kg: 0 });
                 totalsRow = { [headers[4]]: "TOTALES", [headers[5]]: vehiculoTotals.monto, [headers[6]]: vehiculoTotals.kg };
                 break;
            case 'clientes':
                headers = ["RIF/CI", "Nombre Cliente", "Teléfono", "N° Envíos", "Monto Total Facturado"];
                dataToExport = (sourceData as any[]).map(c => ({
                    [headers[0]]: c.id, [headers[1]]: c.name, [headers[2]]: c.phone, [headers[3]]: c.count, [headers[4]]: c.total
                }));
                const clientesTotalsExp = (sourceData as any[]).reduce((acc, d) => ({ env: acc.env + d.count, tot: acc.tot + d.total }), { env: 0, tot: 0 });
                totalsRow = { [headers[2]]: "TOTALES", [headers[3]]: clientesTotalsExp.env, [headers[4]]: clientesTotalsExp.tot };
                break;
            case 'ipostel':
                headers = ["Fecha", "Factura", "Oficina Origen", "Cliente", "Paquetes", "Kg", "Monto Total", "Base Aporte", "Aporte IPOSTEL"];
                dataToExport = (sourceData as unknown as Invoice[]).map(inv => {
                    const ipostelAmount = calculateFinancialDetails(inv.guide, companyInfo).ipostel;
                    const ipostelBase = ipostelAmount > 0 ? ipostelAmount / 0.06 : 0;
                    const kg = calculateInvoiceChargeableWeight(inv);
                    const paquetes = inv.guide.merchandise.reduce((acc, m) => acc + (parseFloat(String(m.quantity)) || 1), 0);
                    const origen = offices.find(o => o.id === inv.guide.originOfficeId)?.name || 'N/A';
                    return {
                        [headers[0]]: inv.date, [headers[1]]: inv.invoiceNumber, [headers[2]]: origen, [headers[3]]: inv.clientName, [headers[4]]: paquetes, [headers[5]]: kg, [headers[6]]: inv.totalAmount, [headers[7]]: ipostelBase, [headers[8]]: ipostelAmount
                    }
                });
                const ipostelExportTotals = (sourceData as unknown as Invoice[]).reduce((acc, inv) => {
                    const ipostelAmount = calculateFinancialDetails(inv.guide, companyInfo).ipostel;
                    const ipostelBase = ipostelAmount > 0 ? ipostelAmount / 0.06 : 0;
                    const kg = calculateInvoiceChargeableWeight(inv);
                    const paquetes = inv.guide.merchandise.reduce((sum, m) => sum + (parseFloat(String(m.quantity)) || 1), 0);
                    acc.paq += paquetes; acc.kg += kg; acc.base += ipostelBase; acc.ip += ipostelAmount; acc.monto += inv.totalAmount;
                    return acc;
                }, { paq: 0, kg: 0, base: 0, ip: 0, monto: 0 });
                totalsRow = { [headers[3]]: "TOTALES", [headers[4]]: ipostelExportTotals.paq, [headers[5]]: ipostelExportTotals.kg, [headers[6]]: ipostelExportTotals.monto, [headers[7]]: ipostelExportTotals.base, [headers[8]]: ipostelExportTotals.ip };
                break;
            case 'seguro':
                 headers = ["Fecha", "Factura", "Cliente", "Valor Declarado", "Costo Seguro"];
                 dataToExport = (sourceData as unknown as Invoice[]).map(inv => ({
                    [headers[0]]: inv.date, [headers[1]]: inv.invoiceNumber, [headers[2]]: inv.clientName, [headers[3]]: inv.guide.declaredValue, [headers[4]]: calculateFinancialDetails(inv.guide, companyInfo).insuranceCost
                }));
                const seguroExportTotals = (sourceData as unknown as Invoice[]).reduce((acc, inv) => {
                    acc.val += inv.guide.declaredValue;
                    acc.cost += calculateFinancialDetails(inv.guide, companyInfo).insuranceCost;
                    return acc;
                }, { val: 0, cost: 0 });
                totalsRow = { [headers[2]]: "TOTALES", [headers[3]]: seguroExportTotals.val, [headers[4]]: seguroExportTotals.cost };
                break;
            case 'reporte_comisiones':
                headers = ["Nro de Factura", "Kg", "Monto Flete"];
                dataToExport = (sourceData as unknown as Invoice[]).map(inv => {
                    const kg = calculateInvoiceChargeableWeight(inv);
                    const freight = calculateFinancialDetails(inv.guide, companyInfo).freight;
                    return {
                        [headers[0]]: inv.invoiceNumber,
                        [headers[1]]: kg,
                        [headers[2]]: freight
                    };
                });
                const comisionesTotals = (sourceData as unknown as Invoice[]).reduce((acc, inv) => {
                    acc.kg += calculateInvoiceChargeableWeight(inv);
                    acc.freight += calculateFinancialDetails(inv.guide, companyInfo).freight;
                    return acc;
                }, { kg: 0, freight: 0 });
                totalsRow = { [headers[0]]: "TOTALES", [headers[1]]: comisionesTotals.kg, [headers[2]]: comisionesTotals.freight };
                break;
            default:
                alert('La exportación para este reporte no está implementada.');
                return null;
        }

        if (!hasGlobalAccess && !isAoa) {
            const keysToRemove = headers.filter(h => h.toLowerCase().includes('oficina') || h.toLowerCase() === 'origen' || h.toLowerCase() === 'destino');
            if (keysToRemove.length > 0) {
                headers = headers.filter(h => !keysToRemove.includes(h));
                dataToExport = dataToExport.map(row => {
                    const newRow = { ...row };
                    keysToRemove.forEach(k => delete newRow[k]);
                    return newRow;
                });
                keysToRemove.forEach(k => delete totalsRow[k]);
            }
        }

        return { dataToExport, sheetName, totalsRow, headers, isAoa, sourceData };
    };

    const handleExport = () => {
        const exportData = getExportDataForReport();
        if (!exportData) return;

        const { dataToExport, sheetName, totalsRow, isAoa } = exportData;

        if (isAoa) {
            // Sanitize data for Excel (remove jspdf-autotable object structure and extract raw values)
            const plainData = dataToExport.map(row => 
                row.map((cell: any) => {
                    if (cell && typeof cell === 'object' && 'content' in cell) {
                        const content = cell.content;
                        if (typeof content === 'string' && content.includes('\n')) {
                            // Extract just the Bs part for Excel (first line)
                            return content.split('\n')[0];
                        }
                        return content;
                    }
                    return cell;
                })
            );

            const ws = XLSX.utils.aoa_to_sheet(plainData);
            const workbook = XLSX.utils.book_new();
            XLSX.utils.book_append_sheet(workbook, ws, sheetName);
            XLSX.writeFile(workbook, `${sheetName}_${new Date(Date.now() - new Date().getTimezoneOffset() * 60000).toISOString().split('T')[0]}.xlsx`);
            return;
        }

        if (Object.keys(totalsRow).length > 0) {
            dataToExport.push({}); // Spacer row
            dataToExport.push(totalsRow);
        }

        const worksheet = XLSX.utils.json_to_sheet(dataToExport);
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, sheetName);
        XLSX.writeFile(workbook, `${sheetName}_${new Date(Date.now() - new Date().getTimezoneOffset() * 60000).toISOString().split('T')[0]}.xlsx`);
    };

    const handleExportPDF = async () => {
        const exportData = getExportDataForReport();
        if (!exportData) return;

        const { dataToExport, sheetName, totalsRow, headers, isAoa, sourceData } = exportData;

        try {
            const pdf = new jsPDF('l', 'pt', 'a4'); // Landscape for better fit
            const pageWidth = pdf.internal.pageSize.getWidth();
            
            // 1. Draw Company Header
            let currentY = 40;
            
            // Try to add logo if available
            if (companyInfo.logoUrl) {
                try {
                    // We need to load the image first to get its dimensions and draw it
                    const img = new Image();
                    img.crossOrigin = "Anonymous";
                    img.src = companyInfo.logoUrl;
                    await new Promise((resolve) => {
                        img.onload = resolve;
                        img.onerror = resolve; // Continue even if logo fails
                    });
                    pdf.addImage(img, 'PNG', 40, currentY, 50, 50);
                } catch (e) {
                    console.error("Failed to load logo for PDF", e);
                }
            } else {
                pdf.setFillColor(200, 200, 200);
                pdf.rect(40, currentY, 50, 50, 'F');
                pdf.setFontSize(10);
                pdf.setTextColor(100, 100, 100);
                pdf.text("LOGO", 50, currentY + 30);
            }

            // Company Info & Report Title
            pdf.setFontSize(14);
            pdf.setTextColor(0, 0, 0);
            pdf.setFont("helvetica", "bold");
            const companyName = (companyInfo.name || 'Nombre de Empresa').toUpperCase();
            const reportTitleText = report.title.toUpperCase();

            // Measure title for positioning
            pdf.setFontSize(14);
            pdf.setFont("helvetica", "bold");
            const titleWidth = pdf.getTextWidth(reportTitleText);
            const maxCompanyNameWidth = pageWidth - 100 - titleWidth - 30; // 100 left margin, 30 padding

            // Draw left side info handling possible wrapping
            pdf.setTextColor(0, 0, 0);
            const splitCompanyName = pdf.splitTextToSize(companyName, maxCompanyNameWidth);
            pdf.text(splitCompanyName, 100, currentY + 15);
            let leftY = currentY + 15 + ((splitCompanyName.length - 1) * 16) + 15;

            // Draw right side info
            pdf.setTextColor(59, 130, 246); // Primary blue for title to match on-screen
            pdf.text(reportTitleText, pageWidth - 40, currentY + 15, { align: 'right' });
            
            pdf.setTextColor(100, 100, 100);
            pdf.setFontSize(10);
            pdf.setFont("helvetica", "normal");
            
            const dateStr = startDate && endDate ? `Desde: ${startDate} Hasta: ${endDate}` : 
                            startDate ? `Desde: ${startDate}` : 
                            endDate ? `Hasta: ${endDate}` : 'Todos los registros';
            pdf.text(dateStr, pageWidth - 40, currentY + 30, { align: 'right' });
            
            pdf.setFontSize(8);
            pdf.text(`Generado: ${new Date().toLocaleDateString('es-VE')} ${new Date().toLocaleTimeString('es-VE')}`, pageWidth - 40, currentY + 42, { align: 'right' });

            pdf.setFontSize(10);
            pdf.setFont("helvetica", "normal");
            pdf.setTextColor(100, 100, 100);
            pdf.text(`RIF: ${companyInfo.rif || 'J-00000000-0'}`, 100, leftY);
            leftY += 15;
            
            const splitAddress = pdf.splitTextToSize(companyInfo.address || 'Dirección no configurada', pageWidth - 350);
            pdf.text(splitAddress, 100, leftY);
            leftY += (splitAddress.length * 15);

            pdf.setFont("helvetica", "bold");
            pdf.setTextColor(59, 130, 246); // Primary blue
            pdf.text(`OFICINA: ${officeName.toUpperCase()}`, 100, leftY);
            leftY += 15;

            pdf.setFont("helvetica", "normal");
            pdf.setTextColor(100, 100, 100);
            pdf.text(`Tel: ${companyInfo.phone || 'Teléfono no configurado'}`, 100, leftY);
            leftY += 15;

            currentY = Math.max(currentY + 75, leftY + 10);

            // 2. Draw Table
            if (isAoa) {
                // For cuadre_caja (Array of Arrays)
                autoTable(pdf, {
                    startY: currentY,
                    body: dataToExport,
                    theme: 'grid',
                    showHead: 'firstPage',
                    styles: { fontSize: 7, cellPadding: 2 },
                    headStyles: { fillColor: [240, 240, 240], textColor: [0, 0, 0], fontStyle: 'bold' },
                    columnStyles: {
                        0: { cellWidth: 50 }, // Factura N°
                        1: { cellWidth: 'auto' }, // Fecha
                        2: { cellWidth: 'auto' }, // Cliente
                        3: { cellWidth: 'auto' }, // Estado
                        4: { cellWidth: 'auto' }, // Flete
                        5: { cellWidth: 'auto' }, // Ipostel
                        6: { cellWidth: 'auto' }, // Seguro
                        7: { cellWidth: 'auto' }, // Manejo
                        8: { cellWidth: 'auto' }, // Monto Total
                    }
                });

                // Draw signature after table completes
                // @ts-ignore
                const finalY = pdf.lastAutoTable?.finalY || currentY + 100;
                let signatureY = finalY + 40; // Reduced margin from 60 to 40
                
                // Check if signature fits on the current page
                const pageHeight = pdf.internal.pageSize.getHeight();
                if (signatureY + 50 > pageHeight) {
                    pdf.addPage();
                    signatureY = 40; // Reset Y for new page
                }
                
                pdf.setDrawColor(150, 150, 150);
                pdf.line(pageWidth / 2 - 100, signatureY, pageWidth / 2 + 100, signatureY);
                pdf.setFontSize(10);
                pdf.setTextColor(0, 0, 0);
                pdf.setFont("helvetica", "bold");
                pdf.text("Firma del Oficinista", pageWidth / 2, signatureY + 15, { align: 'center' });
                pdf.setFont("helvetica", "normal");
                pdf.setTextColor(100, 100, 100);
                pdf.text(currentUser?.name || 'Usuario Desconocido', pageWidth / 2, signatureY + 30, { align: 'center' });
            } else {
                // For standard tables
                const bodyData = dataToExport.map(row => headers.map(h => {
                    const val = row[h];
                    // Format numbers as currency if they look like money, except for Kg/Days/Counts
                    if (typeof val === 'number' && !h.toLowerCase().includes('kg') && !h.toLowerCase().includes('días') && !h.toLowerCase().includes('n°') && !h.toLowerCase().includes('paquetes')) {
                        return `Bs. ${val.toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
                    }
                    return val !== undefined && val !== null ? val.toString() : '';
                }));

                if (Object.keys(totalsRow).length > 0) {
                    const totalRowData = headers.map(h => {
                        const val = totalsRow[h];
                        if (typeof val === 'number' && !h.toLowerCase().includes('kg') && !h.toLowerCase().includes('paq')) {
                            return `Bs. ${val.toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
                        }
                        return val !== undefined && val !== null ? val.toString() : '';
                    });
                    bodyData.push(totalRowData);
                }

                autoTable(pdf, {
                    startY: currentY,
                    head: [headers],
                    body: bodyData,
                    theme: 'grid',
                    showHead: 'firstPage',
                    styles: { fontSize: 8, cellPadding: 3, lineColor: [200, 200, 200], lineWidth: 0.1 },
                    headStyles: { fillColor: [240, 240, 240], textColor: [0, 0, 0], fontStyle: 'bold', lineColor: [200, 200, 200], lineWidth: 0.1 },
                    didParseCell: function(data) {
                        // Align numeric columns to right
                        const h = headers[data.column.index];
                        if (h && (h.toLowerCase().includes('monto') || h.toLowerCase().includes('total') || h.toLowerCase() === 'kg' || h.toLowerCase().includes('aporte') || h.toLowerCase().includes('iva') || h.toLowerCase().includes('base') || h.toLowerCase().includes('costo') || h.toLowerCase().includes('flete') || h.toLowerCase().includes('días'))) {
                            data.cell.styles.halign = 'right';
                        }
                        // Bold the last row if it's totals
                        if (Object.keys(totalsRow).length > 0 && data.row.index === bodyData.length - 1) {
                            data.cell.styles.fontStyle = 'bold';
                            data.cell.styles.fillColor = [240, 240, 240];
                        }
                    }
                });

                if (report.id === 'general_envios') {
                    let fletePagado = 0;
                    let fleteDestino = 0;
                    let credito = 0;
                    let ipostelTotal = 0;
                    let seguroTotal = 0;
                    let manejoTotal = 0;
                    let mudanza = 0;

                    (sourceData as Invoice[]).forEach(inv => {
                        const fin = calculateFinancialDetails(inv.guide, companyInfo);
                        const st = shippingTypes.find(s => s.id === inv.guide.shippingTypeId);
                        const isMudanza = st?.name.toLowerCase().includes('mudanza');

                        if (isMudanza) {
                            mudanza += fin.freight;
                        } else {
                            if (inv.guide.paymentType === 'flete-pagado') {
                                fletePagado += fin.freight;
                            } else if (inv.guide.paymentType === 'flete-destino') {
                                fleteDestino += fin.freight;
                            }
                        }
                        
                        ipostelTotal += fin.ipostel;
                        seguroTotal += fin.insuranceCost;
                        manejoTotal += fin.handling;
                    });

                    const empresaPagado = fletePagado * 0.30;
                    const empresaDestino = fleteDestino * 0.30;

                    const totalGeneral = empresaPagado + empresaDestino + credito + ipostelTotal + seguroTotal + manejoTotal + mudanza;
                    const refDolares = companyInfo.bcvRate > 0 ? totalGeneral / companyInfo.bcvRate : 0;
                    const totalGastosOficina = dateFilteredExpenses.reduce((sum, exp) => sum + exp.amount, 0);
                    const totalFacturas = (sourceData as Invoice[]).reduce((sum, inv) => sum + inv.totalAmount, 0);
                    const totalEmpresa = totalFacturas - totalGastosOficina;
                    const refDolaresEmpresa = companyInfo.bcvRate > 0 ? totalEmpresa / companyInfo.bcvRate : 0;

                    // @ts-ignore
                    const finalY = pdf.lastAutoTable?.finalY || currentY + 100;
                    
                    const summaryData: any[] = [
                        [{ content: "PARAMETROS", styles: { fontStyle: 'bold', lineWidth: { bottom: 0.1 } } }, { content: "PRODUCCIÓN", styles: { fontStyle: 'bold', lineWidth: { bottom: 0.1 } } }, { content: "", styles: { fontStyle: 'bold', lineWidth: { bottom: 0.1 } } }],
                        ["FLETE PAGADO", `Bs. ${fletePagado.toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`, ""],
                        ["FLETE DESTINO", `Bs. ${fleteDestino.toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`, ""],
                        ["CREDITO", `Bs. ${credito.toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`, ""],
                        ["IPOSTEL", `Bs. ${ipostelTotal.toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`, ""],
                        ["SEGURO", `Bs. ${seguroTotal.toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`, ""],
                        ["MANEJO", `Bs. ${manejoTotal.toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`, ""],
                        ["MUDANZA", `Bs. ${mudanza.toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`, ""],
                        [{ content: "", colSpan: 3, styles: { minCellHeight: 5 } }],
                        ["TOTAL GASTOS OFICINA:", `Bs. ${totalGastosOficina.toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`, { content: `${currentUser?.name || 'NOMBRE APELLIDO DEL USUARIO'}\n${roles.find(r => r.id === currentUser?.roleId)?.name || 'OFICINISTA O ROL'}`, styles: { halign: 'center', valign: 'bottom', fontSize: 7, cellPadding: { top: 15 } } }],
                        [{ content: "", colSpan: 3, styles: { minCellHeight: 5 } }],
                        ["TOTAL EMPRESA:", `Bs. ${totalEmpresa.toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`, ""],
                        ["REF $:", refDolaresEmpresa.toFixed(2), ""]
                    ];

                    autoTable(pdf, {
                        startY: finalY + 10,
                        body: summaryData,
                        theme: 'plain',
                        showHead: 'firstPage',
                        styles: { fontSize: 8, cellPadding: 2 },
                        columnStyles: {
                            0: { cellWidth: 60 },
                            1: { cellWidth: 60 },
                            2: { cellWidth: 60 }
                        },
                        didDrawCell: function(data) {
                            if (data.row.index === 9 && data.column.index === 2) {
                                // Draw signature line
                                pdf.setDrawColor(0, 0, 0);
                                pdf.setLineWidth(0.5);
                                pdf.line(data.cell.x + 5, data.cell.y + 10, data.cell.x + data.cell.width - 5, data.cell.y + 10);
                            }
                            if (data.row.index === 0) {
                                pdf.setDrawColor(0, 0, 0);
                                pdf.setLineWidth(0.5);
                                pdf.line(data.cell.x, data.cell.y + data.cell.height, data.cell.x + data.cell.width, data.cell.y + data.cell.height);
                            }
                            if (data.row.index === 8 || data.row.index === 11) {
                                pdf.setDrawColor(0, 0, 0);
                                pdf.setLineWidth(0.5);
                                pdf.line(data.cell.x, data.cell.y, data.cell.x + data.cell.width, data.cell.y);
                            }
                        }
                    });
                }
            }

            pdf.save(`${sheetName}_${new Date(Date.now() - new Date().getTimezoneOffset() * 60000).toISOString().split('T')[0]}.pdf`);
        } catch (error) {
            console.error("Error generating PDF:", error);
            alert("Hubo un error al generar el PDF.");
        }
    };
    
    const renderReportContent = () => {
        const tableReports = ['general_envios', 'libro_venta', 'cuentas_cobrar', 'cuentas_pagar', 'facturas_anuladas', 'ipostel', 'seguro', 'clientes', 'reporte_kilogramos', 'iva', 'reporte_comisiones'];
        const cardReports = ['cuadre_caja', 'envios_oficina', 'gastos_oficina', 'reporte_envios_vehiculo'];

        // --- Render Card-Based Reports ---
        if (cardReports.includes(report.id)) {
            const data = reportData as any[];
            if ((!data || data.length === 0) && report.id !== 'cuadre_caja') return <p className="text-center py-10 text-gray-500">No hay datos para mostrar en el período seleccionado.</p>;

            switch(report.id) {
                case 'cuadre_caja':
                    if (!data || data.length === 0) return (
                        <div className="text-center py-10 bg-white dark:bg-gray-800 rounded-lg border border-dashed border-gray-300 dark:border-gray-700">
                            <p className="text-gray-500 dark:text-gray-400">Seleccione una fecha para ver el Cuadre de Caja.</p>
                        </div>
                    );
                    const reportDataObj = data[0];
                    if (!reportDataObj) return null;
                    
                    const totalIncome = reportDataObj.paymentMethods.reduce((sum: number, pm: any) => sum + pm.income, 0);
                    const totalExpense = reportDataObj.paymentMethods.reduce((sum: number, pm: any) => sum + pm.expense, 0);
                    const saldoFinal = totalIncome - totalExpense;

                    let sumFlete = 0, sumFleteUSD = 0;
                    let sumSeguro = 0, sumSeguroUSD = 0;
                    let sumManejo = 0, sumManejoUSD = 0;
                    let sumIpostel = 0, sumIpostelUSD = 0;
                    let sumTotalEnvio = 0, sumTotalEnvioUSD = 0;
                    let sumTotalAmount = 0, sumTotalAmountUSD = 0;
                    
                    let totalPagadas = 0, totalPagadasUSD = 0;
                    let totalCobroDestino = 0;
                    let totalCredito = 0;

                    const invoiceRows = reportDataObj.invoices.map((inv: Invoice) => {
                        const fin = calculateFinancialDetails(inv.guide, companyInfo);
                        const rate = inv.exchangeRate || companyInfo.exchangeRate || 1;
                        
                        const handling = inv.Montomanejo !== undefined ? inv.Montomanejo : fin.handling;
                        const ipostel = inv.ipostelFee !== undefined ? inv.ipostelFee : fin.ipostel;
                        const freight = fin.freight;
                        const insuranceCost = fin.insuranceCost;
                        const totalEnvio = freight + insuranceCost + handling + ipostel;
                        
                        sumFlete += freight; sumFleteUSD += freight / rate;
                        sumSeguro += insuranceCost; sumSeguroUSD += insuranceCost / rate;
                        sumManejo += handling; sumManejoUSD += handling / rate;
                        sumIpostel += ipostel; sumIpostelUSD += ipostel / rate;
                        sumTotalEnvio += totalEnvio; sumTotalEnvioUSD += totalEnvio / rate;
                        sumTotalAmount += inv.totalAmount; sumTotalAmountUSD += inv.totalAmount / rate;
                        
                        let status = 'Pagadas';
                        if (inv.guide.paymentType === 'flete-destino') status = 'Cobro a Destino';
                        else {
                            const pm = paymentMethods.find(p => p.id === inv.guide.paymentMethodId);
                            const isCredito = pm?.type === 'Credito' || pm?.name?.toLowerCase().includes('credito') || pm?.name?.toLowerCase().includes('crédito');
                            if (isCredito) status = 'Crédito';
                        }
                        
                        if (status === 'Cobro a Destino') totalCobroDestino += inv.totalAmount;
                        else if (status === 'Crédito') totalCredito += inv.totalAmount;
                        else {
                            totalPagadas += inv.totalAmount;
                            totalPagadasUSD += inv.totalAmount / rate;
                        }

                        return {
                            id: inv.id,
                            invoiceNumber: inv.invoiceNumber,
                            date: inv.date.split('T')[0].split('-').reverse().join('/'),
                            client: inv.clientName || 'Consumidor Final',
                            status: status,
                            totalAmount: inv.totalAmount,
                            totalAmountUSD: inv.totalAmount / rate,
                            freight, freightUSD: freight / rate,
                            insuranceCost, insuranceCostUSD: insuranceCost / rate,
                            handling, handlingUSD: handling / rate,
                            ipostel, ipostelUSD: ipostel / rate,
                            totalEnvio, totalEnvioUSD: totalEnvio / rate
                        };
                    });

                    return (
                        <div className="space-y-6">
                            {/* Report Header with Date */}
                            <div className="flex justify-between items-center bg-white dark:bg-gray-800 p-4 rounded-lg shadow-sm border border-gray-100 dark:border-gray-700">
                                <div>
                                    <h2 className="text-xl font-bold text-gray-900 dark:text-white">Cuadre de Caja</h2>
                                    <p className="text-sm text-gray-500">Período: {startDate || 'Inicio'} al {endDate || 'Fin'}</p>
                                </div>
                                <div className="text-right">
                                    <p className="text-xs text-gray-400 uppercase tracking-wider">Fecha de Reporte</p>
                                    <p className="text-sm font-medium text-gray-700 dark:text-gray-300">{new Date().toLocaleDateString('es-VE')}</p>
                                </div>
                            </div>

                            {/* Summary Cards */}
                            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                                <Card className="bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800">
                                    <div className="p-4">
                                        <p className="text-sm font-medium text-blue-600 dark:text-blue-400">Producción del Día</p>
                                        <p className="text-2xl font-bold text-blue-900 dark:text-blue-100">{formatCurrency(reportDataObj.produccionDelDia)}</p>
                                        <p className="text-xs text-blue-500 mt-1">{reportDataObj.invoices.length} facturas generadas</p>
                                    </div>
                                </Card>
                                <Card className="bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800">
                                    <div className="p-4">
                                        <p className="text-sm font-medium text-green-600 dark:text-green-400">Total Ingresos (Pagados)</p>
                                        <p className="text-2xl font-bold text-green-900 dark:text-green-100">{formatCurrency(totalIncome)}</p>
                                    </div>
                                </Card>
                                <Card className="bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800">
                                    <div className="p-4">
                                        <p className="text-sm font-medium text-red-600 dark:text-red-400">Total Egresos</p>
                                        <p className="text-2xl font-bold text-red-900 dark:text-red-100">{formatCurrency(totalExpense)}</p>
                                    </div>
                                </Card>
                                <Card className="bg-gray-50 dark:bg-gray-800 border-gray-200 dark:border-gray-700">
                                    <div className="p-4">
                                        <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Saldo en Caja</p>
                                        <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">{formatCurrency(saldoFinal)}</p>
                                    </div>
                                </Card>
                            </div>

                            {/* Payment Methods Breakdown */}
                            <h3 className="text-lg font-bold text-gray-900 dark:text-white mt-6 mb-4">Desglose por Método de Pago</h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                {reportDataObj.paymentMethods.map((pm: any) => (
                                    <Card key={pm.id} className="p-4">
                                        <h4 className="font-bold text-md text-gray-800 dark:text-gray-200 border-b pb-2 mb-3">{pm.name}</h4>
                                        <div className="space-y-2">
                                            <div className="flex justify-between">
                                                <span className="text-sm text-gray-500">Ingresos:</span>
                                                <span className="font-semibold text-green-600">{formatCurrency(pm.income)}</span>
                                            </div>
                                            <div className="flex justify-between">
                                                <span className="text-sm text-gray-500">Egresos:</span>
                                                <span className="font-semibold text-red-600">{formatCurrency(pm.expense)}</span>
                                            </div>
                                            <div className="flex justify-between pt-2 border-t">
                                                <span className="text-sm font-bold text-gray-700 dark:text-gray-300">Saldo:</span>
                                                <span className="font-bold text-gray-900 dark:text-white">{formatCurrency(pm.income - pm.expense)}</span>
                                            </div>
                                        </div>
                                    </Card>
                                ))}
                            </div>

                            {/* Invoices List */}
                            <h3 className="text-lg font-bold text-gray-900 dark:text-white mt-8 mb-4">Detalle por Factura</h3>
                            <div className="overflow-x-auto bg-white dark:bg-gray-800 rounded-lg shadow border border-gray-200 dark:border-gray-700">
                                <table className="min-w-full text-sm text-left text-gray-500 dark:text-gray-400">
                                    <thead className="text-xs text-gray-700 uppercase bg-gray-50 dark:bg-gray-700 dark:text-gray-400 border-b border-gray-200 dark:border-gray-700">
                                        <tr>
                                            <th className="px-4 py-3">Factura N°</th>
                                            <th className="px-4 py-3">Fecha</th>
                                            <th className="px-4 py-3">Cliente</th>
                                            <th className="px-4 py-3">Estado</th>
                                            <th className="px-4 py-3 text-right">Flete</th>
                                            <th className="px-4 py-3 text-right">Ipostel</th>
                                            <th className="px-4 py-3 text-right">Seguro</th>
                                            <th className="px-4 py-3 text-right">Manejo</th>
                                            <th className="px-4 py-3 text-right">Monto Total</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                                        {invoiceRows.map((row: any) => (
                                            <tr key={row.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                                                <td className="px-4 py-3 font-medium text-gray-900 dark:text-white">{row.invoiceNumber}</td>
                                                <td className="px-4 py-3 text-gray-900 dark:text-white">{row.date}</td>
                                                <td className="px-4 py-3 text-gray-900 dark:text-white">{row.client}</td>
                                                <td className="px-4 py-3 text-gray-900 dark:text-white">{row.status}</td>
                                                <td className="px-4 py-3 text-right">
                                                    <div className="text-gray-900 dark:text-white">{formatCurrency(row.freight)}</div>
                                                    <div className="text-xs text-gray-400">${row.freightUSD.toFixed(2)}</div>
                                                </td>
                                                <td className="px-4 py-3 text-right">
                                                    <div className="text-gray-900 dark:text-white">{formatCurrency(row.ipostel)}</div>
                                                    <div className="text-xs text-gray-400">${row.ipostelUSD.toFixed(2)}</div>
                                                </td>
                                                <td className="px-4 py-3 text-right">
                                                    <div className="text-gray-900 dark:text-white">{formatCurrency(row.insuranceCost)}</div>
                                                    <div className="text-xs text-gray-400">${row.insuranceCostUSD.toFixed(2)}</div>
                                                </td>
                                                <td className="px-4 py-3 text-right">
                                                    <div className="text-gray-900 dark:text-white">{formatCurrency(row.handling)}</div>
                                                    <div className="text-xs text-gray-400">${row.handlingUSD.toFixed(2)}</div>
                                                </td>
                                                <td className="px-4 py-3 text-right font-medium text-gray-900 dark:text-white">
                                                    <div>{formatCurrency(row.totalAmount)}</div>
                                                    <div className="text-xs text-gray-400">${row.totalAmountUSD.toFixed(2)}</div>
                                                </td>
                                            </tr>
                                        ))}
                                        {invoiceRows.length === 0 && (
                                            <tr>
                                                <td colSpan={9} className="px-4 py-8 text-center text-gray-500">No hay facturas en este período.</td>
                                            </tr>
                                        )}
                                        {invoiceRows.length > 0 && (
                                            <tr className="bg-gray-100 dark:bg-gray-700 font-bold">
                                                <td colSpan={4} className="px-4 py-3 text-right text-gray-900 dark:text-white">TOTAL GENERAL</td>
                                                <td className="px-4 py-3 text-right text-gray-900 dark:text-white">
                                                    <div>{formatCurrency(sumFlete)}</div>
                                                    <div className="text-xs text-gray-500">${sumFleteUSD.toFixed(2)}</div>
                                                </td>
                                                <td className="px-4 py-3 text-right text-gray-900 dark:text-white">
                                                    <div>{formatCurrency(sumIpostel)}</div>
                                                    <div className="text-xs text-gray-500">${sumIpostelUSD.toFixed(2)}</div>
                                                </td>
                                                <td className="px-4 py-3 text-right text-gray-900 dark:text-white">
                                                    <div>{formatCurrency(sumSeguro)}</div>
                                                    <div className="text-xs text-gray-500">${sumSeguroUSD.toFixed(2)}</div>
                                                </td>
                                                <td className="px-4 py-3 text-right text-gray-900 dark:text-white">
                                                    <div>{formatCurrency(sumManejo)}</div>
                                                    <div className="text-xs text-gray-500">${sumManejoUSD.toFixed(2)}</div>
                                                </td>
                                                <td className="px-4 py-3 text-right text-gray-900 dark:text-white">
                                                    <div>{formatCurrency(sumTotalAmount)}</div>
                                                    <div className="text-xs text-gray-500">${sumTotalAmountUSD.toFixed(2)}</div>
                                                </td>
                                            </tr>
                                        )}
                                    </tbody>
                                </table>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mt-8">
                                {/* Subtotales Enviadas */}
                                <div>
                                    <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4">Subtotales Enviadas</h3>
                                    <Card className="p-0 overflow-hidden">
                                        <table className="min-w-full text-sm text-left text-gray-500 dark:text-gray-400">
                                            <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                                                <tr className="bg-white dark:bg-gray-800">
                                                    <td className="px-4 py-3 font-medium text-gray-900 dark:text-white">Facturas Pagadas</td>
                                                    <td className="px-4 py-3 text-right font-bold text-green-600">{formatCurrency(totalPagadas)}</td>
                                                </tr>
                                                <tr className="bg-gray-50 dark:bg-gray-800/50">
                                                    <td className="px-4 py-3 font-medium text-gray-900 dark:text-white">Facturas Cobro a Destino</td>
                                                    <td className="px-4 py-3 text-right font-bold text-blue-600">{formatCurrency(totalCobroDestino)}</td>
                                                </tr>
                                                <tr className="bg-white dark:bg-gray-800">
                                                    <td className="px-4 py-3 font-medium text-gray-900 dark:text-white">Facturas a Crédito</td>
                                                    <td className="px-4 py-3 text-right font-bold text-orange-600">{formatCurrency(totalCredito)}</td>
                                                </tr>
                                            </tbody>
                                        </table>
                                    </Card>
                                </div>

                                {/* Cuadre */}
                                <div>
                                    <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4">Cuadre</h3>
                                    <Card className="p-0 overflow-hidden bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800">
                                        <table className="min-w-full text-sm text-left text-gray-500 dark:text-gray-400">
                                            <tbody className="divide-y divide-blue-200 dark:divide-blue-800">
                                                <tr>
                                                    <td className="px-4 py-4 font-bold text-blue-900 dark:text-blue-100">Monto en Caja (Bs)</td>
                                                    <td className="px-4 py-4 text-right font-bold text-xl text-blue-900 dark:text-blue-100">{formatCurrency(totalPagadas)}</td>
                                                </tr>
                                                <tr>
                                                    <td className="px-4 py-4 font-bold text-blue-900 dark:text-blue-100">Referencia en Divisas ($)</td>
                                                    <td className="px-4 py-4 text-right font-bold text-xl text-blue-900 dark:text-blue-100">${totalPagadasUSD.toFixed(2)}</td>
                                                </tr>
                                            </tbody>
                                        </table>
                                    </Card>
                                </div>
                            </div>

                            {/* Firma del Oficinista */}
                            <div className="mt-16 pt-8 border-t border-gray-200 dark:border-gray-700 flex justify-center">
                                <div className="text-center w-64">
                                    <div className="border-b border-gray-400 dark:border-gray-500 mb-2 h-8"></div>
                                    <p className="font-bold text-gray-900 dark:text-white">Firma del Oficinista</p>
                                    <p className="text-sm text-gray-500 dark:text-gray-400">{currentUser?.name || 'Usuario Desconocido'}</p>
                                </div>
                            </div>
                        </div>
                    );
                case 'envios_oficina':
                     return (
                         <table className="min-w-full text-sm text-black">
                             <thead className="bg-gray-50 dark:bg-gray-700/50">
                                 <tr>
                                     <th className="px-4 py-2 text-left text-xs font-semibold uppercase tracking-wider text-black">Oficina</th>
                                     <th className="px-4 py-2 text-center text-xs font-semibold uppercase tracking-wider text-black">N° Envíos</th>
                                     <th className="px-4 py-2 text-right text-xs font-semibold uppercase tracking-wider text-black">Total Kg</th>
                                     <th className="px-4 py-2 text-right text-xs font-semibold uppercase tracking-wider text-black">Total Facturado</th>
                                     <th className="px-4 py-2 text-right text-xs font-semibold uppercase tracking-wider text-black">Promedio / Envío</th>
                                 </tr>
                             </thead>
                             <tbody className="divide-y divide-gray-200 dark:divide-gray-700 text-black">
                                 {data.map(d => (
                                     <tr key={d.id}>
                                         <td className="px-4 py-3 font-semibold">{d.name}</td>
                                         <td className="px-4 py-3 text-center">{d.envios}</td>
                                         <td className="px-4 py-3 text-right">{d.totalKg.toFixed(2)}</td>
                                         <td className="px-4 py-3 text-right font-bold">{formatCurrency(d.totalFacturado)}</td>
                                         <td className="px-4 py-3 text-right">{formatCurrency(d.envios > 0 ? d.totalFacturado / d.envios : 0)}</td>
                                     </tr>
                                 ))}
                             </tbody>
                         </table>
                    );
                case 'gastos_oficina':
                    return (
                        <div className="space-y-4">
                            {data.map(d => (
                                <Card key={d.id} className="p-0 overflow-hidden">
                                    <button onClick={() => setExpandedCard(expandedCard === d.id ? null : d.id)} className="w-full text-left bg-gray-50 dark:bg-gray-800/50 p-4 flex justify-between items-center hover:bg-gray-100 dark:hover:bg-gray-700/50 transition">
                                        <div>
                                            <h4 className="font-bold text-lg text-black">{d.name}</h4>
                                            <p className="text-sm text-gray-500">{d.count} gasto(s) registrado(s)</p>
                                        </div>
                                        <div className="flex items-center gap-4">
                                            <span className="text-xl font-bold text-red-600">{formatCurrency(d.total)}</span>
                                            <div className={`transform transition-transform duration-300 ${expandedCard === d.id ? 'rotate-180' : ''}`}>
                                                <ChevronDownIcon className="w-6 h-6 text-gray-500" />
                                            </div>
                                        </div>
                                    </button>
                                    <div className={`grid transition-all duration-500 ease-in-out ${expandedCard === d.id ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0'}`}>
                                        <div className="overflow-hidden">
                                            <div className="p-4 border-t dark:border-gray-700 max-h-60 overflow-y-auto">
                                                <table className="min-w-full text-sm">
                                                    <thead>
                                                        <tr className="text-black">
                                                            <th className="text-left py-1 text-black">Fecha</th>
                                                            <th className="text-left py-1 text-black">Descripción</th>
                                                            <th className="text-left py-1 text-black">Categoría</th>
                                                            <th className="text-right py-1 text-black">Monto</th>
                                                        </tr>
                                                    </thead>
                                                    <tbody className="text-black">
                                                        {d.expenses.map((exp: Expense) => (
                                                            <tr key={exp.id} className="border-t dark:border-gray-700">
                                                                <td className="py-1.5">{exp.date}</td>
                                                                <td className="py-1.5">{exp.description}</td>
                                                                <td className="py-1.5">{exp.category}</td>
                                                                <td className="text-right py-1.5">{formatCurrency(exp.amount)}</td>
                                                            </tr>
                                                        ))}
                                                    </tbody>
                                                </table>
                                            </div>
                                        </div>
                                    </div>
                                </Card>
                            ))}
                        </div>
                    );
                case 'reporte_envios_vehiculo':
                     return (
                        <div className="space-y-6">
                            {data.map((d, index) => {
                                const totalAmount = d.invoices.reduce((sum: number, inv: Invoice) => sum + inv.totalAmount, 0);
                                const totalKg = d.invoices.reduce((sum: number, inv: Invoice) => sum + calculateInvoiceChargeableWeight(inv), 0);
                                return (
                                <Card key={index} className="p-0 overflow-hidden">
                                    <button onClick={() => setExpandedCard(d.vehicle.id)} className="w-full text-left bg-gray-50 dark:bg-gray-800/50 p-4 flex items-center gap-4 hover:bg-gray-100 dark:hover:bg-gray-700/50 transition">
                                        <TruckIcon className="w-8 h-8 text-primary-500 shrink-0"/>
                                        <div className="flex-grow">
                                            <h4 className="font-bold text-lg text-black">{d.vehicle ? `${d.vehicle.modelo} - ${d.vehicle.placa}` : 'Vehículo no encontrado'}</h4>
                                            <p className="text-sm text-gray-500">Asociado: {d.asociado?.nombre || 'N/A'} | Total: {d.invoices.length} facturas | {formatCurrency(totalAmount)} | {totalKg.toFixed(2)} Kg</p>
                                        </div>
                                        <div className={`transform transition-transform duration-300 ${expandedCard === d.vehicle.id ? 'rotate-180' : ''}`}>
                                            <ChevronDownIcon className="w-6 h-6 text-gray-500" />
                                        </div>
                                    </button>
                                    <div className={`grid transition-all duration-500 ease-in-out ${expandedCard === d.vehicle.id ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0'}`}>
                                        <div className="overflow-hidden">
                                            <div className="p-4 max-h-60 overflow-y-auto border-t dark:border-gray-700">
                                                <table className="min-w-full text-sm">
                                                    <thead><tr className="text-black"><th className="text-left py-1 text-black">Factura #</th><th className="text-left py-1 text-black">Cliente</th><th className="text-right py-1 text-black">Monto</th><th className="text-right py-1 text-black">Kg</th></tr></thead>
                                                    <tbody className="text-black">
                                                    {d.invoices.map((inv: Invoice) => <tr key={inv.id} className="border-t dark:border-gray-700"><td className="py-1.5">{inv.invoiceNumber}</td><td className="py-1.5">{inv.clientName}</td><td className="text-right py-1.5">{formatCurrency(inv.totalAmount)}</td><td className="text-right py-1.5">{calculateInvoiceChargeableWeight(inv).toFixed(2)}</td></tr>)}
                                                    </tbody>
                                                </table>
                                            </div>
                                        </div>
                                    </div>
                                </Card>
                            )})}
                        </div>
                    );
            }
        }
        
        // --- Render Paginated Table Reports ---
        if (tableReports.includes(report.id)) {
            let headers: string[] = [];
            let body;
            let footer;
            let summary = null;
            
            switch (report.id) {
                case 'general_envios':
                    headers = ["Fecha", "N° Factura", "Cliente", "Tipo de Envío", "Flete", "Seguro", "Manejo", "Ipostel", "Kg", "Paq.", "Total"];
                    body = (paginatedData as unknown as Invoice[]).map(inv => {
                        const fin = calculateFinancialDetails(inv.guide, companyInfo);
                        const kg = calculateInvoiceChargeableWeight(inv);
                        const paquetes = inv.guide.merchandise.reduce((acc, m) => acc + (parseFloat(String(m.quantity)) || 1), 0);
                        const tipoEnvio = inv.guide.paymentType === 'flete-destino' ? 'Destino' : 'Pagado';
                        return (
                            <tr key={inv.id}>
                                <td className="px-2 py-2">{inv.date.split('T')[0].split('-').reverse().join('/')}</td>
                                <td className="px-2 py-2">{inv.invoiceNumber}</td>
                                <td className="px-2 py-2 max-w-[150px] truncate" title={inv.clientName}>{inv.clientName}</td>
                                <td className="px-2 py-2 text-center text-xs font-semibold">{tipoEnvio}</td>
                                <td className="px-2 py-2 text-right">{formatCurrency(fin.freight)}</td>
                                <td className="px-2 py-2 text-right">{formatCurrency(fin.insuranceCost)}</td>
                                <td className="px-2 py-2 text-right">{formatCurrency(fin.handling)}</td>
                                <td className="px-2 py-2 text-right">{formatCurrency(fin.ipostel)}</td>
                                <td className="px-2 py-2 text-right">{kg.toFixed(2)}</td>
                                <td className="px-2 py-2 text-center">{paquetes}</td>
                                <td className="px-2 py-2 text-right font-medium">{formatCurrency(inv.totalAmount)}</td>
                            </tr>
                        );
                    });
                    const generalTotalsUI = (reportData as Invoice[]).reduce((acc, inv) => { 
                        const fin = calculateFinancialDetails(inv.guide, companyInfo);
                        acc.flete += fin.freight;
                        acc.total += inv.totalAmount; 
                        return acc; 
                    }, { flete: 0, total: 0 });
                    footer = (<tfoot className="bg-gray-100 dark:bg-gray-800/80 font-bold text-black"><tr><td colSpan={4} className="px-2 py-3 text-left uppercase">TOTALES</td><td className="px-2 py-3 text-right">{formatCurrency(generalTotalsUI.flete)}</td><td colSpan={5}></td><td className="px-2 py-3 text-right">{formatCurrency(generalTotalsUI.total)}</td></tr></tfoot>);
                    
                    let fletePagado = 0;
                    let fleteDestino = 0;
                    let credito = 0;
                    let ipostelTotal = 0;
                    let seguroTotal = 0;
                    let manejoTotal = 0;
                    let mudanza = 0;

                    (reportData as Invoice[]).forEach(inv => {
                        const fin = calculateFinancialDetails(inv.guide, companyInfo);
                        const st = shippingTypes.find(s => s.id === inv.guide.shippingTypeId);
                        const isMudanza = st?.name.toLowerCase().includes('mudanza');

                        if (isMudanza) {
                            mudanza += fin.freight;
                        } else {
                            if (inv.guide.paymentType === 'flete-pagado') {
                                fletePagado += fin.freight;
                            } else if (inv.guide.paymentType === 'flete-destino') {
                                fleteDestino += fin.freight;
                            }
                        }
                        
                        ipostelTotal += fin.ipostel;
                        seguroTotal += fin.insuranceCost;
                        manejoTotal += fin.handling;
                    });

                    const empresaPagado = fletePagado * 0.30;
                    const empresaDestino = fleteDestino * 0.30;

                    const totalGeneral = empresaPagado + empresaDestino + credito + ipostelTotal + seguroTotal + manejoTotal + mudanza;
                    const refDolares = companyInfo.bcvRate > 0 ? totalGeneral / companyInfo.bcvRate : 0;
                    const totalGastosOficina = dateFilteredExpenses.reduce((sum, exp) => sum + exp.amount, 0);
                    const totalEmpresa = generalTotalsUI.total - totalGastosOficina;
                    const refDolaresEmpresa = companyInfo.bcvRate > 0 ? totalEmpresa / companyInfo.bcvRate : 0;

                    summary = (
                        <div className="mt-8 pt-4 w-full max-w-3xl text-black">
                            <div className="grid grid-cols-3 gap-4 mb-2 text-sm font-bold border-b-2 border-black pb-2">
                                <div>PARAMETROS</div>
                                <div>PRODUCCIÓN</div>
                                <div></div>
                            </div>
                            <div className="space-y-2 text-sm">
                                <div className="grid grid-cols-3 gap-4">
                                    <div>FLETE PAGADO</div>
                                    <div>{formatCurrency(fletePagado)}</div>
                                    <div></div>
                                </div>
                                <div className="grid grid-cols-3 gap-4">
                                    <div>FLETE DESTINO</div>
                                    <div>{formatCurrency(fleteDestino)}</div>
                                    <div></div>
                                </div>
                                <div className="grid grid-cols-3 gap-4">
                                    <div>CREDITO</div>
                                    <div>{formatCurrency(credito)}</div>
                                    <div></div>
                                </div>
                                <div className="grid grid-cols-3 gap-4">
                                    <div>IPOSTEL</div>
                                    <div>{formatCurrency(ipostelTotal)}</div>
                                    <div></div>
                                </div>
                                <div className="grid grid-cols-3 gap-4">
                                    <div>SEGURO</div>
                                    <div>{formatCurrency(seguroTotal)}</div>
                                    <div></div>
                                </div>
                                <div className="grid grid-cols-3 gap-4">
                                    <div>MANEJO</div>
                                    <div>{formatCurrency(manejoTotal)}</div>
                                    <div></div>
                                </div>
                                <div className="grid grid-cols-3 gap-4">
                                    <div>MUDANZA</div>
                                    <div>{formatCurrency(mudanza)}</div>
                                    <div></div>
                                </div>
                            </div>
                            
                            <div className="mt-4 pt-4 border-t-2 border-black text-sm">
                                <div className="grid grid-cols-3 gap-4 items-end">
                                    <div>TOTAL GASTOS<br/>OFICINA:</div>
                                    <div>{formatCurrency(totalGastosOficina)}</div>
                                    <div className="text-center">
                                        <div className="border-b border-black w-full mb-2"></div>
                                        <div className="text-xs uppercase">
                                            {currentUser?.name || 'NOMBRE APELLIDO DEL USUARIO'}<br/>
                                            {roles.find(r => r.id === currentUser?.roleId)?.name || 'OFICINISTA O ROL'}
                                        </div>
                                    </div>
                                </div>
                            </div>
                            
                            <div className="mt-4 pt-4 border-t-2 border-black text-sm">
                                <div className="grid grid-cols-3 gap-4">
                                    <div>TOTAL EMPRESA:</div>
                                    <div>{formatCurrency(totalEmpresa)}</div>
                                    <div></div>
                                </div>
                                <div className="grid grid-cols-3 gap-4 mt-2">
                                    <div>REF $:</div>
                                    <div>{refDolaresEmpresa.toFixed(2)}</div>
                                    <div></div>
                                </div>
                            </div>
                        </div>
                    );
                    break;
                case 'libro_venta':
                     headers = ["Fecha", "Factura", "Oficina", "Cliente", "RIF", "Total", "Flete", "IVA", "IPOSTEL"];
                     body = (paginatedData as unknown as Invoice[]).map(inv => {
                        const fin = calculateFinancialDetails(inv.guide, companyInfo);
                        const originOffice = offices.find(o => o.id === inv.guide.originOfficeId)?.name || 'N/A';
                        return (<tr key={inv.id} className={inv.status === 'Anulada' ? 'text-red-500 line-through' : ''}><td className="px-2 py-2">{inv.date.split('T')[0].split('-').reverse().join('/')}</td><td className="px-2 py-2">{inv.invoiceNumber}</td><td className="px-2 py-2">{originOffice}</td><td className="px-2 py-2">{inv.clientName}</td><td className="px-2 py-2">{inv.clientIdNumber}</td><td className="px-2 py-2 text-right">{inv.status === 'Anulada' ? 'ANULADA' : formatCurrency(fin.total)}</td><td className="px-2 py-2 text-right">{inv.status === 'Anulada' ? '0.00' : formatCurrency(fin.freight)}</td><td className="px-2 py-2 text-right">{inv.status === 'Anulada' ? '0.00' : formatCurrency(fin.iva)}</td><td className="px-2 py-2 text-right">{inv.status === 'Anulada' ? '0.00' : formatCurrency(fin.ipostel)}</td></tr>);
                     });
                     const libroVentaTotals = (reportData as Invoice[]).reduce((acc, inv) => { if (inv.status !== 'Anulada') { const fin = calculateFinancialDetails(inv.guide, companyInfo); acc.total += fin.total; acc.flete += fin.freight; acc.iva += fin.iva; acc.ipostel += fin.ipostel; } return acc; }, { total: 0, flete: 0, iva: 0, ipostel: 0 });
                     footer = (<tfoot className="bg-gray-100 dark:bg-gray-800/80 font-bold text-black"><tr><td colSpan={5} className="px-2 py-3 text-left">TOTALES</td><td className="px-2 py-3 text-right">{formatCurrency(libroVentaTotals.total)}</td><td className="px-2 py-3 text-right">{formatCurrency(libroVentaTotals.flete)}</td><td className="px-2 py-3 text-right">{formatCurrency(libroVentaTotals.iva)}</td><td className="px-2 py-3 text-right">{formatCurrency(libroVentaTotals.ipostel)}</td></tr></tfoot>);
                     break;
                case 'cuentas_cobrar':
                    headers = ["Fecha Emisión", "Factura", "Oficina", "Cliente", "Teléfono", "Días Vencidos", "Monto Pendiente"];
                    body = (paginatedData as unknown as Invoice[]).map(inv => {
                         const days = Math.floor((new Date().getTime() - new Date(inv.date).getTime()) / (1000 * 3600 * 24));
                         const client = clients.find(c => c.idNumber === inv.clientIdNumber);
                         const originOffice = offices.find(o => o.id === inv.guide.originOfficeId)?.name || 'N/A';
                        return (<tr key={inv.id}><td className="px-2 py-2">{inv.date}</td><td className="px-2 py-2">{inv.invoiceNumber}</td><td className="px-2 py-2">{originOffice}</td><td className="px-2 py-2">{inv.clientName}</td><td className="px-2 py-2">{client?.phone}</td><td className="px-2 py-2 text-center">{days}</td><td className="px-2 py-2 text-right font-semibold">{formatCurrency(inv.totalAmount)}</td></tr>)
                    });
                    const cxcTotals = (reportData as Invoice[]).reduce((acc, inv) => { acc.total += inv.totalAmount; return acc; }, { total: 0 });
                    footer = (<tfoot className="bg-gray-100 dark:bg-gray-800/80 font-bold text-black"><tr><td colSpan={6} className="px-2 py-3 text-left">TOTAL PENDIENTE</td><td className="px-2 py-3 text-right">{formatCurrency(cxcTotals.total)}</td></tr></tfoot>);
                    break;
                case 'cuentas_pagar':
                    headers = ["Fecha", "Proveedor", "RIF", "Factura Prov.", "Días Vencidos", "Monto Pendiente"];
                    body = (paginatedData as unknown as Expense[]).map(exp => {
                         const days = Math.floor((new Date().getTime() - new Date(exp.date).getTime()) / (1000 * 3600 * 24));
                        return (<tr key={exp.id}><td className="px-2 py-2">{exp.date}</td><td className="px-2 py-2">{exp.supplierName}</td><td className="px-2 py-2">{exp.supplierRif}</td><td className="px-2 py-2">{exp.invoiceNumber}</td><td className="px-2 py-2 text-center">{days}</td><td className="px-2 py-2 text-right font-semibold">{formatCurrency(exp.amount)}</td></tr>)
                    });
                    const cxpTotals = (reportData as Expense[]).reduce((acc, exp) => { acc.total += exp.amount; return acc; }, { total: 0 });
                    footer = (<tfoot className="bg-gray-100 dark:bg-gray-800/80 font-bold text-black"><tr><td colSpan={5} className="px-2 py-3 text-left">TOTAL PENDIENTE</td><td className="px-2 py-3 text-right">{formatCurrency(cxpTotals.total)}</td></tr></tfoot>);
                    break;
                case 'facturas_anuladas':
                    headers = ["Fecha", "Factura", "Control", "Oficina", "Cliente", "Monto Original"];
                    body = (paginatedData as unknown as Invoice[]).map(inv => (<tr key={inv.id}><td className="px-2 py-2">{inv.date}</td><td className="px-2 py-2">{inv.invoiceNumber}</td><td className="px-2 py-2">{inv.controlNumber}</td><td className="px-2 py-2">{offices.find(o => o.id === inv.guide.originOfficeId)?.name}</td><td className="px-2 py-2">{inv.clientName}</td><td className="px-2 py-2 text-right">{formatCurrency(inv.totalAmount)}</td></tr>));
                    const anuladasTotals = (reportData as Invoice[]).reduce((acc, inv) => { acc.total += inv.totalAmount; return acc; }, { total: 0 });
                    footer = (<tfoot className="bg-gray-100 dark:bg-gray-800/80 font-bold text-black"><tr><td colSpan={5} className="px-2 py-3 text-left">TOTAL ANULADO</td><td className="px-2 py-3 text-right">{formatCurrency(anuladasTotals.total)}</td></tr></tfoot>);
                    break;
                case 'ipostel':
                    headers = ["Fecha", "Factura", "Oficina", "Cliente", "Paquetes", "Kg", "Base Aporte", "Aporte IPOSTEL"];
                    body = (paginatedData as unknown as Invoice[]).map(inv => {
                        const originOffice = offices.find(o => o.id === inv.guide.originOfficeId)?.name || 'N/A';
                        const ipostelAmount = calculateFinancialDetails(inv.guide, companyInfo).ipostel;
                        const ipostelBase = ipostelAmount > 0 ? ipostelAmount / 0.06 : 0;
                        const kg = calculateInvoiceChargeableWeight(inv);
                        const paquetes = inv.guide.merchandise.reduce((acc, m) => acc + (parseFloat(String(m.quantity)) || 1), 0);
                        return (<tr key={inv.id}><td className="px-2 py-2">{inv.date}</td><td className="px-2 py-2">{inv.invoiceNumber}</td><td className="px-2 py-2">{originOffice}</td><td className="px-2 py-2">{inv.clientName}</td><td className="px-2 py-2 text-center">{paquetes}</td><td className="px-2 py-2 text-right">{kg.toFixed(2)}</td><td className="px-2 py-2 text-right">{formatCurrency(ipostelBase)}</td><td className="px-2 py-2 text-right font-semibold">{formatCurrency(ipostelAmount)}</td></tr>)
                    });
                    const ipostelTotals = (reportData as Invoice[]).reduce((acc, inv) => { const ipostelAmount = calculateFinancialDetails(inv.guide, companyInfo).ipostel; const ipostelBase = ipostelAmount > 0 ? ipostelAmount / 0.06 : 0; const kg = calculateInvoiceChargeableWeight(inv); const paquetes = inv.guide.merchandise.reduce((sum, m) => sum + (parseFloat(String(m.quantity)) || 1), 0); acc.kg += kg; acc.base += ipostelBase; acc.ipostel += ipostelAmount; acc.paquetes += paquetes; return acc; }, { kg: 0, base: 0, ipostel: 0, paquetes: 0 });
                    footer = (<tfoot className="bg-gray-100 dark:bg-gray-800/80 font-bold text-black"><tr><td colSpan={4} className="px-2 py-3 text-left">TOTALES</td><td className="px-2 py-3 text-center">{ipostelTotals.paquetes}</td><td className="px-2 py-3 text-right">{ipostelTotals.kg.toFixed(2)}</td><td className="px-2 py-3 text-right">{formatCurrency(ipostelTotals.base)}</td><td className="px-2 py-3 text-right">{formatCurrency(ipostelTotals.ipostel)}</td></tr></tfoot>);
                    break;
                case 'seguro':
                    headers = ["Fecha", "Factura", "Oficina", "Cliente", "Valor Declarado", "Costo Seguro"];
                    body = (paginatedData as unknown as Invoice[]).map(inv => {
                        const originOffice = offices.find(o => o.id === inv.guide.originOfficeId)?.name || 'N/A';
                        return (<tr key={inv.id}><td className="px-2 py-2">{inv.date}</td><td className="px-2 py-2">{inv.invoiceNumber}</td><td className="px-2 py-2">{originOffice}</td><td className="px-2 py-2">{inv.clientName}</td><td className="px-2 py-2 text-right">{formatCurrency(inv.guide.declaredValue)}</td><td className="px-2 py-2 text-right font-semibold">{formatCurrency(calculateFinancialDetails(inv.guide, companyInfo).insuranceCost)}</td></tr>)
                    });
                    const seguroTotals = (reportData as Invoice[]).reduce((acc, inv) => { acc.declared += inv.guide.declaredValue; acc.cost += calculateFinancialDetails(inv.guide, companyInfo).insuranceCost; return acc; }, { declared: 0, cost: 0 });
                    footer = (<tfoot className="bg-gray-100 dark:bg-gray-800/80 font-bold text-black"><tr><td colSpan={4} className="px-2 py-3 text-left">TOTALES</td><td className="px-2 py-3 text-right">{formatCurrency(seguroTotals.declared)}</td><td className="px-2 py-3 text-right">{formatCurrency(seguroTotals.cost)}</td></tr></tfoot>);
                    break;
                case 'clientes':
                    headers = ["RIF/CI", "Cliente", "Teléfono", "N° Envíos", "Monto Facturado"];
                    body = (paginatedData as any[]).map(data => (<tr key={data.id}><td className="px-2 py-2">{data.id}</td><td className="px-2 py-2">{data.name}</td><td className="px-2 py-2">{data.phone}</td><td className="px-2 py-2 text-center">{data.count}</td><td className="px-2 py-2 text-right font-semibold">{formatCurrency(data.total)}</td></tr>));
                    const clientesTotals = (reportData as any[]).reduce((acc, data) => { acc.envios += data.count; acc.monto += data.total; return acc; }, { envios: 0, monto: 0 });
                    footer = (<tfoot className="bg-gray-100 dark:bg-gray-800/80 font-bold text-black"><tr><td colSpan={3} className="px-2 py-3 text-left">TOTALES</td><td className="px-2 py-3 text-center">{clientesTotals.envios}</td><td className="px-2 py-3 text-right">{formatCurrency(clientesTotals.monto)}</td></tr></tfoot>);
                    break;
                case 'reporte_kilogramos':
                    headers = ["Fecha", "Nº Factura", "Oficina", "Cliente", "Total Kilogramos"];
                     body = (paginatedData as unknown as Invoice[]).map(inv => (<tr key={inv.id}><td className="px-2 py-2">{inv.date}</td><td className="px-2 py-2">{inv.invoiceNumber}</td><td className="px-2 py-2">{offices.find(o => o.id === inv.guide.originOfficeId)?.name}</td><td className="px-2 py-2">{inv.clientName}</td><td className="px-2 py-2 text-right font-semibold">{calculateInvoiceChargeableWeight(inv).toFixed(2)} Kg</td></tr>));
                    const kgTotals = (reportData as Invoice[]).reduce((acc, inv) => { acc.kg += calculateInvoiceChargeableWeight(inv); return acc; }, { kg: 0 });
                    footer = (<tfoot className="bg-gray-100 dark:bg-gray-800/80 font-bold text-black"><tr><td colSpan={4} className="px-2 py-3 text-left">TOTAL KG MOVILIZADOS</td><td className="px-2 py-3 text-right">{kgTotals.kg.toFixed(2)} Kg</td></tr></tfoot>);
                    break;
                case 'iva':
                    headers = ["Fecha", "N° Factura", "Oficina", "Cliente", "Monto Total", "IVA (16%)"];
                    body = (paginatedData as unknown as Invoice[]).map(inv => {
                        const fin = calculateFinancialDetails(inv.guide, companyInfo);
                        const originOffice = offices.find(o => o.id === inv.guide.originOfficeId)?.name || 'N/A';
                        return (<tr key={inv.id}><td className="px-2 py-2">{inv.date}</td><td className="px-2 py-2">{inv.invoiceNumber}</td><td className="px-2 py-2">{originOffice}</td><td className="px-2 py-2">{inv.clientName}</td><td className="px-2 py-2 text-right">{formatCurrency(inv.totalAmount)}</td><td className="px-2 py-2 text-right font-semibold">{formatCurrency(fin.iva)}</td></tr>);
                    });
                    const ivaTotals = (reportData as Invoice[]).reduce((acc, inv) => { const fin = calculateFinancialDetails(inv.guide, companyInfo); acc.total += inv.totalAmount; acc.iva += fin.iva; return acc; }, { total: 0, iva: 0 });
                    footer = (<tfoot className="bg-gray-100 dark:bg-gray-800/80 font-bold text-black"><tr><td colSpan={4} className="px-2 py-3 text-left">TOTALES</td><td className="px-2 py-3 text-right">{formatCurrency(ivaTotals.total)}</td><td className="px-2 py-3 text-right">{formatCurrency(ivaTotals.iva)}</td></tr></tfoot>);
                    break;
                case 'reporte_comisiones':
                    headers = ["Nro de Factura", "Oficina", "Kg", "Monto Flete"];
                    body = (paginatedData as unknown as Invoice[]).map(inv => {
                        const originOffice = offices.find(o => o.id === inv.guide.originOfficeId)?.name || 'N/A';
                        const kg = calculateInvoiceChargeableWeight(inv);
                        const freight = calculateFinancialDetails(inv.guide, companyInfo).freight;
                        return (<tr key={inv.id}><td className="px-2 py-2">{inv.invoiceNumber}</td><td className="px-2 py-2">{originOffice}</td><td className="px-2 py-2 text-right">{kg.toFixed(2)}</td><td className="px-2 py-2 text-right font-semibold">{formatCurrency(freight)}</td></tr>);
                    });
                    const comisionesTotals = (reportData as Invoice[]).reduce((acc, inv) => {
                        acc.kg += calculateInvoiceChargeableWeight(inv);
                        acc.freight += calculateFinancialDetails(inv.guide, companyInfo).freight;
                        return acc;
                    }, { kg: 0, freight: 0 });
                    footer = (<tfoot className="bg-gray-100 dark:bg-gray-800/80 font-bold text-black"><tr><td colSpan={2} className="px-2 py-3 text-left">TOTALES</td><td className="px-2 py-3 text-right">{comisionesTotals.kg.toFixed(2)}</td><td className="px-2 py-3 text-right">{formatCurrency(comisionesTotals.freight)}</td></tr></tfoot>);
                    break;
            }

            if (!hasGlobalAccess) {
                const indicesToRemove = headers.map((h, i) => h.toLowerCase().includes('oficina') || h.toLowerCase() === 'origen' || h.toLowerCase() === 'destino' ? i : -1).filter(i => i !== -1);
                
                if (indicesToRemove.length > 0) {
                    headers = headers.filter((_, i) => !indicesToRemove.includes(i));
                    body = React.Children.map(body, tr => {
                        if (!React.isValidElement(tr)) return tr;
                        const tds = React.Children.toArray(tr.props.children).filter((_, index) => !indicesToRemove.includes(index));
                        return React.cloneElement(tr, { children: tds } as any);
                    });
                     if (footer && React.isValidElement(footer)) {
                        footer = React.cloneElement(footer, {
                            children: React.Children.map(footer.props.children, tr => {
                                if (!React.isValidElement(tr)) return tr;
                                const tds: any[] = React.Children.toArray(tr.props.children);
                                if (tds.length > 0 && React.isValidElement(tds[0])) {
                                    const origColSpan = (tds[0].props as any).colSpan || 1;
                                    tds[0] = React.cloneElement(tds[0], { colSpan: Math.max(1, origColSpan - indicesToRemove.length) } as any);
                                }
                                return React.cloneElement(tr, { children: tds } as any);
                            })
                        } as any);
                    }
                }
            }

            return (
                <>
                    <table className="min-w-full text-sm text-black">
                        <thead className="bg-gray-50 dark:bg-gray-700/50"><tr>{headers.map(h => {
                            const isNumeric = h.toLowerCase().includes('monto') || h.toLowerCase().includes('total') || h.toLowerCase() === 'kg' || h.toLowerCase().includes('aporte') || h.toLowerCase().includes('iva') || h.toLowerCase().includes('base') || h.toLowerCase().includes('costo') || h.toLowerCase().includes('flete') || h.toLowerCase().includes('días');
                            return <th key={h} className={`px-2 py-2 text-xs font-semibold uppercase tracking-wider text-black ${isNumeric ? 'text-right' : 'text-left'}`}>{h}</th>
                        })}</tr></thead>
                        <tbody className="divide-y divide-gray-200 dark:divide-gray-700 text-black">{body}</tbody>
                        {footer}
                    </table>
                    <div className="pagination-controls mt-4">
                        <PaginationControls currentPage={currentPage} totalPages={totalPages} onPageChange={setCurrentPage} totalItems={totalItems} itemsPerPage={ITEMS_PER_PAGE} />
                    </div>
                    {summary}
                </>
            );
        }

        return <div className="p-6 text-center text-gray-500">Este reporte no está implementado.</div>;
    };
    
    return (
        <div className="space-y-6">
            <div className="mb-4">
                <Button variant="secondary" onClick={() => window.location.hash = 'reports'}>
                    <ArrowLeftIcon className="w-4 h-4 mr-2" />
                    Volver a Reportes
                </Button>
            </div>
            <Card>
                <CardHeader>
                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                        <div>
                             <CardTitle>{report.title}</CardTitle>
                             <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Filtre por fecha y exporte los datos.</p>
                        </div>
                        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 w-full sm:w-auto">
                           <Input label="" type="date" id="start-date" value={startDate} onChange={e => setStartDate(e.target.value)} />
                           <Input label="" type="date" id="end-date" value={endDate} onChange={e => setEndDate(e.target.value)} />
                           <Button onClick={handleExport} className="w-full sm:w-auto">
                                <FileSpreadsheetIcon className="w-4 h-4 mr-2" />
                                Excel
                           </Button>
                           <Button onClick={handleExportPDF} variant="secondary" className="w-full sm:w-auto">
                                PDF
                           </Button>
                        </div>
                    </div>
                </CardHeader>
                <div className="overflow-x-auto mt-4 text-black p-6 bg-white dark:bg-gray-900" ref={reportRef}>
                    <ReportCompanyHeader 
                        companyInfo={companyInfo} 
                        reportTitle={report.title} 
                        startDate={startDate} 
                        endDate={endDate} 
                        officeName={officeName}
                    />
                    {renderReportContent()}
                </div>
            </Card>
        </div>
    );
};

export default ReportDetailView;
