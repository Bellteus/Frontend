import React, { useState } from "react";
import { loginUser } from "../services/AuthService";
import  { LoginCredentials } from "../types/AuthTypes";
import { useNavigate } from 'react-router-dom';
const LoginForm: React.FC = () => {
    const navigate = useNavigate();

  const [credentials, setCredentials] = useState<LoginCredentials>(() => ({
    email: "",
    password: ""
  }));

  const [error, setError] = useState<string | null>(null);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setCredentials(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    try {
      alert(`Enviando login para: ${credentials.email}`);
      const response = await loginUser(credentials);
      localStorage.setItem("token", response.access_token);
      alert("✅ Login exitoso");
      // Aquí podrías redirigir al usuario a otra página, por ejemplo:
      navigate("/dashboard");
    } catch (err: any) {
      setError(err.detail || "Error al iniciar sesión");
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100">
      <form
        onSubmit={handleSubmit}
        className="bg-white p-8 rounded-xl shadow-md w-full max-w-md"
      >
        <h2 className="text-2xl font-semibold text-gray-700 mb-6 text-center">Iniciar sesión</h2>

        <div className="mb-4">
          <label className="block text-gray-600 mb-1">Correo electrónico</label>
          <input
            type="email"
            name="email"
            placeholder="Ingrese su correo"
            value={credentials.email}
            onChange={handleChange}
            required
            className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-400"
          />
        </div>

        <div className="mb-4">
          <label className="block text-gray-600 mb-1">Contraseña</label>
          <input
            type="password"
            name="password"
            placeholder="Ingrese su contraseña"
            value={credentials.password}
            onChange={handleChange}
            required
            className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-400"
          />
        </div>

        {error && (
          <p className="text-red-500 text-sm mb-4 text-center">{error}</p>
        )}

        <button
          type="submit"
          className="w-full bg-blue-500 text-white py-2 rounded-lg hover:bg-blue-600 transition duration-200"
        >
          Iniciar sesión
        </button>
      </form>
    </div>
  );
};

export default LoginForm;