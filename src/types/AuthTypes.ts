export interface LoginCredentials {
    email: string;
    password: string;
  }
  
  export interface LoginResponse {
    message: string;
    access_token: string;
    token_type: string;
  }
  
  export interface ErrorResponse {
    detail: string;
  }
  
    export interface DecodedToken {
    id: string;
    email: string;
    role: string;
    is_active: boolean;
    created_at: string;
    exp: string;
  }