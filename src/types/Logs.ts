export interface ActionLog {
  _id?: string;           // si tu backend lo devuelve
  user_id: string;
  user_email: string;
  action: string;
  timestamp?: string;     // ISO-8601; el backend lo completa si no lo envías
}
export type ActionLogCreate = Omit<ActionLog, "_id">;
