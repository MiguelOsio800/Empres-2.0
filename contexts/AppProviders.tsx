
import React, { ReactNode } from 'react';
import ToastProvider from '../components/ui/ToastProvider';
import { AuthProvider } from './AuthContext';
import { DataProvider } from './DataContext';
import { ConfigProvider } from './ConfigContext';
import { SystemProvider } from './SystemContext';
import { ConfirmationProvider } from './ConfirmationContext';

const AppProviders: React.FC<{ children: ReactNode }> = ({ children }) => {
    return (
        <ToastProvider>
            <ConfirmationProvider>
                <AuthProvider>
                    <SystemProvider>
                        <ConfigProvider>
                            <DataProvider>
                                {children}
                            </DataProvider>
                        </ConfigProvider>
                    </SystemProvider>
                </AuthProvider>
            </ConfirmationProvider>
        </ToastProvider>
    );
};

export default AppProviders;
