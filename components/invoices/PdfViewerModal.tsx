import React from 'react';
import jsPDF from 'jspdf';
import { toPng } from 'html-to-image';
import { Invoice, CompanyInfo, Client, Category, Office } from '../../types';
import Modal from '../ui/Modal';
import Button from '../ui/Button';
import { DownloadIcon, XIcon } from '../icons/Icons';
import { calculateFinancialDetails } from '../../utils/financials';

interface PdfViewerModalProps {
    isOpen: boolean;
    onClose: () => void;
    invoice: Invoice;
    companyInfo: CompanyInfo;
    clients: Client[];
    categories: Category[];
    offices?: Office[];
}

const PdfViewerModal: React.FC<PdfViewerModalProps> = ({ 
    isOpen, 
    onClose, 
    invoice, 
    companyInfo, 
    clients, 
    categories, 
    offices 
}) => {
    
    const sender = clients.find(c => c.id === invoice.guide.sender.id) || invoice.guide.sender;
    const receiver = clients.find(c => c.id === invoice.guide.receiver.id) || invoice.guide.receiver;
    const destOffice = offices?.find(o => o.id === invoice.guide.destinationOfficeId);
    
    const baseFinancials = calculateFinancialDetails(invoice.guide, companyInfo);
    const handling = invoice.Montomanejo !== undefined ? Number(invoice.Montomanejo) : baseFinancials.handling;
    const ipostel = invoice.ipostelFee !== undefined ? Number(invoice.ipostelFee) : baseFinancials.ipostel;
    const total = invoice.totalAmount !== undefined ? Number(invoice.totalAmount) : baseFinancials.total;
    const subtotal = (baseFinancials.freight - baseFinancials.discount) + baseFinancials.insuranceCost + handling;
    const iva = subtotal * 0.16;

    const financials = {
        ...baseFinancials,
        handling,
        ipostel,
        subtotal,
        iva,
        total
    };

    const formatCurrency = (amount: number) => `Bs. ${amount.toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    const formatInvoiceNumber = (num: string) => num.startsWith('F-') ? num : `F-${num}`;

    const handleDownloadPdf = async () => {
        const input = document.getElementById('invoice-to-print-preimpreso');
        if (!input) return;

        try {
            const imgData = await toPng(input, { 
                pixelRatio: 2, 
                width: 801, 
                height: 578,
                backgroundColor: '#ffffff'
            });

            // Media Carta Landscape (212mm x 153mm)
            const pdf = new jsPDF('l', 'mm', [212, 153]); 
            
            pdf.addImage(imgData, 'PNG', 0, 0, 212, 153);
            pdf.save(`preimpreso-${formatInvoiceNumber(invoice.invoiceNumber)}.pdf`);
        } catch (error) {
            console.error("Error generating PDF:", error);
            alert("Error al generar PDF. Si el problema persiste, intente nuevamente.");
        }
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} title={`Impresión de Factura (Pre-Impreso) ${formatInvoiceNumber(invoice.invoiceNumber)}`} size="4xl">
            <div className="flex flex-wrap justify-end gap-3 mb-4 no-print border-b pb-4 dark:border-gray-700">
                <Button type="button" variant="primary" onClick={handleDownloadPdf} title="Descargar PDF para Impresión">
                    <DownloadIcon className="w-4 h-4 mr-2" />Generar PDF
                </Button>
                
                <Button type="button" variant="secondary" onClick={onClose}>
                    <XIcon className="w-4 h-4 mr-2" />Cerrar
                </Button>
            </div>

            <div className="printable-area flex justify-center bg-gray-200 dark:bg-gray-700 py-6 overflow-auto rounded-lg">
                <div 
                    id="invoice-to-print-preimpreso" 
                    style={{ 
                        position: 'relative',
                        width: '801px', 
                        minWidth: '801px',
                        height: '578px',
                        minHeight: '578px',
                        padding: '0', 
                        margin: '0 auto',
                        boxSizing: 'border-box',
                        backgroundColor: '#ffffff',
                        color: '#000000',
                        fontFamily: 'monospace',
                        fontSize: '11px',
                        overflow: 'hidden'
                    }} 
                >
                    {/* FECHA FORMATO PREIMPRESO */}
                    <div style={{ position: 'absolute', top: '30px', right: '50px', width: '150px', textAlign: 'right' }}>
                        <p>{invoice.date}</p>
                    </div>

                    {/* TITULOS REMITENTE / DESTINATARIO */}
                    <div style={{ position: 'absolute', top: '30px', left: '80px', width: '340px', fontWeight: 'bold', fontSize: '13px', fontFamily: 'sans-serif', color: 'black' }}>
                        Remitente
                    </div>
                    <div style={{ position: 'absolute', top: '30px', left: '460px', width: '300px', fontWeight: 'bold', fontSize: '13px', fontFamily: 'sans-serif', color: 'black' }}>
                        Destinatario
                    </div>

                    {/* DATOS DEL CLIENTE / REMITENTE */}
                    <div style={{ position: 'absolute', top: '60px', left: '80px', width: '340px' }}>
                        <p style={{ margin: 0 }}>{sender.name}</p>
                        <p style={{ margin: 0, marginTop: '6px' }}>{sender.idNumber}</p>
                        <p style={{ margin: 0, marginTop: '6px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{sender.address}</p>
                        <p style={{ margin: 0, marginTop: '6px' }}>{sender.phone}</p>
                    </div>

                    {/* DATOS DEL DESTINATARIO */}
                    <div style={{ position: 'absolute', top: '60px', left: '460px', width: '300px' }}>
                        <p style={{ margin: 0 }}>{receiver.name}</p>
                        <p style={{ margin: 0, marginTop: '6px' }}>{receiver.idNumber}</p>
                        <p style={{ margin: 0, marginTop: '6px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{receiver.address}</p>
                        <p style={{ margin: 0, marginTop: '6px' }}>{destOffice?.name || invoice.guide.destinationOfficeId}</p>
                    </div>

                    {/* TITULO INFO FLETE */}
                    <div style={{ position: 'absolute', top: '160px', left: '80px', width: '300px', fontWeight: 'bold', fontSize: '13px', fontFamily: 'sans-serif', color: 'black' }}>
                        Información Del Flete
                    </div>

                    {/* INFO ADICIONAL (Destino, Seguro, etc) */}
                    <div style={{ position: 'absolute', top: '190px', left: '80px', width: '700px', display: 'flex', flexWrap: 'wrap', rowGap: '8px' }}>
                        <div style={{ width: '45%' }}>Destino: {destOffice?.name || invoice.guide.destinationOfficeId}</div>
                        <div style={{ width: '55%' }}>Destino Esp.: {invoice.guide.specificDestination || 'N/A'}</div>
                        <div style={{ width: '45%' }}>Pago: {invoice.guide.paymentType === 'flete-pagado' ? 'Flete Pagado' : 'Flete a Destino'}</div>
                        <div style={{ width: '25%' }}>Moneda: {invoice.guide.paymentCurrency}</div>
                        <div style={{ width: '30%' }}>Orden Rec.: {invoice.guide.pickupOrder || 'N/A'}</div>
                        <div style={{ width: '45%' }}>Transbordo: {invoice.guide.isTransbordo ? 'Sí' : 'No'}</div>
                        <div style={{ width: '25%' }}>Seguro: {invoice.guide.hasInsurance ? 'Sí' : 'No'}</div>
                        <div style={{ width: '30%' }}>V. Decl: {invoice.guide.hasInsurance ? formatCurrency(invoice.guide.declaredValue || 0) : 'N/A'}</div>
                    </div>

                    {/* DETALLES DE MERCANCÍA */}
                    <div style={{ position: 'absolute', top: '270px', left: '80px', width: '700px', height: '100px' }}>
                        {invoice.guide.merchandise.map((item, index) => {
                            const categoryName = categories.find(c => c.id === item.categoryId)?.name || '';
                            return (
                                <div key={index} style={{ display: 'flex', width: '100%', marginBottom: '6px' }}>
                                    <div style={{ width: '40px', textAlign: 'center' }}>{item.quantity}</div>
                                    <div style={{ width: '480px', paddingLeft: '10px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                        {item.description} ({categoryName})
                                    </div>
                                    <div style={{ width: '150px', textAlign: 'right' }}>{Number(item.weight).toFixed(2)} KG</div>
                                </div>
                            );
                        })}
                    </div>

                    {/* TOTALES FINANCIEROS */}
                    <div style={{ position: 'absolute', top: '350px', right: '50px', width: '280px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                            <span>Monto Flete:</span>
                            <span>{formatCurrency(financials.freight)}</span>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                            <span>Manejo de Mercancía:</span>
                            <span>{formatCurrency(financials.handling)}</span>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                            <span>Monto de Seguro:</span>
                            <span>{formatCurrency(financials.insuranceCost || 0)}</span>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '1px dashed #000', paddingTop: '6px', marginTop: '2px' }}>
                            <span>Base Imponible:</span>
                            <span>{formatCurrency(financials.subtotal)}</span>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                            <span>I.V.A. (16%):</span>
                            <span>{formatCurrency(financials.iva)}</span>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                            <span>IPOSTEL:</span>
                            <span>{formatCurrency(financials.ipostel)}</span>
                        </div>
                        {financials.igtf > 0 && (
                            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                <span>I.G.T.F:</span>
                                <span>{formatCurrency(financials.igtf)}</span>
                            </div>
                        )}
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 'bold', marginTop: '2px', paddingTop: '6px', borderTop: '1px solid #000' }}>
                            <span>TOTAL:</span>
                            <span>{formatCurrency(financials.total)}</span>
                        </div>
                    </div>
                </div>
            </div>
        </Modal>
    );
};

export default PdfViewerModal;
