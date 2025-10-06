import React, { useEffect, useMemo, useState } from "react";
import { FiMail, FiShield, FiGlobe, FiBriefcase, FiCheck } from "react-icons/fi";
import { AuthService } from "../services/Service";
import type { UserOut } from "../types/User";

/* ======================== Estilos consistentes ======================== */
const CLASSES = {
  chip: "inline-flex items-center gap-1 text-xs px-2 py-1 rounded-full border bg-white",
};

/* ======================== Utils ======================== */
const initials = (s?: string) => {
  if (!s) return "U";
  const parts = s.trim().split(/[.\-_@\s]+/).filter(Boolean);
  const two = (parts[0]?.[0] || "") + (parts[1]?.[0] || "");
  return (two || parts[0]?.slice(0, 2) || "U").toUpperCase();
};

const guessNameFromEmail = (email?: string) =>
  email ? email.split("@")[0].replace(/[._-]/g, " ").replace(/\s+/g, " ").trim() : "";

/* ======================== Componente ======================== */
const PerfilUsuario: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<UserOut | null>(null);
  const [error, setError] = useState<string>("");

  // Fallbacks locales si el /auth/me falla
  const lsId = localStorage.getItem("id") || "";
  const lsEmail = localStorage.getItem("email") || "";

  useEffect(() => {
    let mounted = true;
    (async () => {
      setLoading(true);
      setError("");
      try {
        const me = await AuthService.me();
        if (!mounted) return;
        setProfile(me ?? null);
      } catch (e: any) {
        setProfile(null);
        setError(e?.message || "No se pudo cargar el perfil.");
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => {
      mounted = false;
    };
  }, []);

  // Datos con tolerancia a distintos esquemas
  const userEmail = profile?.email || lsEmail || "";
  const userId =
    String(
      (profile as any)?.id ??
      (profile as any)?._id ??
      lsId ??
      ""
    );

  const displayName =
    (profile as any)?.full_name ||
    (profile as any)?.name ||
    guessNameFromEmail(userEmail) ||
    "Usuario";

  const organization =
    (profile as any)?.organization ||
    (profile as any)?.org ||
    "—";

  const isActive: boolean | null =
    typeof (profile as any)?.is_active === "boolean" ? (profile as any)?.is_active : null;

  const roles: string[] = useMemo(() => {
    const raw = (profile as any)?.roles ?? (profile as any)?.scopes ?? [];
    if (Array.isArray(raw)) return raw.map(String);
    if (typeof raw === "string") return raw.split(/[,\s]+/).filter(Boolean);
    return [];
  }, [profile]);

  const directPerms: string[] = useMemo(() => {
    const raw = (profile as any)?.direct_permissions ?? [];
    if (Array.isArray(raw)) return raw.map(String);
    return [];
  }, [profile]);

  const countryScope: string[] = useMemo(() => {
    const raw = (profile as any)?.country_scope ?? [];
    if (Array.isArray(raw)) return raw.map(String);
    if (typeof raw === "string") return raw.split(/[,\s]+/).filter(Boolean);
    return [];
  }, [profile]);

  // Estado sin credenciales mínimas
  if (!loading && !userEmail && !userId) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 px-4">
        <div className="bg-white border border-slate-200 rounded-2xl p-6 max-w-md w-full text-center">
          <h2 className="text-lg font-semibold text-slate-900 mb-1">Sin información de usuario</h2>
          <p className="text-slate-600">Inicia sesión nuevamente para continuar.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen p-4">
      <div className="max-w-4xl mx-auto space-y-4">
        {/* Header */}
        <div className="bg-white rounded-2xl shadow border border-slate-200 p-5">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-2xl bg-indigo-100 text-indigo-700 flex items-center justify-center text-xl font-bold">
              {initials(displayName || userEmail)}
            </div>
            <div className="flex-1">
              <h1 className="text-xl md:text-2xl font-bold text-slate-900">{displayName}</h1>
              <div className="mt-1 flex flex-wrap items-center gap-3 text-sm">
                <span className="inline-flex items-center gap-2 text-slate-700">
                  <FiMail className="text-indigo-600" />
                  <span>{userEmail || "—"}</span>
                </span>
                {userId && (
                  <span className="text-xs px-2 py-1 rounded-full border border-slate-300 bg-slate-50 text-slate-700">
                    ID: {userId}
                  </span>
                )}
                {isActive !== null && (
                  <span className="text-xs px-2 py-1 rounded-full border border-emerald-300 bg-emerald-50 text-emerald-700 inline-flex items-center gap-1">
                    <FiCheck /> {isActive ? "Activo" : "Inactivo"}
                  </span>
                )}
              </div>
            </div>
          </div>

          {error && (
            <div className="mt-3 text-sm text-rose-700 bg-rose-50 border border-rose-200 rounded-lg px-3 py-2">
              {error}
            </div>
          )}
        </div>

        {/* Grid de info */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Organización */}
          <div className="bg-white rounded-2xl shadow border border-slate-200 p-4">
            <div className="flex items-center gap-2 mb-3">
              <div className="p-2 rounded-lg bg-indigo-50 text-indigo-700">
                <FiBriefcase />
              </div>
              <h2 className="font-semibold text-slate-900">Organización</h2>
            </div>
            <div className="text-sm text-slate-800">{organization || "—"}</div>
          </div>

          {/* Roles */}
          <div className="bg-white rounded-2xl shadow border border-slate-200 p-4">
            <div className="flex items-center gap-2 mb-3">
              <div className="p-2 rounded-lg bg-indigo-50 text-indigo-700">
                <FiShield />
              </div>
              <h2 className="font-semibold text-slate-900">Roles</h2>
            </div>
            {loading ? (
              <div className="h-8 flex items-center text-slate-500">Cargando…</div>
            ) : roles.length ? (
              <div className="flex flex-wrap gap-2">
                {roles.map((r) => (
                  <span key={r} className={`${CLASSES.chip} border-slate-300 text-slate-800`}>
                    {r}
                  </span>
                ))}
              </div>
            ) : (
              <div className="text-sm text-slate-600">Sin roles asignados.</div>
            )}
          </div>

          {/* Alcance por país */}
          <div className="bg-white rounded-2xl shadow border border-slate-200 p-4">
            <div className="flex items-center gap-2 mb-3">
              <div className="p-2 rounded-lg bg-indigo-50 text-indigo-700">
                <FiGlobe />
              </div>
              <h2 className="font-semibold text-slate-900">Alcance por país</h2>
            </div>
            {loading ? (
              <div className="h-8 flex items-center text-slate-500">Cargando…</div>
            ) : countryScope.length ? (
              <div className="flex flex-wrap gap-2">
                {countryScope.map((c) => (
                  <span key={c} className={`${CLASSES.chip} border-indigo-300 text-slate-900`}>
                    {c}
                  </span>
                ))}
              </div>
            ) : (
              <div className="text-sm text-slate-600">Sin restricciones por país.</div>
            )}
          </div>
        </div>

        {/* Permisos directos (si existen) */}
        <div className="bg-white rounded-2xl shadow border border-slate-200 p-4">
          <div className="flex items-center gap-2 mb-3">
            <div className="p-2 rounded-lg bg-indigo-50 text-indigo-700">
              <FiShield />
            </div>
            <h2 className="font-semibold text-slate-900">Permisos directos</h2>
          </div>
          {loading ? (
            <div className="h-8 flex items-center text-slate-500">Cargando…</div>
          ) : directPerms.length ? (
            <div className="flex flex-wrap gap-2">
              {directPerms.map((p) => (
                <span key={p} className={`${CLASSES.chip} border-sky-300 text-slate-900`}>
                  {p}
                </span>
              ))}
            </div>
          ) : (
            <div className="text-sm text-slate-600">No hay permisos directos asignados.</div>
          )}
        </div>
      </div>
    </div>
  );
};

export default PerfilUsuario;
