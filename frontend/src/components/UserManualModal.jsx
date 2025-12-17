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
      title: "0️⃣ About Project Time Central",
      body: (
        <>
          <p>
            <b>Project Time Central</b> is an all-in-one digital platform designed to
            streamline employee attendance tracking, DTR (Daily Time Record)
            management, and payroll reporting. It provides a centralized, automated
            workspace where HR personnel, administrators, and employees can manage
            time records efficiently and accurately.
          </p>

          <p>
            The system acts as a <span className="highlight">central hub</span> for
            all time-related data — connecting payroll reports, attendance logs,
            and employee directories in one synchronized environment. By combining
            automation and smart validation tools, it reduces manual errors and
            improves productivity across the organization.
          </p>

          <p>
            <b>Key Benefits:</b>
          </p>
          <ul>
            <li>
              🕒 <strong>Centralized Time Management</strong> — All attendance and
              payroll data are stored in one system for easy access and review.
            </li>
            <li>
              📊 <strong>Automated Data Validation</strong> — The system checks file
              formats, employee names, and cutoff dates to prevent inconsistencies.
            </li>
            <li>
              🔁 <strong>Real-Time Updates</strong> — Uploaded DTRs and payroll
              reports instantly reflect in dashboards and employee directories.
            </li>
            <li>
              💬 <strong>Integrated Communication</strong> — The built-in chat tool
              allows employees and admins to coordinate and clarify data instantly.
            </li>
            <li>
              🧾 <strong>Accurate Payroll Preparation</strong> — Generate verified,
              ready-for-export summaries for payroll processing.
            </li>
          </ul>

          <div className="tip-box">
            💡 <strong>Tip:</strong> Think of Project Time Central as your company’s
            “command center” for time and attendance. Every upload, record, or
            report flows through one unified system — ensuring accuracy, traceability,
            and collaboration.
          </div>

          <img
            src="/manual_screens/system_overview.png"
            alt="System overview"
            className="manual-img"
            onClick={() => handleImageClick("/manual_screens/system_overview.png")}
          />
        </>
      ),
    },
    {
      title: "1️⃣ Uploading Payroll Report (Excel / CSV)",
      body: (
        <>
          <p>
            Begin by navigating to the{" "}
            <span className="highlight">Upload Summary Forms</span> section on
            your dashboard. This area allows you to upload payroll data in{" "}
            <b>Excel (.xlsx)</b> or <b>CSV</b> format for processing.
          </p>
          <p>
            Click <span className="highlight-btn">Choose File</span> and select
            your desired payroll report from your computer. Once selected, press{" "}
            <span className="highlight-btn">Upload DTR</span>. The system will
            automatically read your file, parse its contents, and prepare it for
            integration into the payroll database.
          </p>
          <p>
            The uploaded file will then appear in your list of pending or
            processed summaries. You’ll also see visual progress indicators while
            the system validates data formatting and employee entries.
          </p>
          <div className="tip-box">
            💡 <strong>Tip:</strong> Use the company’s standard Excel template for
            consistent column mapping. Incorrect headers or missing fields may
            cause the upload to be flagged for manual review.
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
            To upload DTR records in PDF format, go to the{" "}
            <span className="highlight">DTR Standard</span> section. Click{" "}
            <span className="highlight-btn">Upload PDF</span> and choose the file
            you wish to process. The system’s built-in parser will automatically
            extract text data from the DTR and verify if it follows the official
            company layout.
          </p>
          <p>
            Once uploaded, each file undergoes a{" "}
            <b>validation and verification process</b>. Only verified DTRs can be
            synchronized with the Employee Directory, ensuring the accuracy of
            recorded attendance and payroll calculations.
          </p>
          <div className="warning-box">
            ⚠️ <strong>Important:</strong> Avoid uploading scanned images that are
            unclear or password-protected PDFs. The parser may not be able to
            extract text correctly, resulting in incomplete DTR data.
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
            After successfully uploading your files, you can review them under the{" "}
            <span className="highlight">Uploaded DTRs</span> panel. This section
            provides an overview of all processed and pending DTRs.
          </p>
          <ul>
            <li>
              🧾 Click <b>“View DTR”</b> to open the system-parsed data. This view
              displays each employee’s attendance records, total hours worked, and
              computed metrics.
            </li>
            <li>
              📄 Click <b>“View PDF File”</b> to open the original uploaded
              document in a built-in viewer. This lets you cross-check extracted
              data against the actual DTR layout.
            </li>
          </ul>
          <p>
            You can also use the search bar and date filters to quickly find
            specific employees or reporting periods. This feature helps when
            verifying historical data or investigating payroll discrepancies.
          </p>
          <div className="tip-box">
            🔍 <strong>Tip:</strong> Use the project filter or employee name field
            to instantly narrow down the results. Large datasets are automatically
            paginated for smoother browsing.
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
            Each DTR report provides a breakdown of an employee’s daily time
            records, summarizing key metrics such as{" "}
            <span className="highlight">total work hours</span>,{" "}
            <span className="highlight">overtime</span>,{" "}
            <span className="highlight">undertime</span>, and{" "}
            <span className="highlight">holiday pay</span>.
          </p>
          <p>
            Once a report is <b>verified</b>, its data can be automatically synced
            into the <span className="highlight">Employee Directory</span>, where
            payroll and HR modules can further process it. This ensures all
            records stay synchronized across the system.
          </p>
          <p>
            The report layout includes calculated summaries per cutoff period, and
            managers can use this information for performance tracking, payroll
            computation, or attendance analysis.
          </p>
          <div className="tip-box">
            📊 <strong>Did you know?</strong> The summary report also includes
            indicators for missing or incomplete DTRs, allowing quick corrective
            actions before payroll generation.
          </div>
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
            The built-in <span className="highlight">💬 Chat</span> feature allows
            instant communication within your organization. Accessible at the
            bottom-right corner of your dashboard, it supports{" "}
            <b>group conversations</b> and <b>private messages</b> between
            employees, HR personnel, and administrators.
          </p>
          <p>
            Each chat is automatically categorized based on department or assigned
            project, helping streamline collaboration across different teams.
            Messages are timestamped, ensuring transparent and organized
            discussions.
          </p>
          <div className="tip-box">
            🗨️ <strong>Pro Tip:</strong> You can mention a user with “@” to notify
            them directly or send attachments like screenshots for faster
            clarification during audits or report reviews.
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
