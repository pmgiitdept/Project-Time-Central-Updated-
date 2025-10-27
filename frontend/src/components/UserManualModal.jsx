import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import "./styles/UserManualModal.css";

export default function UserManualModal({ isOpen, onClose }) {
  const [zoomedImage, setZoomedImage] = useState(null);
  const [page, setPage] = useState(0);

  if (!isOpen) return null;

  const handleImageClick = (src) => setZoomedImage(src);
  const closeZoom = () => setZoomedImage(null);

  const handleBackdropClick = (e) => {
    if (e.target.classList.contains("manual-backdrop")) onClose();
  };

  const sections = [
    {
      title: "1️⃣ Uploading Payroll Report (Excel / CSV)",
      body: (
        <>
          <p>
            Go to the <span className="highlight">Upload Summary Forms</span> section.
            Beside <em>Upload Files</em>, click{" "}
            <span className="highlight-btn">Choose File</span> and select your Excel or CSV file.
            Then click <span className="highlight-btn">Upload DTR</span> to process your payroll data.
          </p>
          <div className="tip-box">
            💡 <strong>Tip:</strong> Ensure your Excel file follows the company template to avoid parsing errors.
          </div>
          <img
            src="/manual_screens/upload_excel.png"
            alt="Uploading Excel file"
            className="manual-img"
            onClick={() => handleImageClick("/manual_screens/upload_excel.png")}
          />
        </>
      ),
    },
    {
      title: "2️⃣ Uploading DTR Standard (PDF)",
      body: (
        <>
          <p>
            Under <span className="highlight">DTR Standard</span>, select your PDF and click{" "}
            <span className="highlight-btn">Upload PDF</span>. The system will automatically extract attendance data and verify its structure.
          </p>
          <div className="warning-box">
            ⚠️ <strong>Note:</strong> Only verified PDF DTRs can be synced later into the Employee Directory.
          </div>
          <img
            src="/manual_screens/upload_pdf.png"
            alt="Uploading PDF"
            className="manual-img"
            onClick={() => handleImageClick("/manual_screens/upload_pdf.png")}
          />
        </>
      ),
    },
    {
      title: "3️⃣ Viewing Uploaded DTRs",
      body: (
        <>
          <p>
            In the <span className="highlight">Uploaded DTRs</span> panel:
          </p>
          <ul>
            <li>🧾 Click <b>“View DTR”</b> to open parsed data.</li>
            <li>📄 Click <b>“View PDF File”</b> to preview the original document.</li>
          </ul>
          <div className="tip-box">
            🔍 Use filters or search to quickly locate DTRs by employee or date.
          </div>
          <img
            src="/manual_screens/view_dtr.png"
            alt="Viewing uploaded DTR"
            className="manual-img"
            onClick={() => handleImageClick("/manual_screens/view_dtr.png")}
          />
        </>
      ),
    },
    {
      title: "4️⃣ Understanding DTR Reports",
      body: (
        <>
          <p>
            Each DTR entry summarizes{" "}
            <span className="highlight">total hours</span>,{" "}
            <span className="highlight">overtime</span>,{" "}
            <span className="highlight">undertime</span>, and{" "}
            <span className="highlight">holiday pay</span> for each period.
          </p>
          <p>
            These records are synced with the Employee Directory after the file is marked as <b>Verified</b>.
          </p>
          <img
            src="/manual_screens/summary_report.png"
            alt="DTR summary report example"
            className="manual-img"
            onClick={() => handleImageClick("/manual_screens/summary_report.png")}
          />
        </>
      ),
    },
    {
      title: "💬 Chat Feature",
      body: (
        <>
          <p>
            Click the <span className="highlight">💬 Chat</span> button at
            the bottom-right to send messages to the admin or HR team.
            This supports both group and private messaging.
          </p>
          <div className="tip-box">
            🗨️ <strong>Tip:</strong> The chat automatically groups messages
            by department or project if enabled.
          </div>
          <img
            src="/manual_screens/chat_feature.png"
            alt="Chat feature example"
            className="manual-img"
            onClick={() => handleImageClick("/manual_screens/chat_feature.png")}
          />
        </>
      ),
    },
  ];

  const current = sections[page];

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          className="manual-backdrop"
          onClick={handleBackdropClick}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          <motion.div
            className="manual-modal"
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="manual-header">
              <h2>📘 Client Dashboard – User Manual</h2>
            </div>

            {/* Animated Page Transition */}
            <AnimatePresence mode="wait">
              <motion.div
                key={page}
                className="manual-page"
                initial={{ opacity: 0, x: 50 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -50 }}
                transition={{ duration: 0.3 }}
              >
                <h3>{current.title}</h3>
                {current.body}
              </motion.div>
            </AnimatePresence>

            {/* Pagination Controls */}
            <div className="manual-pagination">
              <button
                className="nav-btn"
                disabled={page === 0}
                onClick={() => setPage((p) => p - 1)}
              >
                ◀ Previous
              </button>

              <span className="page-indicator">
                Step {page + 1} of {sections.length}
              </span>

              <button
                className="nav-btn"
                disabled={page === sections.length - 1}
                onClick={() => setPage((p) => p + 1)}
              >
                Next ▶
              </button>
            </div>
          </motion.div>

          {/* Lightbox Image Zoom */}
          <AnimatePresence>
            {zoomedImage && (
              <motion.div
                className="zoom-overlay"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={closeZoom}
              >
                <motion.img
                  src={zoomedImage}
                  alt="Zoomed preview"
                  initial={{ scale: 0.8 }}
                  animate={{ scale: 1 }}
                  exit={{ scale: 0.8 }}
                  transition={{ duration: 0.3 }}
                  className="zoomed-img"
                />
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
