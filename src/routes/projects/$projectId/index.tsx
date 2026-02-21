import { Navigate } from "react-router";

export function ProjectIndexRedirect() {
  return <Navigate to="settings" replace />;
}
