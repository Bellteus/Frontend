import { useEffect } from "react";
import { useNavigate } from "react-router-dom";

interface Props {
  children: React.ReactNode;
}

const PrivateRoute: React.FC<Props> = ({ children }) => {
  const navigate = useNavigate();

  useEffect(() => {
    const userId = localStorage.getItem("id");
    if (!userId) {
      navigate("/login", { replace: true });
    }
  }, [navigate]);

  return <>{children}</>;
};

export default PrivateRoute;
