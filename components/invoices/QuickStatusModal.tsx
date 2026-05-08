
import React, { useState } from 'react';
import Modal from '../ui/Modal';
import Button from '../ui/Button';
import Select from '../ui/Select';
import { Invoice, PaymentStatus, ShippingStatus } from '../../types';

interface QuickStatusModalProps {
    isOpen: boolean;
    onClose: () => void;
    invoice: Invoice;
    onUpdate: (invoiceId: string, updates: { paymentStatus?: PaymentStatus, shippingStatus?: ShippingStatus }) => Promise<void>;
}

const QuickStatusModal: React.FC<QuickStatusModalProps> = ({ isOpen, onClose, invoice, onUpdate }) => {
    const [paymentStatus, setPaymentStatus] = useState<PaymentStatus>(invoice.paymentStatus);
    const [shippingStatus, setShippingStatus] = useState<ShippingStatus>(invoice.shippingStatus);
    const [isSaving, setIsSaving] = useState(false);

    const handleSubmit = async () => {
        setIsSaving(true);
        await onUpdate(invoice.id, { paymentStatus, shippingStatus });
        setIsSaving(false);
        onClose();
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} title={`Actualizar Estado - ${invoice.invoiceNumber}`} size="sm">
            <div className="space-y-4">
                <Select 
                    label="Estado de Pago" 
                    value={paymentStatus} 
                    onChange={e => setPaymentStatus(e.target.value as PaymentStatus)}
                >
                    <option value="Pendiente">Pendiente</option>
                    <option value="Pagada">Pagada</option>
                </Select>

                <Select 
                    label="Estado de Envío" 
                    value={shippingStatus} 
                    onChange={e => setShippingStatus(e.target.value as ShippingStatus)}
                >
                    <option value="Pendiente para Despacho">Pendiente para Despacho</option>
                    <option value="En Tránsito">En Tránsito</option>
                    <option value="En Oficina Destino">En Oficina Destino</option>
                    <option value="Entregada">Entregada</option>
                    <option value="Reportada Falta">Reportada Falta</option>
                </Select>

                <div className="flex justify-end pt-4 space-x-2">
                    <Button variant="secondary" onClick={onClose} disabled={isSaving}>Cancelar</Button>
                    <Button onClick={handleSubmit} disabled={isSaving}>
                        {isSaving ? 'Guardando...' : 'Actualizar'}
                    </Button>
                </div>
            </div>
        </Modal>
    );
};

export default QuickStatusModal;
