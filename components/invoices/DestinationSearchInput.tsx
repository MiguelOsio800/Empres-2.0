import React, { useState, useEffect, useRef } from 'react';
import { Office } from '../../types';
import Input from '../ui/Input';
import Modal from '../ui/Modal';
import { SearchIcon, BuildingOfficeIcon } from '../icons/Icons';

interface DestinationSearchInputProps {
    offices: Office[];
    value: string;
    onChange: (value: string) => void;
    error?: string;
}

const DestinationSearchInput: React.FC<DestinationSearchInputProps> = ({ offices, value, onChange, error }) => {
    const [searchTerm, setSearchTerm] = useState('');
    const [results, setResults] = useState<Office[]>([]);
    const [isFocused, setIsFocused] = useState(false);
    const [isSearchModalOpen, setIsSearchModalOpen] = useState(false);
    const [modalSearchTerm, setModalSearchTerm] = useState('');
    const wrapperRef = useRef<HTMLDivElement>(null);

    // Initialize search term with office name if value is an office ID
    useEffect(() => {
        const office = offices.find(o => o.id === value);
        if (office) {
            setSearchTerm(office.name);
        } else {
            setSearchTerm(value);
        }
    }, [value, offices]);

    useEffect(() => {
        const term = searchTerm.toLowerCase();
        if (term && isFocused) {
            const filtered = offices.filter(office =>
                office.name.toLowerCase().includes(term) ||
                office.code.toLowerCase().includes(term)
            );
            setResults(filtered);
        } else {
            setResults([]);
        }
    }, [searchTerm, isFocused, offices]);

    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
                setIsFocused(false);
            }
        }
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    const handleSelect = (office: Office) => {
        setSearchTerm(office.name);
        onChange(office.id);
        setIsFocused(false);
        setIsSearchModalOpen(false);
    };

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const val = e.target.value;
        setSearchTerm(val);
        onChange(val); // Store the free text as the value
        setIsFocused(true);
    };

    const modalResults = offices.filter(office =>
        office.name.toLowerCase().includes(modalSearchTerm.toLowerCase()) ||
        office.code.toLowerCase().includes(modalSearchTerm.toLowerCase())
    );

    return (
        <div className="relative" ref={wrapperRef}>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Destino
            </label>
            <div className="flex items-stretch shadow-sm rounded-md overflow-hidden border border-gray-300 dark:border-gray-600 focus-within:ring-2 focus-within:ring-primary-500 focus-within:border-primary-500 transition-all">
                <div className="relative flex-1">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <SearchIcon className="h-4 w-4 text-gray-400" />
                    </div>
                    <input
                        type="text"
                        className="block w-full pl-10 pr-3 py-2 border-none bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-gray-200 placeholder-gray-400 dark:placeholder-gray-500 sm:text-sm focus:ring-0 outline-none"
                        value={searchTerm}
                        onChange={handleInputChange}
                        onFocus={() => setIsFocused(true)}
                        placeholder="Buscar destino o escribir uno nuevo..."
                        autoComplete="off"
                    />
                </div>
                <button
                    type="button"
                    onClick={() => { setIsSearchModalOpen(true); setModalSearchTerm(''); }}
                    className="flex items-center justify-center px-3 bg-white dark:bg-gray-800 border-l border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-500 dark:text-gray-400 transition-colors group"
                    title="Búsqueda avanzada de destinos"
                >
                    <SearchIcon className="w-5 h-5 group-hover:scale-110 transition-transform" />
                </button>
            </div>
            {error && <p className="mt-1 text-xs text-red-600 dark:text-red-400">{error}</p>}

            {isFocused && results.length > 0 && (
                <div className="absolute z-10 w-full mt-1 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-md shadow-lg max-h-60 overflow-y-auto">
                    {results.map(office => (
                        <div
                            key={office.id}
                            className="px-4 py-2 hover:bg-gray-100 dark:hover:bg-gray-700 cursor-pointer flex justify-between items-center"
                            onClick={() => handleSelect(office)}
                        >
                            <div>
                                <div className="font-medium text-gray-900 dark:text-white">{office.name}</div>
                                <div className="text-sm text-gray-500 dark:text-gray-400">{office.code}</div>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            <Modal isOpen={isSearchModalOpen} onClose={() => setIsSearchModalOpen(false)} title="Buscar Destino">
                <div className="space-y-4">
                    <Input
                        label="Buscar por nombre o código"
                        value={modalSearchTerm}
                        onChange={(e) => setModalSearchTerm(e.target.value)}
                        autoFocus
                        placeholder="Ej: Anzoategui..."
                    />
                    <div className="max-h-96 overflow-y-auto border border-gray-200 dark:border-gray-700 rounded-md">
                        {modalResults.length > 0 ? (
                            <ul className="divide-y divide-gray-200 dark:divide-gray-700">
                                {modalResults.map(office => (
                                    <li 
                                        key={office.id} 
                                        className="p-4 hover:bg-gray-50 dark:hover:bg-gray-750 cursor-pointer flex items-center gap-3 transition-colors"
                                        onClick={() => handleSelect(office)}
                                    >
                                        <div className="bg-primary-100 dark:bg-primary-900/30 p-2 rounded-full text-primary-600 dark:text-primary-400">
                                            <BuildingOfficeIcon className="w-5 h-5" />
                                        </div>
                                        <div>
                                            <p className="font-medium text-gray-900 dark:text-white">{office.name}</p>
                                            <p className="text-sm text-gray-500 dark:text-gray-400">Código: {office.code}</p>
                                        </div>
                                    </li>
                                ))}
                            </ul>
                        ) : (
                            <div className="p-8 text-center text-gray-500 dark:text-gray-400">
                                No se encontraron destinos que coincidan con la búsqueda.
                            </div>
                        )}
                    </div>
                </div>
            </Modal>
        </div>
    );
};

export default DestinationSearchInput;
