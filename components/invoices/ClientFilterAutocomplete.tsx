import React, { useState, useEffect, useRef } from 'react';
import { Client } from '../../types';
import Input from '../ui/Input';
import { SearchIcon } from '../icons/Icons';

interface ClientFilterAutocompleteProps {
    clients: Client[];
    value: string;
    onChange: (value: string) => void;
    label: string;
    id: string;
}

const ClientFilterAutocomplete: React.FC<ClientFilterAutocompleteProps> = ({ clients, value, onChange, label, id }) => {
    const [searchTerm, setSearchTerm] = useState('');
    const [results, setResults] = useState<Client[]>([]);
    const [isFocused, setIsFocused] = useState(false);
    const wrapperRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (!value) {
            setSearchTerm('');
        } else {
            const client = clients.find(c => c.idNumber === value);
            if (client) {
                setSearchTerm(client.name);
            }
        }
    }, [value, clients]);

    useEffect(() => {
        const term = searchTerm.toLowerCase();
        if (term && isFocused) {
            const filtered = clients.filter(client =>
                client.name.toLowerCase().includes(term) ||
                client.idNumber.toLowerCase().includes(term)
            );
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
        onChange(client.idNumber);
        setSearchTerm(client.name);
        setResults([]);
        setIsFocused(false);
    };

    return (
        <div className="relative" ref={wrapperRef}>
            <Input
                label={label}
                id={id}
                value={searchTerm}
                onChange={e => {
                    setSearchTerm(e.target.value);
                    if (e.target.value === '') {
                        onChange('');
                    }
                }}
                onFocus={() => setIsFocused(true)}
                placeholder="Escriba RIF o nombre..."
            />
            
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
        </div>
    );
};

export default ClientFilterAutocomplete;
