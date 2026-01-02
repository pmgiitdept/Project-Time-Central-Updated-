// components/Login.jsx
import { useState, useContext } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import api from "../api";
import { toast } from "react-toastify";
import { MapPin, Phone, Globe, Instagram, Facebook } from "lucide-react";
import "./styles/Login.css";
import { AuthContext } from "../context/AuthContext";

export default function Login() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const navigate = useNavigate();
  const location = useLocation();
  const { setCurrentUser } = useContext(AuthContext);

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const res = await api.post("/auth/login/", { username, password });

      // 🧠 Depending on your backend, adjust this:
      // Example response: { access, refresh, user: { username, role, ... } }

      const userData = res.data.user || {
        username: res.data.username,
        role: res.data.role,
      };

      // ✅ Store tokens
      localStorage.setItem("access_token", res.data.access);
      localStorage.setItem("refresh_token", res.data.refresh);
      localStorage.setItem("user", JSON.stringify(userData));

      // ✅ Update context state
      setCurrentUser(userData);

      toast.success(`Welcome ${userData.username}!`);

      // ✅ Navigate based on role
      const from = location.state?.from?.pathname || "/";
      if (userData.role === "admin") navigate("/admin", { replace: true });
      else if (userData.role === "client") navigate("/client", { replace: true });
      else if (userData.role === "viewer") navigate("/viewer", { replace: true });
      else navigate(from, { replace: true });
    } catch (err) {
      console.error("Login failed:", err);
      toast.error("Invalid credentials or server error.");
    }
  };


  return (
    <div className="login-container">
      {/* Navbar */}
      <nav className="login-navbar">
        <div className="navbar-left">
          <img src="/images/pmgi.png" alt="Logo" className="navbar-logo" />
          <div className="navbar-text">
            <h1>PROFESSIONAL MAINTENANCE GROUP, INC.</h1>
            <p><b>AN ISO 9001:2015 CERTIFIED COMPANY</b></p>
            <p>Certificate: PH18/818842652</p>
          </div>
        </div>
        <div className="navbar-right">
          <img src="/images/sgslogos.png" alt="Right Logo" className="navbar-logo" />
        </div>
      </nav>

      <img src="/images/ptc-logo.png" alt="App Logo" className="login-top-logo" />
      {/* Card */}
      <div className="login-card">
        <h1 className="login-title">Welcome! Please log in</h1>

        <form onSubmit={handleSubmit} className="login-form">
          {/* Username field */}
          <div className="input-group">
            <input
              type="text"
              id="username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
            />
            <label htmlFor="username">Username</label>
          </div>

          {/* Password field */}
          <div className="input-group">
            <input
              type="password"
              id="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
            <label htmlFor="password">Password</label>
          </div>

          <button type="submit">Login</button>
        </form>
      </div>

      {/* Footer */}
      <footer className="login-footer">
        <div className="footer-left">
          <p>
            <MapPin size={16} /> 2F 37 Bayani Road Build., #37 Bayani Road AFPOVAI, Fort Bonifacio, Western Bicutan, Taguig City
          </p>
          <p><Phone size={16} /> 856-3553 | 808-9424 | 808-9282</p>
          <p><Globe size={16} /> www.pmgi.com.ph</p>
        </div>
        <div className="footer-right">
          <p><Instagram size={16} /> @pmgi_ph</p>
          <p><Facebook size={16} /> Professional Maintenance Group, Inc.</p>
        </div>
      </footer>
    </div>
  );
}
