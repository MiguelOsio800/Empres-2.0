import React, { useMemo, useState } from 'react';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import { Invoice, CompanyInfo, Client, Category, Office, Permissions } from '../../types';
import Modal from '../ui/Modal';
import Button from '../ui/Button';
import { XIcon, PackageIcon, DownloadIcon, SaveIcon, ArrowLeftIcon, ArrowUturnLeftIcon, PlusCircleIcon, ExclamationTriangleIcon } from '../icons/Icons';
import { calculateFinancialDetails } from '../../utils/financials';
import { apiFetch } from '../../utils/api';
import { useToast } from '../ui/ToastProvider';

interface InvoiceDetailViewProps {
    isOpen: boolean;
    onClose: () => void;
    invoice: Invoice;
    companyInfo: CompanyInfo;
    clients: Client[];
    categories: Category[];
    offices?: Office[];
    onCreateCreditNote?: (id: string, reason: string) => Promise<void>;
    onCreateDebitNote?: (id: string, reason: string) => Promise<void>;
    permissions?: Permissions;
}

const InvoiceDetailView: React.FC<InvoiceDetailViewProps> = ({ 
    isOpen, 
    onClose, 
    invoice, 
    companyInfo, 
    clients, 
    categories, 
    offices,
    onCreateCreditNote,
    onCreateDebitNote,
    permissions
}) => {
    
    const [noteMode, setNoteMode] = useState<'none' | 'credit' | 'debit'>('none');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isDownloadingHka, setIsDownloadingHka] = useState(false);
    const { addToast } = useToast();

    const sender = clients.find(c => c.id === invoice.guide.sender.id) || invoice.guide.sender;
    const receiver = clients.find(c => c.id === invoice.guide.receiver.id) || invoice.guide.receiver;
    const originOffice = offices?.find(o => o.id === invoice.guide.originOfficeId);
    const destOffice = offices?.find(o => o.id === invoice.guide.destinationOfficeId);
    
    const financials = useMemo(() => {
        const baseFinancials = calculateFinancialDetails(invoice.guide, companyInfo);
        
        const handling = invoice.Montomanejo !== undefined ? Number(invoice.Montomanejo) : baseFinancials.handling;
        const ipostel = invoice.ipostelFee !== undefined ? Number(invoice.ipostelFee) : baseFinancials.ipostel;
        const total = invoice.totalAmount !== undefined ? Number(invoice.totalAmount) : baseFinancials.total;
        
        const subtotal = (baseFinancials.freight - baseFinancials.discount) + baseFinancials.insuranceCost + handling;
        
        return {
            ...baseFinancials,
            handling,
            ipostel,
            subtotal,
            total
        };
    }, [invoice, companyInfo]);

    const formatCurrency = (amount: number) => `Bs. ${amount.toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    const formatUsd = (amount: number) => `$${amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    const formatInvoiceNumber = (num: string) => num.startsWith('F-') ? num : `F-${num}`;

    const startCreditNote = () => setNoteMode('credit');
    const startDebitNote = () => setNoteMode('debit');
    const cancelNote = () => setNoteMode('none');

    const submitNote = async () => {
        setIsSubmitting(true);
        const defaultReason = noteMode === 'credit' ? "Anulación/Devolución solicitada por usuario" : "Nota de Débito solicitada por usuario";
        try {
            if (noteMode === 'credit' && onCreateCreditNote) {
                await onCreateCreditNote(invoice.id, defaultReason);
                onClose();
            } else if (noteMode === 'debit' && onCreateDebitNote) {
                await onCreateDebitNote(invoice.id, defaultReason);
                onClose();
            }
        } catch (error) {
            console.error(error);
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleDownloadHka = async () => {
        setIsDownloadingHka(true);
        addToast({ 
            type: 'info', 
            title: 'Descarga HKA', 
            message: 'Solicitando factura oficial a The Factory HKA...' 
        });

        try {
            // Se hace la petición POST a la ruta de descarga HKA del backend: /api/invoices/:id/download-hka
            const response = await apiFetch<{ success: boolean, base64?: string, pdfUrl?: string, message?: string }>(
                `/invoices/${invoice.id}/download-hka`, 
                { 
                    method: 'POST',
                    body: JSON.stringify({
                        tipoArchivo: 'pdf',
                        tipoDocumento: '01'
                    })
                }
            );

            if (response.base64) {
                const link = document.createElement('a');
                link.href = `data:application/pdf;base64,${response.base64}`;
                link.download = `Factura_Fiscal_HKA_${invoice.invoiceNumber}.pdf`;
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);
                addToast({ type: 'success', title: 'Éxito', message: 'Factura fiscal descargada correctamente.' });
            } else if (response.pdfUrl) {
                window.open(response.pdfUrl, '_blank');
                addToast({ type: 'success', title: 'Éxito', message: 'Documento abierto en una nueva pestaña.' });
            } else {
                throw new Error(response.message || 'No se recibió el archivo del servidor.');
            }
        } catch (error: any) {
            addToast({ 
                type: 'error', 
                title: 'Error de Descarga', 
                message: error.message || 'No se pudo recuperar la factura de HKA.' 
            });
        } finally {
            setIsDownloadingHka(false);
        }
    };

    const handleDownloadPdf = async () => {
        const input = document.getElementById('invoice-to-print-display-only');
        if (!input) return;

        try {
            const canvas = await html2canvas(input, { 
                scale: 2, 
                useCORS: true, 
                logging: false,
                windowWidth: 1200, 
                width: 794,
                x: 0,
                y: 0
            });

            const imgData = canvas.toDataURL('image/png');
            const pdf = new jsPDF('p', 'mm', 'a4');
            const pdfWidth = pdf.internal.pageSize.getWidth();
            const pdfHeight = pdf.internal.pageSize.getHeight();
            
            const imgProps = pdf.getImageProperties(imgData);
            const pdfImgHeight = (imgProps.height * pdfWidth) / imgProps.width;
            
            let heightLeft = pdfImgHeight;
            let position = 0;

            pdf.addImage(imgData, 'PNG', 0, position, pdfWidth, pdfImgHeight);
            heightLeft -= pdfHeight;

            // Tolerancia de 10px para evitar hojas vacías por desbordamiento mínimo
            while (heightLeft > 10) {
                position = heightLeft - pdfImgHeight;
                pdf.addPage();
                // Fixed: replaced undefined 'imgHeight' with 'pdfImgHeight'
                pdf.addImage(imgData, 'PNG', 0, position, pdfWidth, pdfImgHeight);
                heightLeft -= pdfHeight;
            }

            pdf.save(`factura-${formatInvoiceNumber(invoice.invoiceNumber)}.pdf`);
        } catch (error) {
            console.error("Error generating PDF:", error);
        }
    };

    if (noteMode !== 'none') {
        const isCredit = noteMode === 'credit';
        const title = isCredit ? 'Confirmar Nota de Crédito' : 'Confirmar Nota de Débito';
        const message = isCredit 
            ? '¿Quiere generar la Nota de Crédito (Anulación)?' 
            : '¿Quiere generar la Nota de Débito?';

        return (
            <Modal isOpen={isOpen} onClose={onClose} title={title} size="sm">
                <div className="p-6 text-center space-y-6">
                    <div className={`mx-auto flex items-center justify-center h-12 w-12 rounded-full ${isCredit ? 'bg-red-100' : 'bg-blue-100'}`}>
                        <ExclamationTriangleIcon className={`h-6 w-6 ${isCredit ? 'text-red-600' : 'text-blue-600'}`} />
                    </div>
                    <h3 className="text-lg leading-6 font-medium text-gray-900 dark:text-white">{message}</h3>
                    <div className="text-sm text-gray-500 dark:text-gray-400">
                        <p>Esta acción registrará una nota fiscal asociada a la factura <strong>{formatInvoiceNumber(invoice.invoiceNumber)}</strong>.</p>
                    </div>
                    <div className="flex justify-center gap-4 mt-4">
                        <Button variant="secondary" onClick={cancelNote} disabled={isSubmitting} className="w-24">No</Button>
                        <Button variant={isCredit ? "danger" : "primary"} onClick={submitNote} disabled={isSubmitting} className="w-24">{isSubmitting ? '...' : 'Sí'}</Button>
                    </div>
                </div>
            </Modal>
        );
    }

    return (
        <Modal isOpen={isOpen} onClose={onClose} title={`Detalle de Proforma ${formatInvoiceNumber(invoice.invoiceNumber)}`} size="4xl">
            <div className="flex flex-wrap justify-end gap-3 mb-4 no-print border-b pb-4 dark:border-gray-700">
                {permissions?.['invoices.void'] && invoice.status === 'Activa' && onCreateCreditNote && (
                    <Button type="button" variant="danger" onClick={startCreditNote} title="Generar Nota de Crédito (Anular)">
                        <ArrowUturnLeftIcon className="w-4 h-4 mr-2" />Nota Crédito
                    </Button>
                )}
                {permissions?.['invoices.create'] && invoice.status === 'Activa' && onCreateDebitNote && (
                    <Button type="button" variant="primary" onClick={startDebitNote} title="Generar Nota de Débito (Ajuste)">
                        <PlusCircleIcon className="w-4 h-4 mr-2" />Nota Débito
                    </Button>
                )}
                
                <div className="border-l mx-2 dark:border-gray-600 h-8 hidden sm:block"></div>
                
                {/* BOTÓN DESCARGA HKA - Con estilo emerald destacado */}
                <Button 
                    type="button" 
                    variant="primary" 
                    onClick={handleDownloadHka} 
                    disabled={isDownloadingHka}
                    className="!bg-emerald-600 hover:!bg-emerald-700 text-white shadow-sm"
                    title="Descargar Documento Fiscal Oficial de HKA"
                >
                    <DownloadIcon className="w-4 h-4 mr-2" />
                    {isDownloadingHka ? 'Descargando...' : 'Descarga HKA'}
                </Button>

                <Button type="button" variant="secondary" onClick={handleDownloadPdf} title="Descargar Copia del Sistema">
                    <DownloadIcon className="w-4 h-4 mr-2" />Descargar PDF
                </Button>
                
                <Button type="button" variant="secondary" onClick={onClose}>
                    <XIcon className="w-4 h-4 mr-2" />Cerrar
                </Button>
            </div>

            <div className="printable-area flex justify-center bg-gray-200 dark:bg-gray-700 py-6 overflow-auto rounded-lg">
                <div 
                    id="invoice-to-print-display-only" 
                    className="bg-white text-black shadow-xl"
                    style={{ 
                        width: '794px', 
                        padding: '0', 
                        margin: '0 auto',
                        boxSizing: 'border-box',
                        backgroundColor: '#ffffff' 
                    }} 
                >
                    {/* HOJA 1: FACTURA - Altura optimizada a 1120px para margen de seguridad */}
                    <div style={{ padding: '20px', minHeight: '1120px', boxSizing: 'border-box', display: 'flex', flexDirection: 'column' }}>
                        {/* Header Section */}
                        <div className="flex justify-between items-start border-b-2 border-green-600 pb-3 mb-4">
                            <div className="flex items-center gap-4 max-w-[60%]">
                                {companyInfo.logoUrl ? (
                                    <img src={companyInfo.logoUrl} alt="Logo" className="h-16 w-auto object-contain" />
                                ) : (
                                    <div className="p-2 border rounded"><PackageIcon className="h-12 w-12 text-green-600" /></div>
                                )}
                                <div>
                                    <h1 className="text-lg font-bold uppercase text-green-700 leading-none mb-1">{companyInfo.name}</h1>
                                    <p className="text-[10px] font-bold text-gray-700">RIF: {companyInfo.rif}</p>
                                    <p className="text-[10px] text-gray-600">Habilitación Postal: {companyInfo.postalLicense || 'N/A'}</p>
                                    <p className="text-[10px] text-gray-600 leading-tight break-words">{companyInfo.address}</p>
                                    <p className="text-[10px] text-gray-600">Telf: {companyInfo.phone}</p>
                                    
                                    <div className="mt-1.5 pt-1 border-t border-gray-200">
                                        <p className="text-[10px] font-bold text-green-800">
                                            OFICINA EMISORA: <span className="font-normal text-black uppercase">{originOffice?.name || 'N/A'}</span>
                                            <span className="text-gray-500 font-normal ml-1">(CÓD: {originOffice?.code || 'N/A'})</span>
                                        </p>
                                    </div>
                                </div>
                            </div>
                            <div className="text-right">
                                <h2 className="text-3xl font-black uppercase tracking-wide text-green-600">PROFORMA</h2>
                                <div className="mt-1 flex flex-col items-end space-y-0.5">
                                    <p className="text-sm font-bold text-gray-800">Nº: <span className="text-red-600">{formatInvoiceNumber(invoice.invoiceNumber)}</span></p>
                                    <p className="text-[11px] text-gray-600"><strong>Código:</strong> {invoice.controlNumber}</p>
                                    <p className="text-[11px] text-gray-600"><strong>Fecha:</strong> {invoice.date}</p>
                                    <p className="text-[11px] text-gray-600 mt-1"><strong>Oficinista:</strong> {invoice.createdByName || 'N/A'}</p>
                                </div>
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4 mb-4">
                            <div className="border border-gray-300 rounded-lg p-3 bg-white">
                                <h3 className="font-bold text-[11px] text-gray-700 border-b border-gray-200 pb-1 mb-2">Remitente</h3>
                                <div className="text-[10px] space-y-1">
                                    <p className="font-bold text-base text-black leading-tight break-words">{sender.name}</p>
                                    <p><span className="font-bold text-gray-600">CI/RIF:</span> {sender.idNumber}</p>
                                    <p><span className="font-bold text-gray-600">Telf:</span> {sender.phone}</p>
                                    <p className="break-words"><span className="font-bold text-gray-600">Email:</span> {sender.email || 'N/A'}</p>
                                    <p className="whitespace-normal break-words leading-snug"><span className="font-bold text-gray-600">Dir:</span> {sender.address}</p>
                                </div>
                            </div>
                            <div className="border border-gray-300 rounded-lg p-3 bg-white">
                                <h3 className="font-bold text-[11px] text-gray-700 border-b border-gray-200 pb-1 mb-2">Destinatario</h3>
                                <div className="text-[10px] space-y-1">
                                    <p className="font-bold text-base text-black leading-tight break-words">{receiver.name}</p>
                                    <p><span className="font-bold text-gray-600">CI/RIF:</span> {receiver.idNumber}</p>
                                    <p><span className="font-bold text-gray-600">Telf:</span> {receiver.phone}</p>
                                    <p className="break-words"><span className="font-bold text-gray-600">Email:</span> {receiver.email || 'N/A'}</p>
                                    <p className="whitespace-normal break-words leading-snug"><span className="font-bold text-gray-600">Dir:</span> {receiver.address}</p>
                                </div>
                            </div>
                        </div>

                        <div className="bg-gray-50 border border-gray-200 p-2 mb-4 text-[10px]">
                            <div className="grid grid-cols-3 gap-2 mb-2">
                                <div><span className="font-bold">Destino:</span> {destOffice?.name || invoice.guide.destinationOfficeId || 'N/A'}</div>
                                <div className="col-span-2"><span className="font-bold">Destino Específico / Ruta:</span> {invoice.guide.specificDestination || 'N/A'}</div>
                            </div>
                            <div className="grid grid-cols-4 gap-2">
                                <div><span className="font-bold">Condición Pago:</span> {invoice.guide.paymentType === 'flete-pagado' ? 'Flete Pagado' : 'Flete a Destino'}</div>
                                <div><span className="font-bold">Moneda Pago:</span> {invoice.guide.paymentCurrency}</div>
                                <div><span className="font-bold">Tiene Seguro:</span> {invoice.guide.hasInsurance ? 'Sí' : 'No'}</div>
                                <div><span className="font-bold">Valor Declarado:</span> {invoice.guide.hasInsurance ? formatCurrency(invoice.guide.declaredValue) : 'N/A'}</div>
                                <div><span className="font-bold">Orden Recogida:</span> {invoice.guide.pickupOrder || 'N/A'}</div>
                                <div><span className="font-bold">Transbordo:</span> {invoice.guide.isTransbordo ? 'SI' : 'NO'}</div>
                            </div>
                        </div>

                        <div className="mb-4">
                            <table className="w-full text-[10px]">
                                <thead className="bg-green-500 text-white font-bold uppercase">
                                    <tr>
                                        <th className="px-2 py-1.5 text-left w-1/3">DESCRIPCIÓN</th>
                                        <th className="px-2 py-1.5 text-center w-16">CANTIDAD</th>
                                        <th className="px-2 py-1.5 text-right">PESO REAL (KG/U)</th>
                                        <th className="px-2 py-1.5 text-right">PESO VOL. (KG/U)</th>
                                        <th className="px-2 py-1.5 text-right">PESO FACT. (KG)</th>
                                        <th className="px-2 py-1.5 text-right">MONTO FLETE</th>
                                    </tr>
                                </thead>
                                <tbody className="text-gray-800">
                                    {invoice.guide.merchandise.map((item, index) => {
                                        const realWeightPerUnit = Number(item.weight) || 0;
                                        const volWeightPerUnit = (Number(item.length) * Number(item.width) * Number(item.height)) / 5000;
                                        const chargeableWeightPerUnit = Math.max(realWeightPerUnit, volWeightPerUnit);
                                        const totalChargeableWeight = chargeableWeightPerUnit * (Number(item.quantity) || 1);
                                        const categoryName = categories.find(c => c.id === item.categoryId)?.name || 'N/A';
                                        return (
                                            <tr key={index} className="border-b border-gray-100">
                                                <td className="px-2 py-2">
                                                    <div className="font-bold text-black break-words">{item.description}</div>
                                                    <div className="text-[9px] text-gray-500"><span className="font-bold">Categoría:</span> {categoryName}</div>
                                                </td>
                                                <td className="px-2 py-2 text-center">{item.quantity}</td>
                                                <td className="px-2 py-2 text-right">{realWeightPerUnit.toFixed(2)}</td>
                                                <td className="px-2 py-2 text-right">{volWeightPerUnit.toFixed(2)}</td>
                                                <td className="px-2 py-2 text-right font-bold">{totalChargeableWeight.toFixed(2)}</td>
                                                <td className="px-2 py-2 text-right font-semibold">{index === 0 ? formatCurrency(financials.freight) : ''}</td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>

                        <div className="flex gap-4 mb-8">
                            <div className="w-1/2 text-[10px] text-justify leading-relaxed text-black border border-gray-200 rounded-lg p-3">
                                <h2 className="text-sm font-bold uppercase underline mb-2 text-center">Condiciones generales</h2>
                                <div className="space-y-1">
                                    <p><strong>*Primero:</strong> La cooperativa indemnizará solo (3) veces el valor del flete en caso de extravío o siniestro si no tiene valor asegurado.</p>
                                    <p><strong>*Segundo:</strong> Mercancía frágil o de fácil descomposición deteriorada por mal embalaje corre por cuenta del cliente.</p>
                                    <p><strong>*Tercero:</strong> En caso de siniestro no imputable, se indemnizará según valor declarado menos el deducible de la póliza.</p>
                                    <p><strong>*Cuarto:</strong> No habrá indemnización si la mercancía es confiscada por autoridades; el cliente pagará el flete.</p>
                                    <p><strong>*Quinto:</strong> No somos responsables por retardos debidos a fuerza mayor o accidentes del vehículo.</p>
                                    <p><strong>*Sexto:</strong> A los 30 días la Guía vence. Responsabilidad limitada a 50,00 Bs por valores no declarados.</p>
                                    <p><strong>*Séptimo:</strong> Mercancía no retirada en 90 días pasará a remate sin derecho a reclamo.</p>
                                    <p><strong>*Octavo:</strong> Encomiendas no recibidas a domicilio se devuelven al depósito de origen.</p>
                                    <p><strong>*Noveno:</strong> El cliente declara el contenido real; la compañía no responde por fallas de contenido no declarado.</p>
                                    <p><strong>*Décimo:</strong> Mercancía con más de 72h en oficina no será indemnizada por la aseguradora en caso de siniestro.</p>
                                </div>
                            </div>
                            <div className="w-1/2 bg-gray-50 rounded-lg p-3 border border-gray-200">
                                <div className="text-[10px] space-y-1.5">
                                    <div className="flex justify-between text-gray-700"><span>Monto del Flete:</span> <span className="font-medium">{formatCurrency(financials.freight)}</span></div>
                                    <div className="flex justify-between text-gray-700"><span>Manejo de Mercancía:</span> <span className="font-medium">{formatCurrency(financials.handling)}</span></div>
                                    <div className="flex justify-between text-gray-700"><span>Monto de Seguro:</span> <span className="font-medium">{formatCurrency(financials.insuranceCost)}</span></div>
                                    {financials.discount > 0 && <div className="flex justify-between text-red-600"><span>Descuento:</span> <span>-{formatCurrency(financials.discount)}</span></div>}
                                    <div className="border-t border-gray-300 my-1"></div>
                                    <div className="flex justify-between font-bold text-black text-[11px]"><span>Base Imponible:</span> <span>{formatCurrency(financials.subtotal)}</span></div>
                                    <div className="flex justify-between text-gray-700"><span>IVA (16%):</span> <span>{formatCurrency(financials.iva)}</span></div>
                                    <div className="flex justify-between text-gray-700"><span>Aporte Ipostel:</span> <span>{formatCurrency(financials.ipostel)}</span></div>
                                    {financials.igtf > 0 && <div className="flex justify-between text-gray-700"><span>IGTF (3%):</span> <span>{formatCurrency(financials.igtf)}</span></div>}
                                    <div className="bg-green-600 text-white p-2 rounded mt-2 flex justify-between items-center">
                                        <span className="font-bold uppercase">TOTAL A PAGAR:</span>
                                        <span className="text-lg font-black">{formatCurrency(financials.total)}</span>
                                    </div>
                                    {companyInfo.bcvRate && companyInfo.bcvRate > 0 && (
                                        <div className="text-[9px] text-right mt-1 text-gray-500">
                                            <p>Tasa BCV: {companyInfo.bcvRate.toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} Bs.</p>
                                            <p className="font-semibold text-black">Equivalente: {formatUsd(financials.total / companyInfo.bcvRate)}</p>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </Modal>
    );
};

export default InvoiceDetailView;