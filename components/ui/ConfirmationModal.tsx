
import React from 'react';
import Modal from './Modal';
import Button from './Button';
import { ExclamationTriangleIcon, InformationCircleIcon } from '../icons/Icons';

interface ConfirmationModalProps {
    isOpen: boolean;
    title: string;
    message: string;
    confirmText?: string;
    cancelText?: string;
    variant?: 'danger' | 'primary' | 'warning';
    onConfirm: () => void;
    onCancel: () => void;
}

const ConfirmationModal: React.FC<ConfirmationModalProps> = ({
    isOpen,
    title,
    message,
    confirmText = 'Confirmar',
    cancelText = 'Cancelar',
    variant = 'danger',
    onConfirm,
    onCancel
}) => {
    const isDanger = variant === 'danger';
    const isWarning = variant === 'warning';

    const getIconColor = () => {
        if (isDanger) return 'bg-red-100 text-red-600';
        if (isWarning) return 'bg-yellow-100 text-yellow-600';
        return 'bg-blue-100 text-blue-600';
    };

    return (
        <Modal isOpen={isOpen} onClose={onCancel} title={title} size="sm">
            <div className="flex flex-col items-center text-center p-2">
                <div className={`p-3 rounded-full mb-4 ${getIconColor()}`}>
                    {isDanger || isWarning ? <ExclamationTriangleIcon className="w-8 h-8" /> : <InformationCircleIcon className="w-8 h-8" />}
                </div>
                <p className="text-gray-600 dark:text-gray-300 mb-6">{message}</p>
                
                <div className="flex gap-4 w-full justify-center">
                    <Button variant="secondary" onClick={onCancel} className="w-1/2">
                        {cancelText}
                    </Button>
                    <Button variant={variant} onClick={onConfirm} className="w-1/2">
                        {confirmText}
                    </Button>
                </div>
            </div>
        </Modal>
    );
};

export default ConfirmationModal;