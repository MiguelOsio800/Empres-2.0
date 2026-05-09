import React from 'react';
import { jsPDF } from 'jspdf';
import { Invoice, CompanyInfo, Client, Category, Office } from '../../types';
import Modal from '../ui/Modal';
import Button from '../ui/Button';
import { XIcon, PrinterIcon } from '../icons/Icons';
import { calculateFinancialDetails } from '../../utils/financials';

interface PreImpresoModalProps {
    isOpen: boolean;
    onClose: () => void;
    invoice: Invoice;
    companyInfo: CompanyInfo;
    clients: Client[];
    categories: Category[];
    offices?: Office[];
}

const PreImpresoModal: React.FC<PreImpresoModalProps> = ({ 
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

    const generarImpresionTalonario = () => {
        // Inicializa jsPDF en formato Apaisado (Landscape), Milímetros, y Media Carta estricta
        const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: [215.9, 139.7] });
        
        doc.setFontSize(10);
        doc.setFont("helvetica", "normal");

        // FECHA Y FACTURA
        doc.text(invoice.date, 175, 10);
        doc.text(formatInvoiceNumber(invoice.invoiceNumber), 175, 15);

        // --- DATOS DEL REMITENTE ---
        const remX = 15;
        let remY = 20;
        doc.text(sender.name, remX, remY);
        doc.text(sender.idNumber, remX, remY += 5);
        doc.text(sender.address.substring(0, 60), remX, remY += 5); 
        doc.text(sender.phone, remX, remY += 5);

        // --- DATOS DEL DESTINATARIO ---
        const desX = 115;
        let desY = 20;
        doc.text(receiver.name, desX, desY);
        doc.text(receiver.idNumber, desX, desY += 5);
        doc.text(receiver.address.substring(0, 60), desX, desY += 5);
        doc.text(destOffice?.name || invoice.guide.destinationOfficeId, desX, desY += 5);

        // --- INFO DEL FLETE ---
        const infoX = 15;
        let infoY = 50;
        doc.text(`Destino: ${destOffice?.name || invoice.guide.destinationOfficeId}`, infoX, infoY);
        doc.text(`Destino Esp.: ${invoice.guide.specificDestination || 'N/A'}`, infoX + 70, infoY);
        
        infoY += 5;
        doc.text(`Pago: ${invoice.guide.paymentType === 'flete-pagado' ? 'Flete Pagado' : 'Flete a Destino'}`, infoX, infoY);
        doc.text(`Moneda: ${invoice.guide.paymentCurrency}`, infoX + 70, infoY);
        doc.text(`Orden Rec.: ${invoice.guide.pickupOrder || 'N/A'}`, infoX + 130, infoY);

        infoY += 5;
        doc.text(`Transbordo: ${invoice.guide.isTransbordo ? 'Sí' : 'No'}`, infoX, infoY);
        doc.text(`Seguro: ${invoice.guide.hasInsurance ? 'Sí' : 'No'}`, infoX + 70, infoY);
        doc.text(`V. Decl: ${invoice.guide.hasInsurance ? formatCurrency(invoice.guide.declaredValue || 0) : 'N/A'}`, infoX + 130, infoY);

        // --- INFO DEL PAQUETE (Mercancía) ---
        const packX = 15;
        let packY = 75;
        invoice.guide.merchandise.forEach((item) => {
            const categoryName = categories.find(c => c.id === item.categoryId)?.name || '';
            doc.text(`${item.quantity}`, packX, packY);
            doc.text(`${item.description} (${categoryName})`.substring(0, 60), packX + 15, packY);
            doc.text(`${Number(item.weight).toFixed(2)} KG`, packX + 110, packY);
            packY += 5;
        });

        // --- MONTOS ---
        const numX = 200;
        const valX = 140;
        let mntY = 85;
        
        const writeAmount = (label: string, amount: string | number, y: number) => {
            doc.text(label, valX, y);
            doc.text(amount.toString(), numX, y, { align: 'right' });
        }

        writeAmount('Monto Flete:', formatCurrency(financials.freight), mntY);
        writeAmount('Manejo de Merc.:', formatCurrency(financials.handling), mntY += 5);
        writeAmount('Monto de Seguro:', formatCurrency(financials.insuranceCost || 0), mntY += 5);
        
        mntY += 2; // Espacio
        
        writeAmount('Base Imponible:', formatCurrency(financials.subtotal), mntY += 5);
        writeAmount('I.V.A. (16%):', formatCurrency(financials.iva), mntY += 5);
        writeAmount('IPOSTEL:', formatCurrency(financials.ipostel), mntY += 5);
        
        if (financials.igtf > 0) {
            writeAmount('I.G.T.F:', formatCurrency(financials.igtf), mntY += 5);
        }
        
        mntY += 3; // Espacio final
        
        doc.setFont("helvetica", "bold");
        writeAmount('TOTAL:', formatCurrency(financials.total), mntY += 5);

        // Fuerza el auto-print y abre en nueva pestaña
        doc.autoPrint();
        window.open(doc.output('bloburl'), '_blank');
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} title={`Impresión de Factura ${formatInvoiceNumber(invoice.invoiceNumber)}`} size="md">
            <div className="flex flex-col items-center justify-center p-8 gap-6 text-center">
                <div className="text-gray-600 dark:text-gray-300">
                    <p className="mb-2">Asegurese de colocar el <strong>Talonario Pre-Impreso (Media Carta)</strong> en la bandeja de su impresora.</p>
                    <p className="text-sm mb-4">Al hacer clic en "Imprimir Talonario", se generará un documento ajustado milimétricamente.</p>
                    <div className="bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-200 p-3 rounded text-xs border border-yellow-300 dark:border-yellow-700">
                        <strong>IMPORTANTE:</strong> En la ventana de impresión (Ctrl+P / Cmd+P), verifique que la opción "Diseño" (o "Orientación") esté ajustada a <strong>"Horizontal" (Landscape)</strong> para que coincida con el papel.
                    </div>
                </div>

                <Button type="button" variant="primary" onClick={generarImpresionTalonario} className="text-lg py-4 px-8 w-full max-w-sm flex items-center justify-center shadow-lg hover:scale-105 transition-transform duration-200">
                    <PrinterIcon className="w-6 h-6 mr-3" />
                    <span>Imprimir Talonario</span>
                </Button>
                
                <Button type="button" variant="secondary" onClick={onClose} className="mt-2">
                    <XIcon className="w-4 h-4 mr-2" />Cerrar
                </Button>
            </div>
        </Modal>
    );
};

export default PreImpresoModal;
