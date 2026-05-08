
import React, { useMemo } from 'react';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import { Remesa, Invoice, Asociado, Vehicle, Client, CompanyInfo, Office, Category, Merchandise, ShippingType } from '../../types';
import Modal from '../ui/Modal';
import Button from '../ui/Button';
import { DownloadIcon, XIcon } from '../icons/Icons';
import { calculateDetailedRemesaFinancials } from '../../utils/financials';


interface RemesaDocumentModalProps {
    isOpen: boolean;
    onClose: () => void;
    remesa: Remesa;
    invoices: Invoice[];
    asociados: Asociado[];
    vehicles: Vehicle[];
    clients: Client[];
    companyInfo: CompanyInfo;
    offices: Office[];
    categories: Category[];
    shippingTypes: ShippingType[];
}

const RemesaDocumentModal: React.FC<RemesaDocumentModalProps> = ({
    isOpen, onClose, remesa, invoices, asociados, vehicles, clients, companyInfo, offices, shippingTypes
}) => {

    const formatCurrency = (amount: number) => amount.toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

    const asociado = asociados.find(a => a.id === remesa.asociadoId);
    const vehicle = vehicles.find(v => v.id === remesa.vehicleId);
    const remesaInvoices = invoices.filter(inv => remesa.invoiceIds.includes(inv.id));
    
    // Calculate specific financials for the report structure
    const financials = useMemo(() => calculateDetailedRemesaFinancials(remesaInvoices, companyInfo, shippingTypes, asociado), [remesaInvoices, companyInfo, shippingTypes, asociado]);

    const totalPagado = remesaInvoices.filter(inv => inv.guide.paymentType === 'flete-pagado').reduce((sum, inv) => sum + inv.totalAmount, 0);
    const totalDestino = remesaInvoices.filter(inv => inv.guide.paymentType === 'flete-destino').reduce((sum, inv) => sum + inv.totalAmount, 0);

    const saldoDiferencia = totalPagado - totalDestino;

    const sumaTotalAbsoluta = totalPagado + totalDestino;
        
    const currentRate = remesa.exchangeRate || companyInfo.bcvRate || 1;
    const remesaTotalUsd = currentRate > 0 ? (remesa.totalAmount / currentRate).toFixed(2) : '0.00';
    const saldoFinalUsd = currentRate > 0 ? (Math.abs(financials.saldoFinal) / currentRate).toFixed(2) : '0.00';

    const getOfficeName = (id: string) => offices.find(o => o.id === id)?.name || id;

    // Grouping logic for invoices
    type RenderItem = { type: 'header', title: string } | { type: 'invoice', invoice: Invoice };

    const renderItems = useMemo(() => {
        const items: RenderItem[] = [];
        const groups: { [key: string]: Invoice[] } = {};
        
        remesaInvoices.forEach(inv => {
            const zoneName = inv.specificDestination || getOfficeName(inv.guide.destinationOfficeId);
            if (!groups[zoneName]) groups[zoneName] = [];
            groups[zoneName].push(inv);
        });

        Object.keys(groups).sort().forEach(zone => {
            items.push({ type: 'header', title: zone });
            groups[zone].forEach(inv => {
                items.push({ type: 'invoice', invoice: inv });
            });
        });
        return items;
    }, [remesaInvoices, offices]);

    // Totals for the top table
    const topTableTotals = remesaInvoices.reduce((acc, inv) => {
        const totalPackages = inv.guide.merchandise.reduce((sum, m) => sum + m.quantity, 0);
        acc.pza += totalPackages;
        return acc;
    }, { pza: 0 });

    // Helper to chunk items for pagination
    const chunkArray = (arr: any[], size: number) => {
        const chunks = [];
        for (let i = 0; i < arr.length; i += size) {
            chunks.push(arr.slice(i, i + size));
        }
        return chunks;
    };

    const ITEMS_PER_PAGE = 25;
    const itemChunks = chunkArray(renderItems, ITEMS_PER_PAGE);

    // The summary section takes up significant vertical space.
    // If the last page has more than 10 items, the summary might overflow and get cut off.
    // In that case, we force the summary onto a new page by adding an empty chunk.
    const MAX_ITEMS_WITH_SUMMARY = 10;
    if (itemChunks.length === 0 || itemChunks[itemChunks.length - 1].length > MAX_ITEMS_WITH_SUMMARY) {
        itemChunks.push([]);
    }

    const handleDownloadPdf = async () => {
        const pdf = new jsPDF('p', 'mm', 'a4');
        const pdfWidth = pdf.internal.pageSize.getWidth();
        const pdfHeight = pdf.internal.pageSize.getHeight();

        for (let i = 0; i < itemChunks.length; i++) {
            const pageId = `remesa-page-${i}`;
            const input = document.getElementById(pageId);
            if (!input) continue;

            if (i > 0) pdf.addPage();

            const canvas = await html2canvas(input, {
                scale: 2,
                useCORS: true,
                backgroundColor: '#ffffff',
                width: 794,
                height: 1123,
                windowWidth: 794,
                windowHeight: 1123
            });

            const imgData = canvas.toDataURL('image/png');
            pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
        }
        
        pdf.save(`remesa_${remesa.remesaNumber}.pdf`);
    };

    if (!isOpen) return null;

    const originOfficeName = remesaInvoices.length > 0 ? getOfficeName(remesaInvoices[0].guide.originOfficeId) : '';

    return (
        <Modal isOpen={isOpen} onClose={onClose} title={`Liquidación Remesa # ${remesa.remesaNumber}`} size="4xl">
            {/* Wrapper to handle scrolling for the fixed-width document */}
            <div className="flex flex-col items-center bg-gray-100 dark:bg-gray-800 py-4 rounded-lg overflow-auto max-h-[75vh] gap-4">
                
                {itemChunks.map((chunk, pageIndex) => (
                    <div 
                        key={pageIndex}
                        id={`remesa-page-${pageIndex}`}
                        className="bg-white text-black font-mono text-[11px] leading-tight printable-area shadow-xl relative"
                        style={{ 
                            width: '794px', 
                            height: '1123px', 
                            padding: '40px', 
                            boxSizing: 'border-box',
                            flexShrink: 0
                        }}
                    >
                        {/* Header */}
                        <div className="flex justify-between items-start mb-4 text-black">
                            <div className="w-1/2">
                                <h1 className="font-bold text-sm text-black">ASOCIACION COOPERATIVA MIXTA</h1>
                                <h1 className="font-bold text-sm text-black">FRATERNIDAD DEL TRANSPORTE, R.L.</h1>
                                <p className="text-black text-[10px]">RIF: {companyInfo.rif}</p>
                                <p className="text-black text-[10px]">OFICINA: {originOfficeName.toUpperCase()}</p>
                            </div>
                            <div className="text-right w-1/2 text-black">
                                <h2 className="font-bold text-base text-black">REMESA DE ASOCIADO</h2>
                                <p className="text-black"><strong>LIQUIDACION #:</strong> {remesa.remesaNumber}</p>
                                <p className="text-black"><strong>Emisión:</strong> {new Date().toLocaleDateString('es-VE')}</p>
                                <p className="text-black"><strong>Hora:</strong> {new Date().toLocaleTimeString('es-VE')}</p>
                                <p className="text-black"><strong>Página:</strong> {pageIndex + 1} de {itemChunks.length}</p>
                            </div>
                        </div>

                        <div className="text-center font-bold text-[11px] mb-2 text-black border-t border-b border-gray-300 py-1">
                            ENCOMIENDAS RECIBIDAS
                        </div>
                        <div className="text-center text-[10px] mb-4 text-black">
                            Desde: {new Date(remesa.date).toLocaleDateString('es-VE')} Hasta: {new Date(remesa.date).toLocaleDateString('es-VE')}
                        </div>

                        {/* Info Block */}
                        <div className="mb-4 text-black p-2 border border-gray-300 rounded text-[10px]">
                            <p className="text-black"><strong>ASOCIADO:</strong> {asociado?.codigo} - {asociado?.nombre}</p>
                            <p className="text-black"><strong>ORIGEN:</strong> {originOfficeName.toUpperCase()}</p>
                            {vehicle && <p className="text-black"><strong>CHOFER:</strong> {vehicle.driver}, <strong>Vehículo:</strong> {vehicle.modelo}, <strong>Color:</strong> {vehicle.color}, <strong>Placa:</strong> {vehicle.placa}</p>}
                        </div>

                        {/* Invoices Table */}
                        <table className="w-full border-collapse mb-2 text-black table-fixed text-[10px]">
                            <thead className="border-t-2 border-b-2 border-black">
                                <tr>
                                    <th className="text-left py-1 text-black w-[10%]">FACTURA</th>
                                    <th className="text-center py-1 text-black w-[4%]">TP</th>
                                    <th className="text-left py-1 text-black w-[22%] pl-1">DESTINATARIO</th>
                                    <th className="text-center py-1 text-black w-[5%]">Pzas</th>
                                    <th className="text-left pl-2 py-1 text-black w-[29%]">ENCOMIENDA</th>
                                    <th className="text-right py-1 text-black w-[10%]">PAGADO</th>
                                    <th className="text-right py-1 text-black w-[10%]">CREDITO</th>
                                    <th className="text-right py-1 text-black w-[10%]">DESTINO</th>
                                </tr>
                            </thead>
                            <tbody className="text-black">
                                {chunk.map((item, idx) => {
                                    if (item.type === 'header') {
                                        return (
                                            <tr key={`header-${idx}`} className="bg-gray-100">
                                                <td colSpan={8} className="py-1 px-2 font-bold text-black border-b border-black uppercase tracking-wider">
                                                    ZONA: {item.title}
                                                </td>
                                            </tr>
                                        );
                                    }

                                    const inv = item.invoice;
                                    const totalPackages = inv.guide.merchandise.reduce((sum, m) => sum + m.quantity, 0);
                                    const desc = inv.guide.merchandise[0]?.description || 'PAQUETE';
                                    const receiverName = inv.guide.receiver?.name || 'N/A';
                                    const amount = inv.totalAmount;
                                    const isPagado = inv.guide.paymentType === 'flete-pagado';
                                    const tpCode = isPagado ? '01' : '02';
                                    
                                    return (
                                        <tr key={inv.id} className="text-black border-b border-gray-100 last:border-0">
                                            <td className="py-1 text-black font-mono">{inv.invoiceNumber.replace('F-','')}</td>
                                            <td className="py-1 text-center text-black font-bold">{tpCode}</td>
                                            <td className="py-1 text-black truncate pl-1 uppercase" style={{ fontSize: '9px' }}>{receiverName}</td>
                                            <td className="py-1 text-center text-black">{totalPackages}</td>
                                            <td className="py-1 text-black pl-2 truncate uppercase" style={{ fontSize: '9px' }}>{desc}</td>
                                            <td className="py-1 text-right text-black">{isPagado ? formatCurrency(amount) : '0.00'}</td>
                                            <td className="py-1 text-right text-black">0.00</td>
                                            <td className="py-1 text-right text-black">{!isPagado ? formatCurrency(amount) : '0.00'}</td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                            {pageIndex === itemChunks.length - 1 && (
                                <tfoot className="border-t border-black font-bold text-black">
                                    <tr>
                                        <td colSpan={3} className="py-1 text-right text-black pr-2">Total piezas</td>
                                        <td className="py-1 text-center text-black">{topTableTotals.pza}</td>
                                        <td className="py-1"></td>
                                        <td className="py-1 text-right text-black">{formatCurrency(totalPagado)}</td>
                                        <td className="py-1 text-right text-black">0.00</td>
                                        <td className="py-1 text-right text-black">{formatCurrency(totalDestino)}</td>
                                    </tr>
                                </tfoot>
                            )}
                        </table>

                        {/* Totals and Signatures - Only on the last page */}
                        {pageIndex === itemChunks.length - 1 && (
                            <>
                                {/* Subtotals Lines */}
                                <div className="flex justify-between border-b border-dotted border-black py-1 font-bold text-black mt-2 text-[10px]">
                                    <span className="text-black">SUB TOTALES -&gt;</span>
                                    <div className="flex gap-8 w-[36%] justify-end">
                                        <span className="text-black w-[45%] text-right">{formatCurrency(totalPagado)}</span>
                                        <span className="text-black w-[45%] text-right">{formatCurrency(totalDestino)}</span>
                                    </div>
                                </div>
                                <div className="flex justify-between border-b-2 border-black py-1 font-bold mb-4 text-black text-[10px]">
                                    <span className="text-black">TOTALES -&gt;</span>
                                    <div className="flex gap-8 w-[36%] justify-end">
                                        <span className="text-black w-[45%] text-right">{formatCurrency(totalPagado)}</span>
                                        <span className="text-black w-[45%] text-right">{formatCurrency(totalDestino)}</span>
                                    </div>
                                </div>

                                {/* Financial Breakdown Table */}
                                <table className="w-full border-collapse mb-4 text-black table-fixed text-[10px]">
                                    <thead className="border-b border-black font-bold">
                                        <tr>
                                            <th className="text-left py-1 text-black w-[8%]"></th>
                                            <th className="text-right py-1 text-black w-[10%]">Flete</th>
                                            <th className="text-right py-1 text-black w-[8%]">Viajes</th>
                                            <th className="text-right py-1 text-black w-[8%]">Sobres</th>
                                            <th className="text-right py-1 text-black w-[10%]">Seguro</th>
                                            <th className="text-right py-1 text-black w-[10%]">Ipostel</th>
                                            <th className="text-right py-1 text-black w-[10%]">Manejo</th>
                                            <th className="text-right py-1 text-black w-[10%]">I.V.A.</th>
                                            <th className="text-right py-1 text-black w-[26%]">Favor Empresa</th>
                                        </tr>
                                    </thead>
                                    <tbody className="text-black">
                                        <tr className="border-b border-gray-200">
                                            <td className="font-bold py-1 text-black">Pagado</td>
                                            <td className="text-right py-1 text-black">{formatCurrency(financials.pagado.flete)}</td>
                                            <td className="text-right py-1 text-black">0.00</td>
                                            <td className="text-right py-1 text-black">0.00</td>
                                            <td className="text-right py-1 text-black">{formatCurrency(financials.pagado.seguro)}</td>
                                            <td className="text-right py-1 text-black">{formatCurrency(financials.pagado.ipostel)}</td>
                                            <td className="text-right py-1 text-black">{formatCurrency(financials.pagado.manejo)}</td>
                                            <td className="text-right py-1 text-black">{formatCurrency(financials.pagado.iva)}</td>
                                            <td className="text-right py-1 text-black font-semibold">{formatCurrency(financials.pagado.favorCooperativa)}</td>
                                        </tr>
                                        <tr className="border-b border-black">
                                            <td className="font-bold py-1 text-black">Destino</td>
                                            <td className="text-right py-1 text-black">{formatCurrency(financials.destino.flete)}</td>
                                            <td className="text-right py-1 text-black">0.00</td>
                                            <td className="text-right py-1 text-black">0.00</td>
                                            <td className="text-right py-1 text-black">{formatCurrency(financials.destino.seguro)}</td>
                                            <td className="text-right py-1 text-black">{formatCurrency(financials.destino.ipostel)}</td>
                                            <td className="text-right py-1 text-black">{formatCurrency(financials.destino.manejo)}</td>
                                            <td className="text-right py-1 text-black">{formatCurrency(financials.destino.iva)}</td>
                                            <td className="text-right py-1 text-black font-semibold">{formatCurrency(financials.destino.favorCooperativa)}</td>
                                        </tr>
                                        <tr className="font-bold">
                                            <td className="py-1 text-black">Total Bs.</td>
                                            <td className="text-right py-1 text-black">{formatCurrency(financials.pagado.flete + financials.destino.flete)}</td>
                                            <td className="text-right py-1 text-black">0.00</td>
                                            <td className="text-right py-1 text-black">0.00</td>
                                            <td className="text-right py-1 text-black">{formatCurrency(financials.pagado.seguro + financials.destino.seguro)}</td>
                                            <td className="text-right py-1 text-black">{formatCurrency(financials.pagado.ipostel + financials.destino.ipostel)}</td>
                                            <td className="text-right py-1 text-black">{formatCurrency(financials.pagado.manejo + financials.destino.manejo)}</td>
                                            <td className="text-right py-1 text-black">{formatCurrency(financials.pagado.iva + financials.destino.iva)}</td>
                                            <td className="text-right py-1 text-black font-semibold">{formatCurrency(financials.pagado.favorCooperativa + financials.destino.favorCooperativa)}</td>
                                        </tr>
                                    </tbody>
                                </table>

                                {/* Summary Section */}
                                <div className="grid grid-cols-2 gap-8 mt-4 text-black text-[10px]">
                                    <div className="pr-4">
                                        <div className="font-bold text-black mb-1 uppercase">
                                            Cargos Empresa (Destino)
                                        </div>
                                        <div className="flex justify-between py-1 text-black">
                                            <span className="text-black">Favor Empresa</span>
                                            <span className="text-black">
                                                {formatCurrency(financials.destino.favorCooperativa)}
                                            </span>
                                        </div>
                                        <div className="flex justify-between py-1 text-black">
                                            <span className="text-black">Seguro</span>
                                            <span className="text-black">
                                                {formatCurrency(financials.destino.seguro)}
                                            </span>
                                        </div>
                                        <div className="flex justify-between py-1 text-black">
                                            <span className="text-black">Ipostel</span>
                                            <span className="text-black">
                                                {formatCurrency(financials.destino.ipostel)}
                                            </span>
                                        </div>
                                        <div className="flex justify-between py-1 text-black">
                                            <span className="text-black">Manejo</span>
                                            <span className="text-black">
                                                {formatCurrency(financials.destino.manejo)}
                                            </span>
                                        </div>
                                        <div className="flex justify-between py-1 text-black">
                                            <span className="text-black">I.V.A.</span>
                                            <span className="text-black">
                                                {formatCurrency(financials.destino.iva)}
                                            </span>
                                        </div>
                                        <div className="flex justify-between py-1 font-bold text-black border-t border-black mt-1">
                                            <span className="text-black">TOTAL CARGOS</span>
                                            <span className="text-black">
                                                {formatCurrency(financials.cargosDestino)}
                                            </span>
                                        </div>
                                    </div>
                                    <div className="pl-4 border-l border-gray-300">
                                        <div className="flex justify-between py-1 font-bold text-black">
                                            <span className="text-black uppercase">
                                                Liquidación {companyInfo.companyName}
                                            </span>
                                        </div>
                                        <div className="flex justify-between py-2 border-transparent font-extrabold text-[12px] mt-2 text-white bg-black px-2">
                                            <span className="text-white uppercase">
                                                TOTAL EMPRESA:
                                            </span>
                                            <span className="text-white">
                                                {formatCurrency(financials.cooperativeAmount)}
                                            </span>
                                        </div>
                                        <div className="flex justify-between py-1 text-[10px] text-black mt-4">
                                            <span className="text-black">Tasa (BCV):</span>
                                            <span className="text-black">{currentRate} Bs/$</span>
                                        </div>
                                        <div className="flex justify-between py-1 text-[10px] text-black">
                                            <span className="text-black">Equivalente en ($):</span>
                                            <span className="text-black">${saldoFinalUsd}</span>
                                        </div>
                                    </div>
                                </div>

                                <div className="mt-8 mb-16 text-black text-[10px]">
                                    <p className="font-bold text-black">OBSERVACIONES:</p>
                                    <p className="text-black">Tp: 01=Pagado 02=Cobro a destino 03=Credito</p>
                                </div>

                                <div className="grid grid-cols-2 gap-16 mt-8 text-black text-[10px]">
                                    <div className="border-t border-black text-center pt-2">
                                        <p className="text-black font-bold">ASOCIADO</p>
                                        <p className="text-[9px] text-gray-600">Firma y Cédula</p>
                                    </div>
                                    <div className="border-t border-black text-center pt-2">
                                        <p className="font-bold text-black">ADMINISTRACIÓN</p>
                                        <p className="text-black">Firma Autorizada</p>
                                    </div>
                                </div>
                            </>
                        )}
                    </div>
                ))}
            </div>
            <div className="flex justify-end space-x-3 p-4 border-t dark:border-gray-700">
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

export default RemesaDocumentModal;
