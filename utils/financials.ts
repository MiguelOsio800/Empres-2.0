
import { ShippingGuide, CompanyInfo, Financials, Invoice, ShippingType, Asociado } from '../types';

/**
 * Calculates all financial details for a given shipping guide.
 * This centralized function ensures consistency across the application.
 * @param guide The shipping guide containing all merchandise and shipping details.
 * @param companyInfo The company's configuration, including cost per kg.
 * @returns A Financials object with all calculated values.
 */
export const calculateFinancialDetails = (guide: ShippingGuide, companyInfo: CompanyInfo): Financials => {
    // Return zeroed financials if there's no merchandise or guide
    if (!guide || !guide.merchandise) {
        return { freight: 0, insuranceCost: 0, handling: 0, discount: 0, subtotal: 0, ipostel: 0, iva: 0, igtf: 0, total: 0 };
    }

    // NUEVO: Flete es el monto manual ingresado
    const freight = parseFloat(String(guide.baseFreightAmount)) || 0;

    // Calculate discount from freight value
    const discountPercentage = parseFloat(String(guide.discountPercentage)) || 0;
    const discountAmount = guide.hasDiscount
        ? freight * (discountPercentage / 100)
        : 0;

    const freightAfterDiscount = freight - discountAmount;
    
    // Insurance is calculated on the declared value
    const declaredValue = parseFloat(String(guide.declaredValue)) || 0;
    const insurancePercentage = parseFloat(String(guide.insurancePercentage)) || 0;
    const insuranceCost = guide.hasInsurance ? declaredValue * (insurancePercentage / 100) : 0;
    
    // NUEVO: El campo costPerKg ahora se usa como cargo fijo por Manejo/Guía
    const handling = parseFloat(String(companyInfo.costPerKg)) || 0;

    const subtotal = freightAfterDiscount + insuranceCost + handling;
    
    // Cálculo del Peso Total
    const totalWeight = guide.merchandise.reduce((acc, item) => {
        return acc + (parseFloat(String(item.weight)) || 0);
    }, 0);

    /**
     * REGLA REFINADA DE IPOSTEL:
     * - Si el peso es 0: No se calcula (valor mínimo).
     * - Si el peso está entre 0.1 y 30.99 kg: Se calcula el 6% del flete.
     * - Si el peso es 31 kg o más: No se calcula (valor mínimo).
     */
    const ipostel = (totalWeight >= 0.1 && totalWeight <= 30.99) 
        ? (freight * 0.06) 
        : 0.000001;
    
    // IVA is now mandatory at 16%
    const iva = subtotal * 0.16;

    const preIgtfTotal = subtotal + ipostel + iva;

    // IGTF (3%) is applied if the payment currency is USD
    const igtf = guide.paymentCurrency === 'USD' ? preIgtfTotal * 0.03 : 0;
    
    const total = preIgtfTotal + igtf;

    return { freight, insuranceCost, handling, discount: discountAmount, subtotal, ipostel, iva, igtf, total };
};


/**
 * Calculates the total chargeable weight for a given invoice.
 * @param invoice The invoice object.
 * @returns The total chargeable weight in Kg.
 */
export const calculateInvoiceChargeableWeight = (invoice: Invoice): number => {
    if (!invoice || !invoice.guide || !invoice.guide.merchandise) {
        return 0;
    }
    return invoice.guide.merchandise.reduce((acc, item) => {
        const realWeight = parseFloat(String(item.weight)) || 0;
        const length = parseFloat(String(item.length)) || 0;
        const width = parseFloat(String(item.width)) || 0;
        const height = parseFloat(String(item.height)) || 0;
        const volumetricWeight = (length * width * height) / 5000;
        return acc + Math.max(realWeight, volumetricWeight);
    }, 0);
};

export interface DetailedFinancials {
    pagado: {
        flete: number;
        viajes: number;
        sobres: number;
        seguro: number;
        ipostel: number;
        manejo: number;
        iva: number;
        favorCooperativa: number;
        favorAsociado: number;
    };
    destino: {
        flete: number;
        viajes: number;
        sobres: number;
        seguro: number;
        ipostel: number;
        manejo: number;
        iva: number;
        favorCooperativa: number;
        favorAsociado: number;
    };
    totalDestino: number;
    totalPagado: number;
    cargosDestino: number;
    cargosPagado: number;
    favorSocioPagado: number;
    cooperativeAmount: number;
    saldoFinal: number;
    conceptoSaldo: string;
    modalidadSaldo: 'Destino' | 'Pagado' | 'Iguales';
}

export const calculateDetailedRemesaFinancials = (
    invoices: Invoice[], 
    companyInfo: CompanyInfo, 
    shippingTypes: ShippingType[],
    asociado?: Asociado
): DetailedFinancials => {
    const init = { flete: 0, viajes: 0, sobres: 0, seguro: 0, ipostel: 0, manejo: 0, iva: 0, favorCooperativa: 0, favorAsociado: 0 };
    
    // Paso 1: Segregación de Acumuladores
    const result: DetailedFinancials = {
        pagado: { ...init },
        destino: { ...init },
        totalDestino: 0,
        totalPagado: 0,
        cargosDestino: 0,
        cargosPagado: 0,
        favorSocioPagado: 0,
        cooperativeAmount: 0,
        saldoFinal: 0,
        conceptoSaldo: 'Ceros',
        modalidadSaldo: 'Iguales'
    };

    const isNoAsociado = asociado?.nombre.toLowerCase().includes('no asociado') || asociado?.nombre.toLowerCase().includes('no asociados') || asociado?.nombre.toLowerCase().includes('no afiliado');

    invoices.forEach(inv => {
        const fin = calculateFinancialDetails(inv.guide, companyInfo);
        
        const totalAmount = inv.totalAmount; 

        // Lógica actualizada: 100% si es afiliado, 30% si no es afiliado
        let coopPercentage = isNoAsociado ? 0.30 : 1.00; 
        
        const favorCoop = totalAmount * coopPercentage;
        
        const handling = inv.Montomanejo !== undefined ? inv.Montomanejo : fin.handling;
        const ipostel = inv.ipostelFee !== undefined ? inv.ipostelFee : fin.ipostel;
        const insuranceCost = fin.insuranceCost;
        const iva = fin.iva;
        const flete = totalAmount - (insuranceCost + ipostel + handling + iva);

        // Si la empresa cobra el 100% (afiliado), favorCoop ya incluye todo.
        // Si cobra el 30%, entonces recauda ese 30% MÁS los gastos extra (seguro, ipostel, manejo, iva).
        const cargosExtrasFactura = isNoAsociado 
            ? favorCoop + insuranceCost + ipostel + handling + iva
            : favorCoop;
            
        const socioShare = totalAmount - cargosExtrasFactura;


        if (inv.guide.paymentType === 'flete-pagado') {
            result.totalPagado += totalAmount;
            result.cargosPagado += cargosExtrasFactura;
            result.favorSocioPagado += socioShare;
            
            // For UI backward compatibility in report tables
            result.pagado.flete += flete;
            result.pagado.seguro += insuranceCost;
            result.pagado.ipostel += ipostel;
            result.pagado.manejo += handling;
            result.pagado.iva += iva;
            result.pagado.favorCooperativa += favorCoop;
            result.pagado.favorAsociado += socioShare;
        } else {
            result.totalDestino += totalAmount;
            result.cargosDestino += cargosExtrasFactura;
            
            // For UI backward compatibility in report tables
            result.destino.flete += flete;
            result.destino.seguro += insuranceCost;
            result.destino.ipostel += ipostel;
            result.destino.manejo += handling;
            result.destino.iva += iva;
            result.destino.favorCooperativa += favorCoop;
            result.destino.favorAsociado += socioShare;
        }
    });

    // Paso 2: Implementación de la nueva lógica
    result.cooperativeAmount = result.totalPagado * (isNoAsociado ? 0.30 : 1.00) + result.totalDestino * (isNoAsociado ? 0.30 : 1.00);
    result.saldoFinal = result.cooperativeAmount;
    result.conceptoSaldo = 'Total Empresa';
    result.modalidadSaldo = 'Iguales';

    return result;
};
