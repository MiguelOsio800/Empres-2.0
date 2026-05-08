
import React, { useState, useEffect, useRef } from 'react';
import { Client, ShippingGuide } from '../../types';
import Input from '../ui/Input';
import Modal from '../ui/Modal';
import { SearchIcon, UserIcon, BuildingOfficeIcon } from '../icons/Icons';

interface ClientSearchInputProps {
    clients: Client[];
    onClientSelect: (client: Client) => void;
    party: 'sender' | 'receiver';
    guide: ShippingGuide;
    onClientChange: (party: 'sender' | 'receiver', field: keyof Client, value: string) => void;
    error?: string;
}

const ClientSearchInput: React.FC<ClientSearchInputProps> = ({ clients, onClientSelect, party, guide, onClientChange, error }) => {
    const [searchTerm, setSearchTerm] = useState('');
    const [results, setResults] = useState<Client[]>([]);
    const [isFocused, setIsFocused] = useState(false);
    const [isSearchModalOpen, setIsSearchModalOpen] = useState(false);
    const [modalSearchTerm, setModalSearchTerm] = useState('');
    const wrapperRef = useRef<HTMLDivElement>(null);

    const partyData = guide[party];

    useEffect(() => {
        setSearchTerm(partyData?.idNumber || '');
    }, [partyData?.idNumber]);

    useEffect(() => {
        const term = searchTerm.toLowerCase();
        if (term && isFocused) {
            const filtered = clients.filter(client =>
                client.name.toLowerCase().includes(term) ||
                client.idNumber.toLowerCase().includes(term) ||
                (client.email && client.email.toLowerCase().includes(term))
            );

            filtered.sort((a, b) => {
                const aName = a.name.toLowerCase();
                const bName = b.name.toLowerCase();
                const aId = a.idNumber.toLowerCase();
                const bId = b.idNumber.toLowerCase();
                const aStartsWith = aName.startsWith(term) || aId.startsWith(term);
                const bStartsWith = bName.startsWith(term) || bId.startsWith(term);
                if (aStartsWith && !bStartsWith) return -1;
                if (!aStartsWith && bStartsWith) return 1;
                return aName.localeCompare(bName);
            });

            setResults(filtered.slice(0, 8));
        } else {
            setResults([]);
        }
    }, [searchTerm, clients, isFocused]);
    
    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
                setIsFocused(false);
            }
        }
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, [wrapperRef]);

    const handleSelect = (client: Client) => {
        onClientSelect(client);
        setSearchTerm(client.idNumber);
        setResults([]);
        setIsFocused(false);
        setIsSearchModalOpen(false);
    };

    const filteredModalClients = clients.filter(c => 
        c.name.toLowerCase().includes(modalSearchTerm.toLowerCase()) ||
        c.idNumber.toLowerCase().includes(modalSearchTerm.toLowerCase())
    );

    const idLabel = partyData?.clientType === 'empresa' ? 'RIF' : 'C.I.';

    return (
        <div className="relative" ref={wrapperRef}>
            <div className="flex items-end gap-2">
                <div className="flex-1">
                    <Input
                        label={`Buscar ${party === 'sender' ? 'Remitente' : 'Destinatario'} (${idLabel})`}
                        value={searchTerm}
                        onChange={e => {
                            setSearchTerm(e.target.value);
                            onClientChange(party, 'idNumber', e.target.value);
                        }}
                        onFocus={() => setIsFocused(true)}
                        error={error}
                        placeholder="Escriba RIF o nombre..."
                    />
                </div>
                <button
                    type="button"
                    onClick={() => setIsSearchModalOpen(true)}
                    className="mb-[2px] p-2.5 bg-gray-100 dark:bg-gray-700 hover:bg-primary-500 hover:text-white text-gray-500 dark:text-gray-400 rounded-md border border-gray-300 dark:border-gray-600 transition-all shadow-sm group"
                    title="Búsqueda avanzada de clientes"
                >
                    <SearchIcon className="w-5 h-5" />
                </button>
            </div>

            {/* Resultados rápidos (Dropdown) */}
            {isFocused && results.length > 0 && (
                <ul className="absolute z-10 w-full bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md mt-1 max-h-60 overflow-auto shadow-lg">
                    {results.map(client => (
                        <li
                            key={client.id}
                            className="px-4 py-2 cursor-pointer hover:bg-primary-500 hover:text-white dark:hover:bg-primary-600 border-b border-gray-100 dark:border-gray-600 last:border-0"
                            onClick={() => handleSelect(client)}
                        >
                            <p className="font-semibold text-sm">{client.name}</p>
                            <p className="text-xs opacity-70">{client.idNumber}</p>
                        </li>
                    ))}
                </ul>
            )}

            {/* Modal de Búsqueda Avanzada */}
            <Modal
                isOpen={isSearchModalOpen}
                onClose={() => setIsSearchModalOpen(false)}
                title={`Seleccionar ${party === 'sender' ? 'Remitente' : 'Destinatario'}`}
                size="lg"
            >
                <div className="space-y-4">
                    <Input
                        label="Filtrar por nombre o identificación"
                        value={modalSearchTerm}
                        onChange={e => setModalSearchTerm(e.target.value)}
                        icon={<SearchIcon className="w-4 h-4 text-gray-400" />}
                        placeholder="Ej: Juan Perez o J-123456..."
                        autoFocus
                    />
                    
                    <div className="max-h-[400px] overflow-y-auto border dark:border-gray-700 rounded-lg divide-y dark:divide-gray-700">
                        {filteredModalClients.length > 0 ? filteredModalClients.map(client => (
                            <button
                                key={client.id}
                                type="button"
                                onClick={() => handleSelect(client)}
                                className="w-full text-left p-3 hover:bg-primary-50 dark:hover:bg-primary-900/20 transition-colors flex items-center justify-between group"
                            >
                                <div className="flex items-center gap-3">
                                    <div className="p-2 bg-gray-100 dark:bg-gray-700 rounded-full group-hover:bg-primary-100 dark:group-hover:bg-primary-800 transition-colors">
                                        {client.clientType === 'empresa' ? <BuildingOfficeIcon className="w-4 h-4" /> : <UserIcon className="w-4 h-4" />}
                                    </div>
                                    <div>
                                        <p className="font-bold text-gray-900 dark:text-white">{client.name}</p>
                                        <p className="text-xs text-gray-500 font-mono">{client.idNumber}</p>
                                    </div>
                                </div>
                                <div className="text-right">
                                    <p className="text-xs text-gray-400">{client.phone}</p>
                                    <span className="text-[10px] bg-gray-200 dark:bg-gray-700 px-2 py-0.5 rounded uppercase font-bold text-gray-600 dark:text-gray-400">Seleccionar</span>
                                </div>
                            </button>
                        )) : (
                            <div className="p-8 text-center text-gray-500">
                                No se encontraron clientes con esos datos.
                            </div>
                        )}
                    </div>
                </div>
            </Modal>
        </div>
    );
};

export default ClientSearchInput;
