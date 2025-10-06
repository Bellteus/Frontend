// ==================== Permission Type ====================
export type Permission =
  | "calls.read"
  | "calls.write"
  | "calls.kpi"
  | "calls.transcriptions"
  | "users.read"
  | "users.write"
  | "roles.read"
  | "roles.write";

// ==================== Role Models ====================
export interface RoleBase {
  name: string;
  description?: string;
  permissions: Permission[];
}

export interface RoleOut extends RoleBase {
  id: string;
}

// ==================== User Models ====================
export interface UserBase {
  email: string;
  full_name?: string;
  organization?: string;
  is_active: boolean;
  roles: string[];
  direct_permissions: Permission[];
  country_scope: string[]; // Ej: ["PE"] o ["*"]
}

export interface UserCreate extends UserBase {
  password: string;
}

export interface UserUpdate {
  full_name?: string;
  organization?: string;
  is_active?: boolean;
  roles?: string[];
  direct_permissions?: Permission[];
  password?: string;
  country_scope?: string[];
}

export interface UserOut extends UserBase {
  id: string;
  effective_permissions: Permission[];
}
