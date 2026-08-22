import { db } from "./index";
import { Activity } from "../types";

export const getActivities = (clientId?: string): Activity[] =>
  db.getActivities(clientId);
export const addActivity = (
  data: Omit<Activity, "id" | "org_id" | "created_at">,
): Activity => db.addActivity(data);
export { db };
