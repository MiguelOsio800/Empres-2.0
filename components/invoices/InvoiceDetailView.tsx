import React, { useMemo, useState } from 'react';
import jsPDF from 'jspdf';
import { toPng } from 'html-to-image';
import { Invoice, CompanyInfo, Client, Category, Office, Permissions } from '../../types';
import Modal from '../ui/Modal';
import Button from '../ui/Button';
import { XIcon, DownloadIcon, PackageIcon } from '../icons/Icons';
import { calculateFinancialDetails } from '../../utils/financials';
import PreImpresoModal from './PreImpresoModal';

interface InvoiceDetailViewProps {
    isOpen: boolean;
    onClose: () => void;
    invoice: Invoice;
    companyInfo: CompanyInfo;
    clients: Client[];
    categories: Category[];
    offices?: Office[];
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
    permissions
}) => {
    
    const [showPreimpreso, setShowPreimpreso] = useState(false);

    const sender = clients.find(c => c.id === invoice.guide.sender.id) || invoice.guide.sender;
    const receiver = clients.find(c => c.id === invoice.guide.receiver.id) || invoice.guide.receiver;
    const originOffice = offices?.find(o => o.id === invoice.guide.originOfficeId);
    const destOffice = offices?.find(o => o.id === invoice.guide.destinationOfficeId);
    
    const financials = useMemo(() => {
        const baseFinancials = calculateFinancialDetails(invoice.guide, companyInfo);
        const handling = invoice.Montomanejo !== undefined ? Number(invoice.Montomanejo) : baseFinancials.handling;
        const ipostel = invoice.ipostelFee !== undefined ? Number(invoice.ipostelFee) : baseFinancials.ipostel;
        const subtotal = (baseFinancials.freight - baseFinancials.discount) + baseFinancials.insuranceCost + handling;
        const iva = subtotal * 0.16;
        const igtf = invoice.guide.paymentCurrency === 'USD' ? (subtotal + ipostel + iva) * 0.03 : 0;
        const total = subtotal + ipostel + iva + igtf;
        
        return {
            ...baseFinancials,
            handling,
            ipostel,
            subtotal,
            iva,
            igtf,
            total
        };
    }, [invoice, companyInfo]);

    const formatCurrency = (amount: number) => `Bs. ${amount.toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    const formatUsd = (amount: number) => `$${amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    const formatInvoiceNumber = (num: string) => num.startsWith('F-') ? num : `F-${num}`;

    const handleDownloadPdf = async () => {
        const input = document.getElementById('invoice-to-print-display-only');
        if (!input) return;

        try {
            const imgData = await toPng(input, { 
                pixelRatio: 2, 
                width: 794,
                backgroundColor: '#ffffff'
            });

            const pdf = new jsPDF('p', 'mm', 'a4');
            const pdfWidth = pdf.internal.pageSize.getWidth();
            const pdfHeight = pdf.internal.pageSize.getHeight();
            
            const imgProps = pdf.getImageProperties(imgData);
            const pdfImgHeight = (imgProps.height * pdfWidth) / imgProps.width;
            
            let heightLeft = pdfImgHeight;
            let position = 0;

            pdf.addImage(imgData, 'PNG', 0, position, pdfWidth, pdfImgHeight);
            heightLeft -= pdfHeight;

            while (heightLeft > 10) {
                position = heightLeft - pdfImgHeight;
                pdf.addPage();
                pdf.addImage(imgData, 'PNG', 0, position, pdfWidth, pdfImgHeight);
                heightLeft -= pdfHeight;
            }

            pdf.save(`proforma-${formatInvoiceNumber(invoice.invoiceNumber)}.pdf`);
        } catch (error) {
            console.error("Error generating PDF:", error);
        }
    };

    return (
        <>
        <Modal isOpen={isOpen && !showPreimpreso} onClose={onClose} title={`Detalle de Proforma ${formatInvoiceNumber(invoice.invoiceNumber)}`} size="4xl">
            <div className="flex flex-wrap justify-end gap-3 mb-4 no-print border-b pb-4 dark:border-gray-700">
                <Button type="button" variant="primary" onClick={() => setShowPreimpreso(true)} title="Imprimir Formato Pre-Impreso">
                    <DownloadIcon className="w-4 h-4 mr-2" />Imprimir Pre-Impreso
                </Button>
                <Button type="button" variant="secondary" onClick={handleDownloadPdf} title="Descargar Copia del Sistema">
                    <DownloadIcon className="w-4 h-4 mr-2" />Descargar Proforma
                </Button>
                
                <Button type="button" variant="secondary" onClick={onClose}>
                    <XIcon className="w-4 h-4 mr-2" />Cerrar
                </Button>
            </div>

            <div className="printable-area flex justify-center bg-gray-200 dark:bg-gray-700 py-6 overflow-auto rounded-lg">
                <div 
                    id="invoice-to-print-display-only" 
                    style={{ 
                        width: '794px', 
                        minWidth: '794px',
                        padding: '0', 
                        margin: '0 auto',
                        boxSizing: 'border-box',
                        backgroundColor: '#ffffff',
                        color: '#000000'
                    }} 
                >
                    {/* HOJA 1: FACTURA - Altura optimizada a 1120px para margen de seguridad */}
                    <div style={{ padding: '20px', minHeight: '1120px', boxSizing: 'border-box', display: 'flex', flexDirection: 'column' }}>
                        {/* Header Section */}
                        <div className="flex justify-between items-start border-b-2 border-blue-600 pb-3 mb-4">
                            <div className="flex items-center gap-4 max-w-[60%]">
                                {companyInfo.logoUrl ? (
                                    <img src={companyInfo.logoUrl} alt="Logo" className="h-16 w-auto object-contain" />
                                ) : (
                                    <div className="p-2 border rounded"><PackageIcon className="h-12 w-12 text-blue-600" /></div>
                                )}
                                <div>
                                    <h1 className="text-lg font-bold uppercase text-blue-700 leading-none mb-1">{companyInfo.name}</h1>
                                    <p className="text-[10px] font-bold text-gray-700">RIF: {companyInfo.rif}</p>
                                    <p className="text-[10px] text-gray-600">Habilitación Postal: {companyInfo.postalLicense || 'N/A'}</p>
                                    <p className="text-[10px] text-gray-600 leading-tight break-words">{companyInfo.address}</p>
                                    <p className="text-[10px] text-gray-600">Telf: {companyInfo.phone}</p>
                                    
                                    <div className="mt-1.5 pt-1 border-t border-gray-200">
                                        <p className="text-[10px] font-bold text-blue-800">
                                            OFICINA EMISORA: <span className="font-normal text-black uppercase">{originOffice?.name || 'N/A'}</span>
                                            <span className="text-gray-500 font-normal ml-1">(CÓD: {originOffice?.code || 'N/A'})</span>
                                        </p>
                                    </div>
                                </div>
                            </div>
                            <div className="text-right">
                                <h2 className="text-3xl font-black uppercase tracking-wide text-blue-600">PROFORMA</h2>
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
                                <thead className="bg-blue-500 text-white font-bold uppercase">
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
                                    <p><strong>*Primero:</strong> La empresa indemnizará solo (3) veces el valor del flete en caso de extravío o siniestro si no tiene valor asegurado.</p>
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
                                    <div className="bg-blue-600 text-white p-2 rounded mt-2 flex justify-between items-center">
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
        {showPreimpreso && (
            <PreImpresoModal 
                isOpen={showPreimpreso} 
                onClose={() => setShowPreimpreso(false)} 
                invoice={invoice} 
                companyInfo={companyInfo} 
                clients={clients} 
                categories={categories} 
                offices={offices} 
            />
        )}
        </>
    );
};

export default InvoiceDetailView;