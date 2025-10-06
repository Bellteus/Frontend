export interface CallRecord {
  id_llamada: number;
  ani?: string;
  dnis?: string;
  calltype?: string;
  starttime?: string;  // datetime → string ISO (ej: "2025-10-05T13:45:00Z")
  endtime?: string;
  duration?: number;
  empleado_nombre?: string;
  organization?: string;
}

// src/models/CallRecord.ts

export interface CallRecord2 {
  id_llamada: number;
  ani?: string;
  dnis?: string;
  calltype?: string;
  starttime?: string;          // datetime → ISO string (ej: "2025-10-05T13:45:00Z")
  endtime?: string;            // idem
  duration?: number;
  empleado_nombre?: string;
  organization?: string;
  organization_id?: number;
  extension?: number;
  pbx_login_id?: number;
  agent_id?: number;
  agent_name?: string;
  wrapup_time?: number;
  total_hold_time?: number;
  number_of_holds?: number;
  pais?: string;
}
