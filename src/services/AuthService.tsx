// src/service/auth.ts
import axios from "axios";
import { UserCreate, UserOut, UserUpdate } from "../types/User";
const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:8000/";

export const api = axios.create({
  baseURL: API_BASE,
  headers: { "Content-Type": "application/json" },
  withCredentials: false, // importante para cookie http-only
});

export const AuthService = {
  register: async (data: UserCreate) => {
    const { data: user } = await api.post<UserOut>("/auth/register", data);
    return user;
  },

  // FastAPI OAuth2PasswordRequestForm → x-www-form-urlencoded
  login: async (username: string, password: string) => {
    const body = new URLSearchParams();
    body.append("username", username);
    body.append("password", password);
    const { data } = await api.post("/auth/login", body, {
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
    });
    return data; // el backend setea la cookie
  },

  // si existe en backend; si no, puedes omitir llamarlo
  logout: async () => {
    try { await api.post("/auth/logout"); } catch { /* opcional */ }
  },

  me: async () => {
    const { data } = await api.get<UserOut>("/auth/me");
    return data;
  },

  // opcional: si usas admin UI
  listUsers: async (skip = 0, limit = 50) => {
    const { data } = await api.get<UserOut[]>("/auth/users", { params: { skip, limit } });
    return data;
  },

  updateUser: async (userId: string, payload: UserUpdate) => {
    const { data } = await api.patch<UserOut>(`/auth/users/${userId}`, payload);
    return data;
  },
};

export default AuthService;
