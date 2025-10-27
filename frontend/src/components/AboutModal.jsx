// components/AboutModal.jsx
import { motion, AnimatePresence } from "framer-motion";
import "./styles/UserManualModal.css"; // reuse unified modal styles

export default function AboutModal({ isOpen, onClose }) {
  if (!isOpen) return null;

  const handleBackdropClick = (e) => {
    if (e.target.classList.contains("manual-backdrop")) {
      onClose();
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          className="manual-backdrop"
          onClick={handleBackdropClick}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.3 }}
        >
          <motion.div
            className="manual-modal"
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
            transition={{ duration: 0.3 }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="manual-header">
              <div className="about-header-left">
                <img
                  src="/src/pmgi.png"
                  alt="PMGI Logo"
                  className="about-logo"
                />
                <div>
                  <h2>PMGI - Project Time Central</h2>
                  <span className="version-badge">v1.2.0</span>
                </div>
              </div>
            </div>

            {/* Scrollable Content */}
            <div className="manual-content">
              <section>
                <h3>🏢 About the System</h3>
                <p>
                  The <strong>PMGI - Project Time Central</strong> is a unified
                  platform designed to streamline employee attendance, DTR processing,
                  and payroll computation in one smart, centralized system.
                </p>
                <p>
                  It automates repetitive HR tasks such as DTR verification,
                  attendance tracking, and payroll summary generation — allowing HR
                  and Operations to focus on what matters most: people.
                </p>
              </section>

              <section>
                <h3>💡 Key Features</h3>
                <ul>
                  <li>📊 Automated payroll computation & real-time summaries</li>
                  <li>📄 Excel & PDF DTR parsing with cross-verification</li>
                  <li>💬 Real-time communication between employees & admins</li>
                  <li>☁️ Secure cloud file management</li>
                  <li>🔒 Role-based authentication & access control</li>
                </ul>
              </section>

              <section>
                <h3>🧠 Technology Stack</h3>
                <ul>
                  <li>⚙️ <strong>Backend:</strong> FastAPI (Python)</li>
                  <li>🖥️ <strong>Frontend:</strong> React + Vite</li>
                  <li>🗃️ <strong>Database:</strong> PostgreSQL</li>
                  <li>🎨 <strong>UI:</strong> Framer Motion + Custom CSS</li>
                </ul>
              </section>

              <section>
                <h3>🧾 System Highlights</h3>
                <p>
                  Built for scalability and security, the system supports multiple user
                  roles (Admin, HR, Employee), detailed analytics, and responsive design
                  for seamless use on both desktop and mobile devices.
                </p>
              </section>

              <section>
                <h3>📅 Version Information</h3>
                <p>
                  <strong>Version:</strong> v1.2.0<br />
                  <strong>Last Updated:</strong> October 2025
                </p>
              </section>

              <section>
                <h3>📞 Contact</h3>
                <p>
                  For assistance, feature requests, or maintenance support, contact the{" "}
                  <strong>PMGI IT Department</strong> or your designated system
                  administrator.
                </p>
              </section>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
