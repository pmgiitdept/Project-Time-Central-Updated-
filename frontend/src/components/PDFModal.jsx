// PDFModal.jsx
import { useState } from "react";
import { Document, Page, pdfjs } from "react-pdf";
import "./styles/PDFModal.css";

// Point to the static file in public/
pdfjs.GlobalWorkerOptions.workerSrc = "/pdf.worker.min.js";

export default function PDFModal({ fileUrl, isOpen, onClose }) {
  const [numPages, setNumPages] = useState(null);
  const [pageNumber, setPageNumber] = useState(1);

  const onDocumentLoadSuccess = ({ numPages }) => setNumPages(numPages);

  if (!isOpen) return null;

  return (
    <div className="pdf-modal-backdrop" onClick={onClose}>
      <div className="pdf-modal-content" onClick={(e) => e.stopPropagation()}>
        <button className="pdf-modal-close" onClick={onClose}>✖</button>

        <Document file={fileUrl} onLoadSuccess={onDocumentLoadSuccess}>
          <Page pageNumber={pageNumber} />
        </Document>

        <div className="pdf-modal-controls">
          <button onClick={() => setPageNumber(p => Math.max(p-1,1))} disabled={pageNumber<=1}>Prev</button>
          <span>Page {pageNumber} / {numPages || "?"}</span>
          <button onClick={() => setPageNumber(p => Math.min(p+1, numPages || p+1))} disabled={pageNumber>=numPages}>Next</button>
        </div>
      </div>
    </div>
  );
}
