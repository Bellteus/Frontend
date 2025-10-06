// src/components/RouteGuards.tsx
import React from "react";
import { Navigate } from "react-router-dom";
import { useMe } from "../hook/useMe";
export const AdminRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isAdmin, loadingMe } = useMe();
  if (loadingMe) {
    return (
      <div className="min-h-[40vh] flex items-center justify-center">
        <div className="animate-pulse text-slate-600">Cargando permisos...</div>
      </div>
    );
  }
  if (!isAdmin) return <Navigate to="/dashboard/with-analysis" replace />;
  return <>{children}</>;
};
