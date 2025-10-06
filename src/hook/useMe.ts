import { useEffect, useState } from "react";
import type { UserOut } from "../types/User";
import { AuthService } from "../services/Service";
export function useMe() {
  const [me, setMe] = useState<UserOut | null>(null);
  const [loadingMe, setLoadingMe] = useState(true);
  const [errorMe, setErrorMe] = useState<string | null>(null);

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) {
      setLoadingMe(false);
      return;
    }
    let alive = true;
    AuthService.me()
      .then((user) => {
        if (alive) setMe(user);
      })
      .catch((e: any) => {
        if (alive) setErrorMe(e?.message || "No se pudo obtener el usuario");
      })
      .finally(() => {
        if (alive) setLoadingMe(false);
      });
    return () => {
      alive = false;
    };
  }, []);

  const isAdmin =
    !!me &&
    (Array.isArray(me.country_scope) && me.country_scope.includes("*") ||
      (Array.isArray(me.roles) && me.roles.some((r) => r.toLowerCase() === "admin")));

  return { me, isAdmin, loadingMe, errorMe };
}
