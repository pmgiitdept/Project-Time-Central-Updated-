import React, { useState } from "react";
import { Document, Page, pdfjs } from "react-pdf";
import workerSrc from "pdfjs-dist/build/pdf.worker.min.mjs?url";
import "./styles/PDFModal.css";

pdfjs.GlobalWorkerOptions.workerSrc = workerSrc;

export default function PDFViewerModal({ pdfUrl, onClose }) {
  const [numPages, setNumPages] = useState(null);

  const handleLoadSuccess = ({ numPages }) => setNumPages(numPages);

  return (
    <div className="pdf-modal-overlay">
      <div className="pdf-modal-content">
        <button className="close-btn" onClick={onClose}>
          ❌ Close
        </button>

        <div className="pdf-viewer">
          <Document
            file={pdfUrl}
            onLoadSuccess={handleLoadSuccess}
            loading="Loading PDF..."
          >
            {Array.from(new Array(numPages), (el, index) => (
              <Page
                key={`page_${index + 1}`}
                pageNumber={index + 1}
                width={800}
              />
            ))}
          </Document>
        </div>
      </div>
    </div>
  );
}
