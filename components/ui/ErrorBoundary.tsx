import * as React from 'react';
import { ErrorInfo, ReactNode } from 'react';
import Button from './Button';
import { ExclamationTriangleIcon } from '../icons/Icons';

interface Props {
    children: ReactNode;
    fallback?: ReactNode;
}

interface State {
    hasError: boolean;
    error: Error | null;
}

class ErrorBoundary extends (React.Component as any) {
    constructor(props: Props) {
        super(props);
        this.state = {
            hasError: false,
            error: null,
        };
    }

    public static getDerivedStateFromError(error: Error): State {
        return { hasError: true, error };
    }

    public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
        console.error("Uncaught error:", error, errorInfo);
    }

    private handleRetry = () => {
        this.setState({ hasError: false, error: null });
        window.location.reload();
    };

    public render() {
        if (this.state.hasError) {
            if (this.props.fallback) {
                return this.props.fallback;
            }

            return (
                <div className="flex flex-col items-center justify-center min-h-[400px] p-8 text-center bg-white dark:bg-gray-800 rounded-lg shadow-md border border-gray-200 dark:border-gray-700">
                    <div className="p-4 bg-red-100 dark:bg-red-900/30 rounded-full mb-4">
                        <ExclamationTriangleIcon className="w-12 h-12 text-red-600 dark:text-red-400" />
                    </div>
                    <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
                        Algo salió mal
                    </h2>
                    <p className="text-gray-600 dark:text-gray-300 mb-6 max-w-md">
                        Ha ocurrido un error inesperado en este componente.
                        {this.state.error && (
                            <span className="block mt-2 text-xs font-mono bg-gray-100 dark:bg-gray-900 p-2 rounded text-left overflow-auto max-h-32">
                                {this.state.error.toString()}
                            </span>
                        )}
                    </p>
                    <div className="flex gap-4">
                        <Button onClick={() => this.setState({ hasError: false })} variant="secondary">
                            Intentar de nuevo
                        </Button>
                        <Button onClick={this.handleRetry}>
                            Recargar página
                        </Button>
                    </div>
                </div>
            );
        }

        return this.props.children;
    }
}

export default ErrorBoundary;
