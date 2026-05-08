
import React, { useEffect, useState, useMemo } from 'react';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import { Invoice, CompanyInfo, Client, Category, Office } from '../../types';
import Modal from '../ui/Modal';
import Button from '../ui/Button';
import { PackageIcon, DownloadIcon, XIcon, PrinterIcon } from '../icons/Icons';
import { calculateFinancialDetails } from '../../utils/financials';

interface PdfViewerModalProps {
    isOpen: boolean;
    onClose: () => void;
    invoice: Invoice;
    companyInfo: CompanyInfo;
    clients: Client[];
    categories: Category[];
    offices: Office[];
}

const PdfViewerModal: React.FC<PdfViewerModalProps> = ({ 
    isOpen, onClose, invoice, companyInfo, clients, categories, offices 
}) => {
    const [pdfUrl, setPdfUrl] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    const sender = clients.find(c => c.id === invoice.guide.sender.id) || invoice.guide.sender;
    const receiver = clients.find(c => c.id === invoice.guide.receiver.id) || invoice.guide.receiver;
    const originOffice = offices.find(o => o.id === invoice.guide.originOfficeId);
    
    const financials = useMemo(() => calculateFinancialDetails(invoice.guide, companyInfo), [invoice, companyInfo]);

    const formatCurrency = (amount: number) => `Bs. ${amount.toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    const formatUsd = (amount: number) => `$${amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    const formatInvoiceNumber = (num: string) => num.startsWith('F-') ? num : `F-${num}`;

    useEffect(() => {
        if (isOpen && invoice) {
            setIsLoading(true);
            // Pequeño delay para asegurar que el DOM se renderizó antes de capturar
            const timer = setTimeout(() => {
                generatePdfBlob();
            }, 500);
            return () => clearTimeout(timer);
        } else {
            setPdfUrl(null);
        }
    }, [isOpen, invoice]);

    const generatePdfBlob = async () => {
        const input = document.getElementById('invoice-pdf-source');
        if (!input) {
            console.error("No se encontró el elemento fuente para el PDF");
            setIsLoading(false);
            return;
        }

        try {
            const canvas = await html2canvas(input, { 
                scale: 2, 
                useCORS: true, 
                logging: false,
                windowWidth: 1200, 
                width: 794,
                x: 0,
                y: 0,
                backgroundColor: '#ffffff'
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

            while (heightLeft > 0) {
                position = heightLeft - pdfImgHeight;
                pdf.addPage();
                pdf.addImage(imgData, 'PNG', 0, position, pdfWidth, pdfImgHeight);
                heightLeft -= pdfHeight;
            }

            const blob = pdf.output('blob');
            const url = URL.createObjectURL(blob);
            setPdfUrl(url);
        } catch (error) {
            console.error("Error generating PDF preview:", error);
        } finally {
            setIsLoading(false);
        }
    };

    const handleDownload = () => {
        if (!pdfUrl) return;
        const link = document.createElement('a');
        link.href = pdfUrl;
        link.download = `factura-${formatInvoiceNumber(invoice.invoiceNumber)}.pdf`;
        link.click();
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} title={`Visualizar Proforma ${formatInvoiceNumber(invoice.invoiceNumber)}`} size="4xl">
            <div className="flex flex-col h-[75vh]">
                <div className="flex justify-between items-center mb-4 border-b dark:border-gray-700 pb-2">
                    <p className="text-sm text-gray-500">Vista previa del documento generado.</p>
                    <div className="flex gap-2">
                        <Button variant="secondary" onClick={onClose} size="sm">
                            <XIcon className="w-4 h-4 mr-2" /> Cerrar
                        </Button>
                        <Button onClick={handleDownload} disabled={isLoading} size="sm">
                            <DownloadIcon className="w-4 h-4 mr-2" /> Descargar
                        </Button>
                    </div>
                </div>

                <div className="flex-1 bg-gray-100 dark:bg-gray-800 rounded-lg overflow-hidden relative flex justify-center items-center border dark:border-gray-700">
                    {isLoading ? (
                        <div className="text-center">
                            <PrinterIcon className="w-12 h-12 text-primary-500 animate-pulse mx-auto mb-2" />
                            <p className="text-gray-600 dark:text-gray-300 font-medium">Generando PDF...</p>
                        </div>
                    ) : (
                        pdfUrl && (
                            <iframe 
                                src={pdfUrl} 
                                className="w-full h-full" 
                                title="Visor de Factura"
                            />
                        )
                    )}
                </div>
            </div>

            {/* Hidden Source Container for PDF Generation */}
            <div style={{ position: 'absolute', left: '-10000px', top: 0, visibility: 'visible' }}>
                <div 
                    id="invoice-pdf-source" 
                    className="bg-white text-black shadow-xl"
                    style={{ 
                        width: '794px', 
                        minHeight: '1123px', 
                        padding: '20px', 
                        boxSizing: 'border-box',
                        backgroundColor: '#ffffff' 
                    }} 
                >
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
                                <p className="whitespace-normal break-words leading-snug">
                                    <span className="font-bold text-gray-600">Dir:</span> {sender.address}
                                </p>
                            </div>
                        </div>
                        <div className="border border-gray-300 rounded-lg p-3 bg-white">
                            <h3 className="font-bold text-[11px] text-gray-700 border-b border-gray-200 pb-1 mb-2">Destinatario</h3>
                            <div className="text-[10px] space-y-1">
                                <p className="font-bold text-base text-black leading-tight break-words">{receiver.name}</p>
                                <p><span className="font-bold text-gray-600">CI/RIF:</span> {receiver.idNumber}</p>
                                <p><span className="font-bold text-gray-600">Telf:</span> {receiver.phone}</p>
                                <p className="break-words"><span className="font-bold text-gray-600">Email:</span> {receiver.email || 'N/A'}</p>
                                <p className="whitespace-normal break-words leading-snug">
                                    <span className="font-bold text-gray-600">Dir:</span> {receiver.address}
                                </p>
                            </div>
                        </div>
                    </div>

                    <div className="bg-gray-50 border-y border-gray-200 py-2 px-2 mb-4 grid grid-cols-4 gap-2 text-[10px]">
                        <div><span className="font-bold">Condición Pago:</span> {invoice.guide.paymentType === 'flete-pagado' ? 'Flete Pagado' : 'Flete a Destino'}</div>
                        <div><span className="font-bold">Moneda Pago:</span> {invoice.guide.paymentCurrency}</div>
                        <div><span className="font-bold">Tiene Seguro:</span> {invoice.guide.hasInsurance ? 'Sí' : 'No'}</div>
                        <div><span className="font-bold">Valor Declarado:</span> {invoice.guide.hasInsurance ? formatCurrency(invoice.guide.declaredValue) : 'N/A'}</div>
                        <div><span className="font-bold">Orden Recogida:</span> {invoice.guide.pickupOrder || 'N/A'}</div>
                        <div><span className="font-bold">Transbordo:</span> {invoice.guide.isTransbordo ? 'SI' : 'NO'}</div>
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
                                    const itemFreight = totalChargeableWeight * (companyInfo.costPerKg || 0);
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
                                            <td className="px-2 py-2 text-right font-semibold">{formatCurrency(itemFreight)}</td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>

                    <div className="flex justify-end mb-8">
                        <div className="w-64 bg-gray-50 rounded-lg p-3 border border-gray-200">
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

                    <div className="mt-auto pt-8 grid grid-cols-2 gap-20 px-4">
                        <div>
                            <p className="text-[11px] font-bold mb-8 text-center text-black">Recibido Conforme</p>
                            <div className="border-b border-black"></div>
                            <p className="text-[9px] text-center mt-1 text-gray-600">Firma y Nombre</p>
                        </div>
                        <div>
                            <p className="text-[11px] font-bold mb-8 text-center text-black">Por {companyInfo.name}</p>
                            <div className="border-b border-black"></div>
                            <p className="text-[9px] text-center mt-1 text-gray-600">Firma Autorizada</p>
                        </div>
                    </div>
                </div>
            </div>
        </Modal>
    );
};

export default PdfViewerModal;
