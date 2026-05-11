
export type Page = 'dashboard' | 'shipping-guide' | 'invoices' | 'asociados' | 'reports' | 'configuracion' | 'categories' | 'edit-invoice' | 'report-detail' | 'clientes' | 'proveedores' | 'gastos' | 'offices' | 'shipping-types' | 'payment-methods' | 'libro-contable' | 'inventario' | 'auditoria' | 'inventario-bienes' | 'inventario-envios' | 'bienes-categorias' | 'asociados-gestion' | 'asociados-estadisticas' | 'asociados-reportes' | 'asociados-pagos' | 'remesas' | 'flota' | 'flota-vehiculos' | 'cobranzas';

export type Permissions = Record<string, boolean>;

export interface Role {
    id: string;
    name: string;
    permissions: Permissions;
}

export interface User {
    id: string;
    name: string; // Full display name
    username: string; // Login username
    email?: string; // Optional email
    roleId: string;
    officeId?: string;
    asociadoId?: string; // Link to an Associate (Fleet Owner logic)
    password?: string;
    permissions?: Permissions; // Permissions injected directly from backend (Solution 1)
}

export interface CompanyInfo {
    name: string;
    rif: string;
    address: string;
    phone: string;
    logoUrl?: string;
    loginImageUrl?: string;
    costPerKg?: number; // Ahora usado como Costo por Manejo/Guía
    bcvRate?: number;
    postalLicense?: string;
}

export interface Office {
    id: string;
    code: string;
    name: string;
    address: string;
    phone: string;
    email?: string;
}

export interface ShippingType {
    id: string;
    name: string;
}

export type PaymentMethodType = 'Efectivo' | 'Transferencia' | 'PagoMovil' | 'Credito' | 'Otro';

export interface PaymentMethod {
    id: string;
    name: string; // A user-friendly label, e.g., "Cuenta Ahorro Banesco"
    type: PaymentMethodType;
    bankName?: string;
    accountNumber?: string;
    accountType?: 'corriente' | 'ahorro';
    beneficiaryName?: string;
    beneficiaryId?: string; // RIF or Cedula
    phone?: string; // For Pago Móvil
    email?: string; // Optional for notifications
}


export interface Category {
    id: string;
    name: string;
}

export interface Client {
    id: string;
    idNumber: string; // RIF/Cédula
    clientType: 'persona' | 'empresa';
    name: string;
    phone: string;
    address: string;
    email?: string;
    officeId?: string;
}

export interface Supplier {
    id: string;
    idNumber: string; // RIF
    name: string; // Razón Social
    phone: string;
    address: string;
}

export interface Merchandise {
    quantity: number;
    weight: number;
    length: number;
    width: number;
    height: number;
    description: string;
    categoryId: string;
}

export interface ShippingGuide {
    guideNumber: string;
    date: string;
    originOfficeId: string;
    destinationOfficeId: string;
    specificDestination?: string; // Renombrado para Backend: Destino específico de entrega
    sender: Partial<Client>;
    receiver: Partial<Client>;
    merchandise: Merchandise[];
    shippingTypeId: string;
    paymentMethodId: string;
    hasInsurance: boolean;
    declaredValue: number;
    insurancePercentage: number;
    paymentType: 'flete-pagado' | 'flete-destino';
    paymentCurrency: 'VES' | 'USD';
    hasDiscount: boolean;
    discountPercentage: number;
    baseFreightAmount: number; // Nuevo: Monto manual del flete
    pickupOrder?: string;
    isTransbordo?: boolean;
    receivedBy?: string;
}

export interface Financials {
    freight: number;
    insuranceCost: number;
    handling: number;
    discount: number;
    subtotal: number;
    ipostel: number;
    iva: number;
    igtf: number;
    total: number;
}

export type PaymentStatus = 'Pagada' | 'Pendiente';
export type ShippingStatus = 'Pendiente para Despacho' | 'En Tránsito' | 'En Oficina Destino' | 'Entregada' | 'Reportada Falta';
export type MasterStatus = 'Activa' | 'Anulada';

export interface Invoice {
    id: string;
    invoiceNumber: string;
    controlNumber: string;
    date: string;
    clientName: string;
    clientIdNumber: string;
    totalAmount: number;
    status: MasterStatus;
    paymentStatus: PaymentStatus;
    shippingStatus: ShippingStatus;
    guide: ShippingGuide;
    officeId?: string;
    Office?: { id: string; name: string; code?: string; };
    vehicleId?: string;
    remesaId?: string;
    Remesa?: Remesa;
    
    // Campos mapeados al Backend (Sequelize Model)
    clientEmail?: string | null;
    createdByName?: string; 
    
    // Campos Financieros
    montoFlete?: number;        // Monto Base del Flete (baseFreightAmount)
    Montomanejo?: number;       // Monto por manejo
    ipostelFee?: number;        // Monto Ipostel
    insuranceAmount?: number;   // Monto Seguro
    exchangeRate?: number;      // Tasa de cambio (BCV)
    discountAmount?: number;    // Monto total del descuento
    discountPercentage?: number;// Porcentaje aplicado
    specificDestination?: string; // Mapeo directo para persistencia en base de datos
}

export interface Report {
    id: string;
    title: string;
}

export interface Vehicle {
  id: string;
  asociadoId: string;
  placa: string;
  modelo: string;
  ano: number;
  color: string;
  serialCarroceria: string;
  serialMotor: string;
  tipo: string; 
  uso: string; 
  servicio: string;
  nroPuestos: number;
  nroEjes: number;
  tara: number;
  capacidadCarga: number;
  clase: string;
  actividadVehiculo: 'Carga' | 'Pasajero';
  status: 'Disponible' | 'En Mantenimiento' | 'En Ruta';
  driver: string;
  currentLoadKg: number;
  imageUrl?: string;
}

export interface Remesa {
    id: string;
    remesaNumber: string;
    date: string;
    asociadoId: string;
    vehicleId: string;
    invoiceIds: string[];
    totalAmount: number;
    totalPackages: number;
    totalWeight: number;
    exchangeRate?: number;
}

// --- New Types for Asociados Module ---

export interface Asociado {
    id: string;
    codigo: string;
    nombre: string;
    cedula: string;
    fechaNacimiento: string;
    fechaIngreso: string;
    telefono: string;
    correoElectronico?: string;
    direccion: string;
    status: 'Activo' | 'Inactivo' | 'Suspendido';
    observaciones?: string;
}

export interface Certificado {
    id: string;
    vehiculoId: string;
    codigo: string;
    descripcion: string;
    fechaInicio: string;
    fechaSuspension?: string;
    rutaVehiculo?: string;
    status: 'Activo' | 'Inactivo' | 'Suspendido' | 'Excluido';
}

export interface PagoAsociado {
    id: string;
    asociadoId: string;
    concepto: string;
    cuotas: string; 
    montoBs: number;
    montoUsd?: number;
    tasaCambio?: number;
    status: 'Pendiente' | 'Pagado';
    reciboId?: string;
    fecha: string; // ISO date string
    createdAt?: string; // ISO date string for grouping
}

export interface ReciboPagoAsociado {
    id: string;
    comprobanteNumero: string;
    asociadoId: string;
    fechaPago: string;
    montoTotalBs: number;
    montoTotalUsd?: number;
    tasaBcv: number;
    pagosIds: string[];
    detallesPago: Array<{
        tipo: string;
        banco?: string;
        referencia?: string;
        monto: number;
    }>;
}


// New Types
export interface ExpenseCategory {
    id: string;
    name: string;
}

export interface Expense {
    id: string;
    date: string;
    description: string;
    category: string; // ExpenseCategory name
    categoryId?: string; // Add categoryId
    amount: number; // This is the TOTAL amount
    currency?: string; // Add currency
    officeId?: string;
    status: 'Pagado' | 'Pendiente';
    
    // SENIAT fields for Libro de Compras
    supplierId?: string; // Add supplierId
    supplierRif?: string;
    supplierName?: string;
    invoiceNumber?: string; // N de factura del proveedor
    controlNumber?: string; // N de control del proveedor
    taxableBase?: number; // Base imponible
    vatAmount?: number; // Monto del IVA
    paymentMethodId?: string;
    createdAt?: string;
}

export interface InventoryItem {
    id: string;
    sku: string;
    name: string;
    description: string;
    stock: number;
    unit: 'unidad' | 'caja' | 'kg' | 'm';
    invoiceId?: string;
    invoiceNumber?: string;
    shippingStatus: ShippingStatus;
    weight?: number;
    officeId?: string;
}

export interface AuditLog {
    id: string;
    timestamp: string;
    userId: string;
    userName: string;
    action: string;
    details: string;
    targetId?: string;
}

export interface AssetCategory {
    id: string;
    name: string;
}

export interface Asset {
    id: string;
    code: string; // Asset code/tag
    name: string;
    description: string;
    purchaseDate: string;
    purchaseValue: number;
    officeId?: string; // Where the asset is located
    status: 'Activo' | 'En Mantenimiento' | 'De Baja';
    imageUrl?: string;
    categoryId?: string;
}

export interface AppError {
    id: string;
    message: string;
    source: string;
    lineno: number;
    colno: number;
    error: string;
    timestamp: string;
}

export type TipoCuentaContable = 'Activo' | 'Pasivo' | 'Patrimonio' | 'Ingreso' | 'Costo' | 'Gasto';

export interface CuentaContable {
    id: string;
    codigo: string;
    nombre: string;
    tipo: TipoCuentaContable;
}

export interface AsientoManualEntry {
  id: string; // unique id for the row
  cuentaId: string;
  debe: number;
  haber: number;
}

export interface AsientoManual {
  id: string;
  fecha: string;
  descripcion: string;
  entries: AsientoManualEntry[];
}
