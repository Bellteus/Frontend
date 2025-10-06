
export interface Turno {
  rol?: string;
  speaker?: string;
  texto?: string;
}
export interface DiarizationClean {
  callId: number; 
  turnos: Turno[];

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
