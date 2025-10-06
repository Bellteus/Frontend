import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { AuthService, LogsService } from "../services/Service"; // ⬅️ Importa LogsService

type Credentials = { email: string; password: string };

const Login: React.FC = () => {
  const navigate = useNavigate();
  const [credentials, setCredentials] = useState<Credentials>({ email: "", password: "" });
  const [error, setError] = useState<string | null>(null);
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setError(null);
    const { name, value } = e.target;
    setCredentials((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      // 1) Login (guarda el token internamente)
      await AuthService.login(credentials.email, credentials.password);

      // 2) Validar token y, si es posible, obtener id del usuario
      const me = await AuthService.me();

      // 3) Guardar el email introducido (éxito garantizado)
      const emailTrim = credentials.email.trim();
      if (emailTrim) localStorage.setItem("email", emailTrim);

      // 4) (Opcional) si /auth/me trae id, lo persistimos también
      if ((me as any)?.id != null) {
        localStorage.setItem("id", String((me as any).id));
      }

      // 5) Registrar log: {user_email} "inicio sesion"
      try {
        await LogsService.audit(`${emailTrim} inicio sesion`);
      } catch {
        // No bloquear la navegación si el log falla
        // (el backend recomendado también inyecta el email desde el token)
      }

      // 6) Redirigir
      navigate("/dashboard", { replace: true });
    } catch (err: any) {
      const status = err?.status as number | undefined;
      if (status === 400 || status === 401) setError("Correo o contraseña incorrectos.");
      else if (typeof status === "number" && status >= 500) setError("Fallo del servidor. Intenta nuevamente.");
      else setError(err?.message || "No se pudo iniciar sesión.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full bg-gradient-to-br from-indigo-50 via-white to-cyan-50 flex items-center justify-center p-6">
      <div className="relative w-full max-w-md">
        <form
          onSubmit={handleSubmit}
          className="bg-white/90 backdrop-blur rounded-2xl shadow-xl border border-slate-100 p-7 sm:p-8"
        >
          <div className="mb-6 text-center">
            <div className="mx-auto mb-3 h-12 w-12 rounded-2xl bg-indigo-100 flex items-center justify-center">
              <span className="text-indigo-600 text-xl font-bold">🔐</span>
            </div>
            <h1 className="text-2xl font-extrabold text-slate-800 tracking-tight">Iniciar sesión</h1>
            <p className="text-slate-500 mt-1 text-sm">Accede a tu panel de analítica</p>
          </div>

          <div className="mb-4">
            <label htmlFor="email" className="block text-sm font-semibold text-slate-700 mb-1.5">
              Correo electrónico
            </label>
            <input
              id="email"
              name="email"
              type="email"
              value={credentials.email}
              onChange={handleChange}
              required
              autoComplete="email"
              placeholder="tucorreo@empresa.com"
              className="w-full rounded-xl border border-slate-300 px-4 py-2.5 text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition"
              disabled={loading}
            />
          </div>

          <div className="mb-2">
            <label htmlFor="password" className="block text-sm font-semibold text-slate-700 mb-1.5">
              Contraseña
            </label>
            <div className="relative">
              <input
                id="password"
                name="password"
                type={showPass ? "text" : "password"}
                value={credentials.password}
                onChange={handleChange}
                required
                autoComplete="current-password"
                placeholder="••••••••"
                className="w-full rounded-xl border border-slate-300 px-4 py-2.5 pr-11 text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition"
                disabled={loading}
              />
              <button
                type="button"
                onClick={() => setShowPass((v) => !v)}
                className="absolute inset-y-0 right-0 px-3 text-slate-500 hover:text-slate-700 focus:outline-none"
                aria-label={showPass ? "Ocultar contraseña" : "Mostrar contraseña"}
                disabled={loading}
              >
                {showPass ? "🙈" : "👁️"}
              </button>
            </div>
          </div>

          {error && (
            <div className="mt-3 mb-1 text-sm text-red-700 bg-red-50 border border-red-200 rounded-xl px-3 py-2">
              {error}
            </div>
          )}

          <button
            type="submit"
            className="mt-5 w-full inline-flex items-center justify-center gap-2 rounded-xl bg-indigo-600 text-white font-semibold py-2.5 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition disabled:opacity-60 disabled:cursor-not-allowed"
            disabled={loading}
          >
            {loading && (
              <span className="inline-block h-4 w-4 animate-spin rounded-full border-[2px] border-white border-r-transparent" />
            )}
            {loading ? "Ingresando..." : "Ingresar"}
          </button>

          <div className="mt-4 text-center text-xs text-slate-500">
            Autenticación con <b>JWT</b> — almacenado de forma segura en el navegador
          </div>
        </form>

        <div className="pointer-events-none absolute -z-10 -top-10 -right-12 h-40 w-40 rounded-full bg-indigo-200/40 blur-3xl" />
        <div className="pointer-events-none absolute -z-10 -bottom-12 -left-12 h-40 w-40 rounded-full bg-cyan-200/40 blur-3xl" />
      </div>
    </div>
  );
};

export default Login;
