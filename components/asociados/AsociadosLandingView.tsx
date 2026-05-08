
import React, { useState } from 'react';
import { Permissions } from '../../types';
import AccountingTile from '../libro-contable/AccountingTile';
import { UsersIcon, BarChartIcon, FileTextIcon, CreditCardIcon } from '../icons/Icons';

interface AsociadosLandingViewProps {
    permissions: Permissions;
}

const AsociadosLandingView: React.FC<AsociadosLandingViewProps> = ({ permissions }) => {
    
    if (!permissions['asociados.view']) {
        return null; 
    }

    return (
        <div className="max-w-4xl mx-auto">
            <h2 className="text-2xl font-bold text-gray-800 dark:text-white mb-6 text-center">Módulo de Conductores</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {permissions['asociados.view'] && (
                    <AccountingTile
                        title="Gestión de Conductores"
                        description="Crear, buscar y actualizar datos de conductores y vehículos."
                        icon={UsersIcon}
                        onClick={() => window.location.hash = 'asociados/gestion'}
                        colorVariant="blue"
                    />
                )}
            </div>
        </div>
    );
};

export default AsociadosLandingView;
