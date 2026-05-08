
import React, { createContext, useContext, useState, useCallback, ReactNode, useRef } from 'react';
import ConfirmationModal from '../components/ui/ConfirmationModal';

interface ConfirmOptions {
    title: string;
    message: string;
    confirmText?: string;
    cancelText?: string;
    variant?: 'danger' | 'primary' | 'warning';
}

interface ConfirmationContextType {
    confirm: (options: ConfirmOptions) => Promise<boolean>;
}

const ConfirmationContext = createContext<ConfirmationContextType | undefined>(undefined);

export const useConfirm = () => {
    const context = useContext(ConfirmationContext);
    if (!context) {
        throw new Error('useConfirm must be used within a ConfirmationProvider');
    }
    return context;
};

export const ConfirmationProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const [isOpen, setIsOpen] = useState(false);
    const [options, setOptions] = useState<ConfirmOptions>({ title: '', message: '' });
    const resolveRef = useRef<(value: boolean) => void>(() => {});

    const confirm = useCallback((options: ConfirmOptions) => {
        setOptions(options);
        setIsOpen(true);
        return new Promise<boolean>((resolve) => {
            resolveRef.current = resolve;
        });
    }, []);

    const handleConfirm = () => {
        setIsOpen(false);
        resolveRef.current(true);
    };

    const handleCancel = () => {
        setIsOpen(false);
        resolveRef.current(false);
    };

    return (
        <ConfirmationContext.Provider value={{ confirm }}>
            {children}
            <ConfirmationModal
                isOpen={isOpen}
                title={options.title}
                message={options.message}
                confirmText={options.confirmText}
                cancelText={options.cancelText}
                variant={options.variant}
                onConfirm={handleConfirm}
                onCancel={handleCancel}
            />
        </ConfirmationContext.Provider>
    );
};
