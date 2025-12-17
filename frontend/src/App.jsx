// App.jsx
import { Routes, Route } from "react-router-dom";
import { ToastContainer } from "react-toastify";
import Login from "./components/Login.jsx";
import ViewerDashboard from "./pages/ViewerDashboard.jsx";
import ClientDashboard from "./pages/ClientDashboard.jsx";
import AdminDashboard from "./pages/AdminDashboard.jsx";
import useTokenExpiration from "./hooks/useTokenExpiration.jsx";
import ProtectedRoute from "./components/ProtectedRoute.jsx";
import { AuthProvider } from "./context/AuthContext";
import useAutoRefreshToken from "./hooks/useAutoRefreshToken.jsx";
import useSessionManager from "./hooks/useSessionManager";

function App() {
  const { modalVisible, handleKeepLoggedIn, handleLogout } = useSessionManager();
  useAutoRefreshToken();

  return (
    <AuthProvider>
      {modalVisible && (
        <div className="modal-overlay">
          <div className="modal">
            <h3>Session Expiring Soon</h3>
            <p>Your session is about to expire. Do you want to stay logged in?</p>
            <button onClick={handleKeepLoggedIn}>Keep Logged In</button>
            <button onClick={handleLogout}>Log Out</button>
          </div>
        </div>
      )}

      <Routes>
        {/* Public route */}
        <Route path="/login" element={<Login />} />

        {/* Protected routes */}
        <Route
          path="/viewer"
          element={
            <ProtectedRoute>
              <ViewerDashboard />
            </ProtectedRoute>
          }
        />
        <Route
          path="/client"
          element={
            <ProtectedRoute>
              <ClientDashboard />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin"
          element={
            <ProtectedRoute>
              <AdminDashboard />
            </ProtectedRoute>
          }
        />

        {/* Default fallback */}
        <Route path="*" element={<Login />} />
      </Routes>

      <ToastContainer
        position="bottom-right"
        autoClose={10000}
        hideProgressBar={false}
        newestOnTop
        closeOnClick
        pauseOnHover
        draggable
      />
    </AuthProvider>
  );
}

export default App;