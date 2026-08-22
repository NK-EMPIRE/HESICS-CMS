import { db } from './index';
import { Client } from '../types';

export const getClients = (): Client[] => db.getClients();
export const getClientById = (id: string): Client | undefined => db.getClientById(id);
export const addClient = (data: Omit<Client, 'id' | 'org_id' | 'created_at' | 'updated_at'>): Client => db.addClient(data);
export const updateClient = (id: string, data: Partial<Client>): Client | undefined => db.updateClient(id, data);
export const deleteClient = (id: string): void => db.deleteClient(id);
export { db };
