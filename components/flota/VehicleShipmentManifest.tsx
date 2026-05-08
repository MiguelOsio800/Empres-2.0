
import React from 'react';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import { Invoice, Vehicle, Office, Client, CompanyInfo } from '../../types';
import Modal from '../ui/Modal';
import Button from '../ui/Button';
import { DownloadIcon, XIcon } from '../icons/Icons';
import { calculateFinancialDetails } from '../../utils/financials';

interface VehicleShipmentManifestProps {
    isOpen: boolean;
    onClose: () => void;
    vehicle: Vehicle;
    invoices: Invoice[];
    offices: Office[];
    clients: Client[];
    companyInfo: CompanyInfo;
}

const formatCurrency = (amount: number) => `Bs. ${amount.toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

const VehicleShipmentManifest: React.FC<VehicleShipmentManifestProps> = ({
    isOpen, onClose, vehicle, invoices, offices, clients, companyInfo
}) => {
    if (!isOpen) return null;

    const getOfficeName = (officeId: string) => offices.find(o => o.id === officeId)?.name || officeId;
    const getClient = (clientRef: Partial<Client>) => {
        if (!clientRef) return null;
        return clients.find(c => c.id === clientRef.id || (clientRef.idNumber && c.idNumber === clientRef.idNumber));
    };

    const handleDownloadPdf = () => {
        const input = document.getElementById('manifest-to-print');
        if (!input) return;

        // Use standard A4 dimensions
        const a4Width = 794; 
        
        html2canvas(input, { 
            scale: 2, 
            useCORS: true,
            backgroundColor: '#ffffff',
            width: a4Width,
            windowWidth: 1200, 
            x: 0, 
            y: 0 
        }).then(canvas => {
            const imgData = canvas.toDataURL('image/png');
            const pdf = new jsPDF('p', 'mm', 'a4');
            const pdfWidth = pdf.internal.pageSize.getWidth();
            const pdfHeight = pdf.internal.pageSize.getHeight();
            
            const imgHeight = (canvas.height * pdfWidth) / canvas.width;

            let heightLeft = imgHeight;
            let position = 0;

            pdf.addImage(imgData, 'PNG', 0, position, pdfWidth, imgHeight);
            heightLeft -= pdfHeight;

            while (heightLeft > 0) {
              position = heightLeft - imgHeight; 
              pdf.addPage();
              pdf.addImage(imgData, 'PNG', 0, position, pdfWidth, imgHeight);
              heightLeft -= pdfHeight;
            }
            
            pdf.save(`remesa_vehiculo_${vehicle.placa}.pdf`);
        });
    };

    const manifestTotals = invoices.reduce((acc, inv) => {
        const financials = calculateFinancialDetails(inv.guide, companyInfo);
        const totalPackages = inv.guide.merchandise.reduce((sum, m) => sum + m.quantity, 0);
        
        acc.packages += totalPackages;
        acc.amount += inv.totalAmount;
        acc.iva += financials.iva;
        acc.ipostel += financials.ipostel;

        return acc;
    }, { packages: 0, amount: 0, iva: 0, ipostel: 0 });

    return (
        <Modal isOpen={isOpen} onClose={onClose} title={`Remesa de Carga - Vehículo ${vehicle.placa}`} size="4xl">
            {/* Wrapper to handle scrolling for the fixed-width document */}
            <div className="flex justify-center bg-gray-100 dark:bg-gray-800 py-4 rounded-lg overflow-auto max-h-[75vh]">
                {/* Fixed A4 Size Container */}
                <div 
                    id="manifest-to-print" 
                    className="bg-white text-black font-mono text-[11px] leading-tight printable-area shadow-xl"
                    style={{ 
                        width: '794px', 
                        minHeight: '1123px', 
                        padding: '40px', 
                        boxSizing: 'border-box'
                    }}
                >
                    <div className="flex justify-between items-start pb-4 border-b border-black text-black">
                        <div>
                            <h1 className="text-base font-bold text-black uppercase">{companyInfo.name}</h1>
                            <p className="text-xs text-black">RIF: {companyInfo.rif}</p>
                        </div>
                        <div className="text-right text-black">
                            <h2 className="text-base font-bold uppercase text-black">MANIFIESTO DE RUTA Y CARGA</h2>
                            <p className="text-xs font-mono text-black"><strong>Fecha:</strong> {new Date().toLocaleDateString('es-VE')}</p>
                        </div>
                    </div>

                    <div className="grid grid-cols-2 md:grid-cols-4 gap-x-4 gap-y-1 mt-4 text-xs border p-2 rounded-md text-black border-black">
                        <div className="text-black"><strong className="block text-gray-600 text-[10px]">VEHÍCULO:</strong> {vehicle.modelo}</div>
                        <div className="text-black"><strong className="block text-gray-600 text-[10px]">PLACA:</strong> {vehicle.placa}</div>
                        <div className="text-black"><strong className="block text-gray-600 text-[10px]">CONDUCTOR:</strong> {vehicle.driver}</div>
                        <div className="text-black"><strong className="block text-gray-600 text-[10px]">C.I / RIF:</strong> No disponible</div>
                    </div>

                    <div className="mt-4 overflow-x-auto">
                        <table className="w-full text-[11px] border-t border-b text-black table-fixed">
                            <thead className="bg-gray-100 text-black border-b border-black">
                                <tr>
                                    <th className="px-1 py-1 text-left font-bold text-black w-[12%]">FACTURA</th>
                                    <th className="px-1 py-1 text-left font-bold text-black w-[20%]">DESTINATARIO</th>
                                    <th className="px-1 py-1 text-left font-bold text-black w-[28%]">DESCRIPCIÓN</th>
                                    <th className="px-1 py-1 text-center font-bold text-black w-[6%]">PAQ.</th>
                                    <th className="px-1 py-1 text-right font-bold text-black w-[11%]">IPOSTEL</th>
                                    <th className="px-1 py-1 text-right font-bold text-black w-[11%]">IVA</th>
                                    <th className="px-1 py-1 text-right font-bold text-black w-[12%]">TOTAL</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y text-black">
                                {invoices.map(invoice => {
                                    const receiver = getClient(invoice.guide.receiver);
                                    const financials = calculateFinancialDetails(invoice.guide, companyInfo);
                                    const description = invoice.guide.merchandise.map(m => `${m.quantity}x ${m.description}`).join(', ');
                                    const totalPackages = invoice.guide.merchandise.reduce((acc, m) => acc + m.quantity, 0);

                                    return (
                                        <tr key={invoice.id} className="text-black border-b border-gray-200">
                                            <td className="px-1 py-1 font-mono text-black">{invoice.invoiceNumber}</td>
                                            <td className="px-1 py-1 text-black truncate">{receiver?.name}</td>
                                            <td className="px-1 py-1 whitespace-nowrap overflow-hidden text-ellipsis text-black" title={description}>{description}</td>
                                            <td className="px-1 py-1 text-center text-black font-bold">{totalPackages}</td>
                                            <td className="px-1 py-1 text-right text-black">{financials.ipostel.toLocaleString('es-VE', { minimumFractionDigits: 2 })}</td>
                                            <td className="px-1 py-1 text-right text-black">{financials.iva.toLocaleString('es-VE', { minimumFractionDigits: 2 })}</td>
                                            <td className="px-1 py-1 text-right font-bold text-black">{invoice.totalAmount.toLocaleString('es-VE', { minimumFractionDigits: 2 })}</td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                            <tfoot className="bg-gray-100 font-bold border-t-2 border-black text-black">
                                <tr>
                                    <td className="px-1 py-1 text-black text-right pr-2" colSpan={3}>TOTALES</td>
                                    <td className="px-1 py-1 text-center text-black">{manifestTotals.packages}</td>
                                    <td className="px-1 py-1 text-right text-black">{formatCurrency(manifestTotals.ipostel)}</td>
                                    <td className="px-1 py-1 text-right text-black">{formatCurrency(manifestTotals.iva)}</td>
                                    <td className="px-1 py-1 text-right text-black">{formatCurrency(manifestTotals.amount)}</td>
                                </tr>
                            </tfoot>
                        </table>
                    </div>

                    <div className="mt-16 pt-8 text-black">
                        <div className="grid grid-cols-2 gap-8 text-center text-xs text-black">
                            <div>
                                <p className="border-t border-black pt-1 text-black">{vehicle.driver}</p>
                                <p className="font-bold text-black">Conductor</p>
                            </div>
                            <div>
                                <p className="border-t border-black pt-1 text-black">_________________________</p>
                                <p className="font-bold text-black">Despachador</p>
                            </div>
                        </div>
                    </div>
                    
                    <div className="mt-8 text-center text-[9px] text-gray-600">
                        <p>Este documento certifica la transferencia de custodia de la mercancía listada.</p>
                    </div>

                </div>
            </div>
            <div className="flex justify-end space-x-3 p-4 border-t dark:border-gray-700 no-print">
                <Button type="button" variant="secondary" onClick={onClose}>
                    <XIcon className="w-4 h-4 mr-2" />Cerrar
                </Button>
                <Button type="button" onClick={handleDownloadPdf}>
                    <DownloadIcon className="w-4 h-4 mr-2" />Descargar PDF
                </Button>
            </div>
        </Modal>
    );
};

export default VehicleShipmentManifest;
