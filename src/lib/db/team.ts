import { db } from './index';
import { User, Role } from '../types';

export const getUsers = (callerEmail?: string): User[] => db.getUsers(callerEmail);
export const getUserById = (id: string): User | undefined => db.getUserById(id);
export const getUserByEmail = (email: string): User | undefined => db.getUserByEmail(email);
export const addUser = (data: Omit<User, 'id' | 'org_id' | 'created_at'>): User => db.addUser(data);
export const updateUser = (id: string, data: Partial<User>): User | undefined => db.updateUser(id, data);
export const deactivateUser = (id: string): void => db.deactivateUser(id);
export const removeUser = (id: string): void => db.removeUser(id);

export const getRoles = (): Role[] => db.getRoles();
export const addRole = (data: Omit<Role, 'id' | 'org_id'>): Role => db.addRole(data);
export { db };
