import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
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

const fieldPositions = {
    date: { top: 37, left: 163 },
    invoiceNumber: { top: 42, left: 163 },
    
    senderTitle: { top: 52, left: 18 },
    senderName: { top: 56, left: 18 },
    senderId: { top: 60, left: 18 },
    senderAddress: { top: 64, left: 18 },
    senderPhone: { top: 68, left: 18 },

    receiverTitle: { top: 52, left: 113 },
    receiverName: { top: 56, left: 113 },
    receiverId: { top: 60, left: 113 },
    receiverAddress: { top: 64, left: 113 },
    receiverPhone: { top: 68, left: 113 },
    
    origin: { top: 76, left: 18 },
    destination: { top: 76, left: 83 },
    
    Condiciones: { top: 82, left: 18 },

    merchandiseStart: { top: 88, left: 18 },
    merchandiseDescOffset: 15,
    merchandiseWeightOffset: 145, 
    merchandiseLineHeight: 5,

    totalsLabel: { top: 97, left: 108 },
    totalsValue: { top: 97, left: 148 }, 
    totalsLineHeight: 5,
};

const getStyle = (pos?: { top: number, left: number }) => {
    if (!pos) return {};
    return {
        position: 'absolute' as const,
        top: `${pos.top}mm`,
        left: `${pos.left}mm`,
    };
};

const PreImpresoModal: React.FC<PreImpresoModalProps> = ({ 
    isOpen, 
    onClose, 
    invoice, 
    companyInfo, 
    clients, 
    categories, 
    offices 
}) => {
    const [isMounted, setIsMounted] = useState(false);
    const [printError, setPrintError] = useState(false);
    
    useEffect(() => {
        setIsMounted(true);
    }, []);

    const sender = clients.find(c => c.id === invoice.guide.sender.id) || invoice.guide.sender;
    const receiver = clients.find(c => c.id === invoice.guide.receiver.id) || invoice.guide.receiver;
    const destOffice = offices?.find(o => o.id === invoice.guide.destinationOfficeId);
    const originOffice = offices?.find(o => o.id === invoice.guide.originOfficeId) || { name: 'Sede Principal' };
    
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
        // En un iframe sandboxed (como la vista previa), window.print() suele estar bloqueado.
        if (window.self !== window.top) {
            setPrintError(true);
        }
        try {
            window.print();
        } catch (err) {
            setPrintError(true);
        }
    };

    const PrintFilaTotal = ({ label, value, index, isBold = false }: { label: string, value: string | number, index: number, isBold?: boolean }) => (
        <>
            <div style={{ ...getStyle({ top: fieldPositions.totalsLabel.top + (fieldPositions.totalsLineHeight * index), left: fieldPositions.totalsLabel.left }), fontWeight: isBold ? 'bold' : 'normal' }}>
                {label}
            </div>
            <div style={{ ...getStyle({ top: fieldPositions.totalsValue.top + (fieldPositions.totalsLineHeight * index), left: fieldPositions.totalsValue.left }), textAlign: 'right', width: '30mm', fontWeight: isBold ? 'bold' : 'normal' }}>
                {value}
            </div>
        </>
    );

    return (
        <Modal isOpen={isOpen} onClose={onClose} title={`Impresión de Factura ${formatInvoiceNumber(invoice.invoiceNumber)}`} size="md">
            <div className="flex flex-col items-center justify-center p-8 gap-6 text-center">
                <div className="text-gray-600 dark:text-gray-300">
                    <p className="mb-2">Asegurese de colocar el <strong>Talonario Pre-Impreso (Media Carta)</strong> en la bandeja de su impresora.</p>
                    <p className="text-sm mb-4">Al hacer clic en "Imprimir Talonario", se generará un documento ajustado milimétricamente usando una plantilla HTML oculta.</p>
                    <div className="bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-200 p-3 rounded text-xs border border-yellow-300 dark:border-yellow-700">
                        <strong>IMPORTANTE:</strong> En la ventana de impresión, verifique que el tamaño de papel sea el correcto y la orientación sea <strong>"Horizontal" (Landscape)</strong>. Asegurese también de que los márgenes estén en "Ninguno" o "Predeterminado" y cancele encabezados/pies.
                    </div>
                </div>

                <Button type="button" variant="primary" onClick={generarImpresionTalonario} className="text-lg py-4 px-8 w-full max-w-sm flex items-center justify-center shadow-lg hover:scale-105 transition-transform duration-200">
                    <PrinterIcon className="w-6 h-6 mr-3" />
                    <span>Imprimir Talonario</span>
                </Button>

                {printError && (
                    <div className="bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-200 p-3 rounded text-sm w-full max-w-md mt-2 border border-red-300 dark:border-red-700 font-medium">
                        <p>La impresión está bloqueada en la vista previa de AI Studio por razones de seguridad del navegador.</p>
                        <p className="mt-2">Para poder imprimir, <strong>abra la aplicación en una nueva pestaña</strong> usando el icono "Abrir app..." (↗️) en la esquina superior derecha del editor.</p>
                    </div>
                )}
                
                <Button type="button" variant="secondary" onClick={onClose} className="mt-2">
                    <XIcon className="w-4 h-4 mr-2" />Cerrar
                </Button>
            </div>

            {isOpen && isMounted && createPortal(
                <div id="print-container">
                    <style type="text/css" media="print">
                        {`
                            @page {
                                size: 212mm 152mm;
                                margin: 0;
                            }
                            body {
                                margin: 0;
                                padding: 0;
                                background: white;
                            }
                            body > :not(#print-container) {
                                display: none !important;
                            }
                            #print-container {
                                display: block !important;
                                position: absolute;
                                left: 0;
                                top: 0;
                                width: 212mm;
                                height: 152mm;
                                overflow: hidden; /* Evita que crezca a una segunda página */
                                font-family: monospace, sans-serif;
                                font-size: 8pt; /* Texto aún más pequeño */
                                background-color: transparent;
                                color: black;
                                margin: 0;
                                padding: 0;
                                box-sizing: border-box;
                            }
                            #print-container > div {
                                position: absolute;
                                display: block;
                            }
                        `}
                    </style>

                    <div style={getStyle(fieldPositions.date)}>{invoice.date}</div>
                    <div style={getStyle(fieldPositions.invoiceNumber)}>{formatInvoiceNumber(invoice.invoiceNumber)}</div>

                    <div style={{...getStyle(fieldPositions.senderTitle), fontWeight: 'bold'}}>REMITENTE</div>
                    <div style={getStyle(fieldPositions.senderName)}>{sender.name.substring(0, 45)}</div>
                    <div style={getStyle(fieldPositions.senderId)}>{sender.idNumber}</div>
                    <div style={getStyle(fieldPositions.senderAddress)}>{sender.address.substring(0, 45)}</div>
                    <div style={getStyle(fieldPositions.senderPhone)}>{sender.phone}</div>

                    <div style={{...getStyle(fieldPositions.receiverTitle), fontWeight: 'bold'}}>DESTINATARIO</div>
                    <div style={getStyle(fieldPositions.receiverName)}>{receiver.name.substring(0, 45)}</div>
                    <div style={getStyle(fieldPositions.receiverId)}>{receiver.idNumber}</div>
                    <div style={getStyle(fieldPositions.receiverAddress)}>{receiver.address.substring(0, 45)}</div>
                    <div style={getStyle(fieldPositions.receiverPhone)}>{receiver.phone}</div>

                    <div style={getStyle(fieldPositions.origin)}>Origen: {originOffice.name}</div>
                    <div style={getStyle(fieldPositions.destination)}>Destino: {destOffice?.name || invoice.guide.destinationOfficeId}</div>
                    
                    <div style={getStyle(fieldPositions.Condiciones)}>
                        Condiciones: {invoice.guide.paymentType === 'flete-pagado' ? 'Flete Pagado' : 'Flete a Destino'} / Seguro: {invoice.guide.hasInsurance ? 'Sí' : 'No'}
                    </div>

                    {invoice.guide.merchandise.map((item, index) => {
                        const topPos = fieldPositions.merchandiseStart.top + (index * fieldPositions.merchandiseLineHeight);
                        const categoryName = categories.find(c => c.id === item.categoryId)?.name || '';
                        
                        return (
                            <React.Fragment key={index}>
                                <div style={getStyle({ top: topPos, left: fieldPositions.merchandiseStart.left })}>
                                    {item.quantity}
                                </div>
                                <div style={getStyle({ top: topPos, left: fieldPositions.merchandiseStart.left + fieldPositions.merchandiseDescOffset })}>
                                    {item.description} ({categoryName})
                                </div>
                                <div style={{
                                    ...getStyle({ top: topPos, left: fieldPositions.merchandiseStart.left + fieldPositions.merchandiseWeightOffset }),
                                    textAlign: 'right',
                                    width: '30mm'
                                }}>
                                    {Number(item.weight).toFixed(2)} KG
                                </div>
                            </React.Fragment>
                        );
                    })}

                    <PrintFilaTotal label="Monto Flete:" value={formatCurrency(financials.freight)} index={0} />
                    <PrintFilaTotal label="Manejo de Merc.:" value={formatCurrency(financials.handling)} index={1} />
                    <PrintFilaTotal label="Seguro:" value={formatCurrency(financials.insuranceCost || 0)} index={2} />
                    <PrintFilaTotal label="Base Imponible:" value={formatCurrency(financials.subtotal)} index={3} />
                    <PrintFilaTotal label="I.V.A. (16%):" value={formatCurrency(financials.iva)} index={4} />
                    <PrintFilaTotal label="IPOSTEL:" value={formatCurrency(financials.ipostel)} index={5} />
                    
                    {financials.igtf > 0 && (
                        <PrintFilaTotal label="I.G.T.F:" value={formatCurrency(financials.igtf)} index={6} />
                    )}

                    <PrintFilaTotal 
                        label="TOTAL:" 
                        value={formatCurrency(financials.total)} 
                        index={financials.igtf > 0 ? 7 : 6} 
                        isBold={true} 
                    />
                </div>, 
                document.body
            )}
        </Modal>
    );
};

export default PreImpresoModal;
