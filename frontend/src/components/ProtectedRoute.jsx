// components/ProtectedRoute.jsx
import { useContext } from "react";
import { Navigate } from "react-router-dom";
import { AuthContext } from "../context/AuthContext";

export default function ProtectedRoute({ children }) {
  const { currentUser, loading } = useContext(AuthContext);

  // Wait for AuthContext to finish checking token
  if (loading) return <div>Loading...</div>;

  // If no logged in user, redirect to login
  if (!currentUser) return <Navigate to="/login" />;

  // Otherwise, render the protected page
  return children;
}
