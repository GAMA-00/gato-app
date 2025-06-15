
import { Navigate } from "react-router-dom";

const Index = () => {
  // Simple redirect to landing page
  return <Navigate to="/landing" replace />;
};

export default Index;
