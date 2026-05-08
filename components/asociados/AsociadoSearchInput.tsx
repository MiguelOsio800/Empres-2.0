
import React, { useState, useEffect, useRef } from 'react';
import { Asociado } from '../../types';
import Input from '../ui/Input';
import Modal from '../ui/Modal';
import { SearchIcon, UserIcon } from '../icons/Icons';

interface AsociadoSearchInputProps {
    asociados: Asociado[];
    onAsociadoSelect: (asociado: Asociado) => void;
    value: string;
    label?: string;
    placeholder?: string;
    error?: string;
}

const AsociadoSearchInput: React.FC<AsociadoSearchInputProps> = ({ 
    asociados, 
    onAsociadoSelect, 
    value, 
    label = "Seleccionar Asociado", 
    placeholder = "Busque por nombre o código...",
    error 
}) => {
    const [searchTerm, setSearchTerm] = useState('');
    const [results, setResults] = useState<Asociado[]>([]);
    const [isFocused, setIsFocused] = useState(false);
    const [isSearchModalOpen, setIsSearchModalOpen] = useState(false);
    const [modalSearchTerm, setModalSearchTerm] = useState('');
    const wrapperRef = useRef<HTMLDivElement>(null);

    const selectedAsociado = asociados.find(a => String(a.id) === String(value));

    useEffect(() => {
        if (selectedAsociado) {
            setSearchTerm(selectedAsociado.nombre);
        } else {
            setSearchTerm('');
        }
    }, [selectedAsociado]);

    useEffect(() => {
        const term = searchTerm.toLowerCase();
        if (term && isFocused) {
            const filtered = asociados.filter(a =>
                a.nombre.toLowerCase().includes(term) ||
                a.codigo.toLowerCase().includes(term) ||
                (a.cedula && a.cedula.toLowerCase().includes(term))
            );

            filtered.sort((a, b) => {
                const aName = a.nombre.toLowerCase();
                const bName = b.nombre.toLowerCase();
                const aStartsWith = aName.startsWith(term) || a.codigo.toLowerCase().startsWith(term);
                const bStartsWith = bName.startsWith(term) || b.codigo.toLowerCase().startsWith(term);
                if (aStartsWith && !bStartsWith) return -1;
                if (!aStartsWith && bStartsWith) return 1;
                return aName.localeCompare(bName);
            });

            setResults(filtered.slice(0, 8));
        } else {
            setResults([]);
        }
    }, [searchTerm, asociados, isFocused]);
    
    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
                setIsFocused(false);
            }
        }
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, [wrapperRef]);

    const handleSelect = (asociado: Asociado) => {
        onAsociadoSelect(asociado);
        setSearchTerm(asociado.nombre);
        setResults([]);
        setIsFocused(false);
        setIsSearchModalOpen(false);
    };

    const filteredModalAsociados = asociados.filter(a => 
        a.nombre.toLowerCase().includes(modalSearchTerm.toLowerCase()) ||
        a.codigo.toLowerCase().includes(modalSearchTerm.toLowerCase()) ||
        (a.cedula && a.cedula.toLowerCase().includes(modalSearchTerm.toLowerCase()))
    );

    return (
        <div className="relative" ref={wrapperRef}>
            {label && (
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    {label}
                </label>
            )}
            <div className="flex items-stretch shadow-sm rounded-md overflow-hidden border border-gray-300 dark:border-gray-600 focus-within:ring-2 focus-within:ring-primary-500 focus-within:border-primary-500 transition-all">
                <div className="relative flex-1">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <SearchIcon className="h-4 w-4 text-gray-400" />
                    </div>
                    <input
                        type="text"
                        className="block w-full pl-10 pr-3 py-2 border-none bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-gray-200 placeholder-gray-400 dark:placeholder-gray-500 sm:text-sm focus:ring-0 outline-none"
                        value={searchTerm}
                        onChange={e => {
                            setSearchTerm(e.target.value);
                        }}
                        onFocus={() => setIsFocused(true)}
                        placeholder={placeholder}
                        autoComplete="off"
                    />
                </div>
                <button
                    type="button"
                    onClick={() => setIsSearchModalOpen(true)}
                    className="flex items-center justify-center px-3 bg-white dark:bg-gray-800 border-l border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-500 dark:text-gray-400 transition-colors group"
                    title="Búsqueda avanzada de asociados"
                >
                    <SearchIcon className="w-5 h-5 group-hover:scale-110 transition-transform" />
                </button>
            </div>
            {error && <p className="mt-1 text-xs text-red-600 dark:text-red-400">{error}</p>}

            {/* Resultados rápidos (Dropdown) */}
            {isFocused && results.length > 0 && (
                <ul className="absolute z-10 w-full bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md mt-1 max-h-60 overflow-auto shadow-lg">
                    {results.map(asociado => (
                        <li
                            key={asociado.id}
                            className="px-4 py-2 cursor-pointer hover:bg-primary-500 hover:text-white dark:hover:bg-primary-600 border-b border-gray-100 dark:border-gray-600 last:border-0"
                            onClick={() => handleSelect(asociado)}
                        >
                            <p className="font-semibold text-sm">{asociado.nombre}</p>
                            <p className="text-xs opacity-70">{asociado.codigo} {asociado.cedula ? `| ${asociado.cedula}` : ''}</p>
                        </li>
                    ))}
                </ul>
            )}

            {/* Modal de Búsqueda Avanzada */}
            <Modal
                isOpen={isSearchModalOpen}
                onClose={() => setIsSearchModalOpen(false)}
                title="Seleccionar Asociado"
                size="lg"
            >
                <div className="space-y-4">
                    <Input
                        label="Filtrar por nombre, código o cédula"
                        value={modalSearchTerm}
                        onChange={e => setModalSearchTerm(e.target.value)}
                        icon={<SearchIcon className="w-4 h-4 text-gray-400" />}
                        placeholder="Ej: Juan Perez o A-001..."
                        autoFocus
                    />
                    
                    <div className="max-h-[400px] overflow-y-auto border dark:border-gray-700 rounded-lg divide-y dark:divide-gray-700">
                        {filteredModalAsociados.length > 0 ? filteredModalAsociados.map(asociado => (
                            <button
                                key={asociado.id}
                                type="button"
                                onClick={() => handleSelect(asociado)}
                                className="w-full text-left p-3 hover:bg-primary-50 dark:hover:bg-primary-900/20 transition-colors flex items-center justify-between group"
                            >
                                <div className="flex items-center gap-3">
                                    <div className="p-2 bg-gray-100 dark:bg-gray-700 rounded-full group-hover:bg-primary-100 dark:group-hover:bg-primary-800 transition-colors">
                                        <UserIcon className="w-4 h-4" />
                                    </div>
                                    <div>
                                        <p className="font-bold text-gray-900 dark:text-white">{asociado.nombre}</p>
                                        <p className="text-xs text-gray-500 font-mono">{asociado.codigo} {asociado.cedula ? `| ${asociado.cedula}` : ''}</p>
                                    </div>
                                </div>
                                <div className="text-right">
                                    <p className="text-xs text-gray-400">{asociado.telefono}</p>
                                    <span className="text-[10px] bg-gray-200 dark:bg-gray-700 px-2 py-0.5 rounded uppercase font-bold text-gray-600 dark:text-gray-400">Seleccionar</span>
                                </div>
                            </button>
                        )) : (
                            <div className="p-8 text-center text-gray-500">
                                No se encontraron asociados con esos datos.
                            </div>
                        )}
                    </div>
                </div>
            </Modal>
        </div>
    );
};

export default AsociadoSearchInput;
