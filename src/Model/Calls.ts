export interface Calls {
  CallID: number;
  MediaFileName: string;
  FechaHoraInicio: string;
  FechaHoraFin: string;
  Duracion: string;
  ANI: number;
  DNIS: string | null;
  Extension: string | null;
  LoginIDTelefonia: string | null;
  CallDirection: string;
  RutaGrabacion: string;
  FechaEjecucionInsertGrabador: string | null;
  FechaReferenciaDatos: string | null;
  FechaEjecucionInsertAsesor: string | null;
  IdPais: number;
  Cliente: string;
  CodigoPrograma: string | null;
  Programa: string;
  CodigoServicio: number;
  NombreServicio: string;
  CodFinanciero: string | null;
  CECO: string;
  NombreArea: string;
  PBX: string | null;
  IDEmpleado: number;
}
