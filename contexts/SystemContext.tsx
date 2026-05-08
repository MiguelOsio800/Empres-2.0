
import React, { createContext, useContext, useEffect, useCallback, ReactNode, useState } from 'react';
import { AuditLog, User, AppError } from '../types';
import { apiFetch } from '../utils/api';
import { useAuth } from './AuthContext';

interface SystemContextType {
    auditLog: AuditLog[];
    appErrors: AppError[];
    logAction: (user: User, actionType: string, details: string, targetId?: string) => Promise<void>;
    setAppErrors: React.Dispatch<React.SetStateAction<AppError[]>>;
    reportErrorToBackend: (errorInfo: Partial<AppError>) => Promise<void>;
}

const SystemContext = createContext<SystemContextType | undefined>(undefined);

export const SystemProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const { isAuthenticated, currentUser } = useAuth();
    const [auditLog, setAuditLog] = useState<AuditLog[]>([]);
    const [appErrors, setAppErrors] = useState<AppError[]>([]);

    useEffect(() => {
        const fetchLogs = async () => {
            if (isAuthenticated && currentUser) {
                const isAdmin = currentUser.roleId === 'role-admin';
                const isTech = currentUser.roleId === 'role-tech';
                
                if (isAdmin || isTech) {
                    try {
                        const logs = await apiFetch<AuditLog[]>('/audit-logs');
                        setAuditLog(Array.isArray(logs) ? logs : []);
                    } catch (error: any) {
                        if (error.message && (
                            error.message.includes('403') || 
                            error.message.includes('401') ||
                            error.message.includes('No tiene los permisos')
                        )) {
                            return; 
                        }
                        console.error("Failed to fetch audit logs", error);
                        setAuditLog([]);
                    }
                } else {
                    setAuditLog([]);
                }
            } else {
                setAuditLog([]);
            }
        };
        fetchLogs();
    }, [isAuthenticated, currentUser]);

    const logAction = useCallback(async (user: User, actionType: string, details: string, targetId?: string) => {
        if (!user) return;
        const newLogEntry: Omit<AuditLog, 'id'> = {
            timestamp: new Date().toISOString(),
            userId: user.id,
            userName: user.name,
            action: actionType,
            details: details,
            targetId: targetId
        };
        
        try {
            const savedLog = await apiFetch<AuditLog>('/audit-logs', {
                method: 'POST',
                body: JSON.stringify(newLogEntry),
            });
            if (auditLog.length > 0) {
                setAuditLog(prev => [savedLog, ...prev]);
            }
        } catch (error: any) {
            if (error.message && (error.message.includes('Session expired') || error.message.includes('401'))) {
                return;
            }
            console.error("Failed to save audit log to server:", error);
        }
    }, [auditLog]);

    const reportErrorToBackend = useCallback(async (errorInfo: Partial<AppError>) => {
        try {
            await apiFetch('/audit-logs/report-error', {
                method: 'POST',
                body: JSON.stringify({
                    message: errorInfo.message,
                    source: errorInfo.source,
                    lineno: errorInfo.lineno,
                    colno: errorInfo.colno,
                    error: errorInfo.error,
                    timestamp: new Date().toISOString(),
                    userId: currentUser?.id,
                    userName: currentUser?.name
                })
            });
        } catch (e) {
            console.warn("Failed to persist error in backend:", e);
        }
    }, [currentUser]);

    useEffect(() => {
        const handleError = (message: Event | string, source?: string, lineno?: number, colno?: number, error?: Error) => {
            const errorData: AppError = {
                id: `err-${Date.now()}`,
                message: typeof message === 'string' ? message : (message as ErrorEvent).message,
                source: source || 'unknown',
                lineno: lineno || 0,
                colno: colno || 0,
                error: error ? error.stack || error.toString() : 'N/A',
                timestamp: new Date().toISOString(),
            };
            setAppErrors(prev => [errorData, ...prev.slice(0, 99)]);
            reportErrorToBackend(errorData);
        };
        window.onerror = handleError;
        return () => { window.onerror = null; };
    }, [setAppErrors, reportErrorToBackend]);

    return (
        <SystemContext.Provider value={{ auditLog, appErrors, logAction, setAppErrors, reportErrorToBackend }}>
            {children}
        </SystemContext.Provider>
    );
};

export const useSystem = (): SystemContextType => {
    const context = useContext(SystemContext);
    if (!context) {
        throw new Error('useSystem must be used within a SystemProvider');
    }
    return context;
};
