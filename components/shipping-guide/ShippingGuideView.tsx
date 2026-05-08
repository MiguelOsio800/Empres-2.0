
import React from 'react';
import { Invoice, Client, Category, Office, ShippingType, PaymentMethod, CompanyInfo, User, Permissions } from '../../types';
import InvoiceForm from '../invoices/InvoiceForm';

interface ShippingGuideViewProps {
    onSaveInvoice: (invoice: Omit<Invoice, 'status' | 'shippingStatus'>) => Promise<Invoice | null>;
    categories: Category[];
    clients: Client[];
    offices: Office[];
    shippingTypes: ShippingType[];
    paymentMethods: PaymentMethod[];
    companyInfo: CompanyInfo;
    currentUser: User;
    permissions: Permissions;
}

const ShippingGuideView: React.FC<ShippingGuideViewProps> = (props) => {
    return (
        <div>
            <InvoiceForm
                onSave={props.onSaveInvoice}
                clients={props.clients}
                categories={props.categories}
                offices={props.offices}
                shippingTypes={props.shippingTypes}
                paymentMethods={props.paymentMethods}
                companyInfo={props.companyInfo}
                currentUser={props.currentUser}
                permissions={props.permissions}
            />
        </div>
    );
};

export default ShippingGuideView;
