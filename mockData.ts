
import { CompanyInfo, Role, Permissions } from './types';
import { ALL_PERMISSION_KEYS, DEFAULT_ROLE_PERMISSIONS } from './constants';

export const DUMMY_COMPANY_INFO: CompanyInfo = {
    name: 'Cooperativa Mixta Fraternidad Del Transporte',
    rif: 'J-506936488',
    address: 'Calle este 8 bis, entre las esquinas de salón y horcones, parroquia Santa Rosalía, San Agustín del Norte, Caracas',
    phone: '04147347409',
    logoUrl: `data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjQwIiBoZWlnaHQ9IjgwIiB2aWV3Qm94PSIwIDAgMjQwIDgwIiB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciPgogIDxkZWZzPgogICAgPGxpbmVhckdyYWRpZW50IGlkPSJhenVyZUxvZ29HcmFkaWVudCIgeDE9IjAlIiB5MT0iMCUiIHgyPSIxMDAlIiB5Mj0iMTAwJSI+CiAgICAgIDxzdG9wIG9mZnNldD0iMCUiIHN0eWxlPSJzdG9wLWNvbG9yOiMzYjgyZjY7IiAvPgogICAgICA8c3RvcCBvZmZzZXQ9IjEwMCUiIHN0eWxlPSJzdG9wLWNvbG9yOiMxZDBlYTg7IiAvPgogICAgPC9saW5lYXJHcmFkaWVudD4KICA8L2RlZnM+CiAgPHBhdGggZD0iTTMwIDQwIEEgMjAgMjAgMCAwIDAgNzAgNDAgTCA3MCA2MCBBIDIwIDIwIDAgMCAxIDMwIDYwIFoiIGZpbGw9InVybCgjYXp1cmVMb2dvR3JhZGllbnQpIiAvPgogIDxwYXRoIGQ9Ik01MCAyMCBBIDIwIDIwIDAgMCAxIDkwIDIwIEwgOTAgNjAgQSAyMCAyMCAwIDAgMCA1MCA2MCBaIiBmaWxsPSIjOWNjNmZjIiBvcGFjaXR5PSIwLjciIC8+CiAgPHRleHQgeD0iOTUiIHk9IjUyIiBzdHlsZT0iZm9udDogYm9sZCAyMHB4IHNhbnMtc2VyaWY7ZmlsbDojMWU0MGFmOyI+RnJhdGVybmlkYWQgVHJhbnNwb3J0ZTwvdGV4dD4KPC9zdmc+`,
    loginImageUrl: 'https://images.unsplash.com/photo-1587293852726-70cdb122c2a6?q=80&w=2070&auto=format&fit=crop',
    costPerKg: 12,
    bcvRate: 36.58,
    postalLicense: '1010-A',
};

// --- MOCK DATA IS NO LONGER USED, DATA IS FETCHED FROM API ---
// --- KEEPING ROLE/PERMISSION STRUCTURE FOR REFERENCE IF NEEDED ---

// Permissions are now imported from constants.tsx via DEFAULT_ROLE_PERMISSIONS to ensure consistency

export const BASE_ROLES: Role[] = [
    { id: 'role-admin', name: 'Administrador', permissions: DEFAULT_ROLE_PERMISSIONS['role-admin'] },
    { id: 'role-op', name: 'Operador', permissions: DEFAULT_ROLE_PERMISSIONS['role-op'] },
    { id: 'role-tech', name: 'Soporte Técnico', permissions: DEFAULT_ROLE_PERMISSIONS['role-tech'] },
    { id: 'role-assistant', name: 'Asistente', permissions: DEFAULT_ROLE_PERMISSIONS['role-assistant'] },
    { id: 'role-accountant', name: 'Contador', permissions: DEFAULT_ROLE_PERMISSIONS['role-accountant'] },
];
