// src/pages/PerfilUsuario.tsx

import React, { useEffect, useState } from "react";
import { FiUser, FiMail, FiKey } from "react-icons/fi";

const PerfilUsuario: React.FC = () => {
  const [userId, setUserId] = useState("");
  const [userEmail, setUserEmail] = useState("");

  useEffect(() => {
    setUserId(localStorage.getItem("id") || "");
    setUserEmail(localStorage.getItem("email") || "");
  }, []);


  if (!userId || !userEmail) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100">
        <div className="text-lg text-gray-600">No se encontró información del usuario.</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gray-100 px-4">
      <div className="bg-white shadow-xl rounded-2xl p-8 max-w-md w-full flex flex-col items-center">
        <div className="w-24 h-24 rounded-full bg-blue-100 flex items-center justify-center shadow mb-4">
          <FiUser size={50} className="text-blue-600" />
        </div>
        <div className="w-full mt-2 space-y-2">
          <div className="flex items-center gap-2 bg-gray-50 rounded-lg p-3">
            <FiKey size={18} className="text-blue-500" />
            <span className="font-semibold">ID:</span>
            <span>{userId}</span>
          </div>
          <div className="flex items-center gap-2 bg-gray-50 rounded-lg p-3">
            <FiMail size={18} className="text-blue-500" />
            <span className="font-semibold">Email:</span>
            <span>{userEmail}</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PerfilUsuario;
