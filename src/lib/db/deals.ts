import { db } from "./index";
import { Deal } from "../types";

export const getDeals = (): Deal[] => db.getDeals();
export const addDeal = (
  data: Omit<Deal, "id" | "org_id" | "created_at" | "updated_at">,
): Deal => db.addDeal(data);
export const updateDeal = (id: string, data: Partial<Deal>): Deal | undefined =>
  db.updateDeal(id, data);
export const deleteDeal = (id: string): void => db.deleteDeal(id);
export { db };
