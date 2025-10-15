/* App.jsx */
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import { ToastContainer } from "react-toastify";
import Login from "./components/Login.jsx";
import ViewerDashboard from "./pages/ViewerDashboard.jsx";
import ClientDashboard from "./pages/ClientDashboard.jsx";
import AdminDashboard from "./pages/AdminDashboard.jsx";
import useTokenExpiration from "./hooks/useTokenExpiration.jsx";

function App() {
  const { modalVisible, handleKeepLoggedIn, handleLogout } = useTokenExpiration();

  return (
    <>
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

      <Router>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/viewer" element={<ViewerDashboard />} />
          <Route path="/client" element={<ClientDashboard />} />
          <Route path="/admin" element={<AdminDashboard />} />
          <Route path="*" element={<Login />} />
        </Routes>
        <ToastContainer position="top-right" autoClose={3000} />
      </Router>
    </>
  );
}

export default App;
