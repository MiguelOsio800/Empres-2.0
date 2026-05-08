import React from 'react';
import { CompanyInfo } from '../../types';

interface CompanyHeaderProps {
    companyInfo: CompanyInfo;
}

const CompanyHeader: React.FC<CompanyHeaderProps> = ({ companyInfo }) => {
    return (
        <div className="flex items-center justify-between border-b pb-4 mb-6">
            <div className="flex items-center gap-4">
                {companyInfo.logoUrl ? (
                    <img src={companyInfo.logoUrl} alt="Logo" className="h-16 object-contain" referrerPolicy="no-referrer" />
                ) : (
                    <div className="w-16 h-16 bg-gray-200 rounded-full flex items-center justify-center text-gray-500 font-bold text-xl">
                        {companyInfo.name.substring(0, 2).toUpperCase()}
                    </div>
                )}
                <div>
                    <h2 className="text-xl font-bold text-gray-900 dark:text-white">{companyInfo.name}</h2>
                    <p className="text-sm text-gray-600 dark:text-gray-400">RIF: {companyInfo.rif}</p>
                    <p className="text-sm text-gray-600 dark:text-gray-400">{companyInfo.address}</p>
                    <p className="text-sm text-gray-600 dark:text-gray-400">Tel: {companyInfo.phone}</p>
                </div>
            </div>
        </div>
    );
};

export default CompanyHeader;
