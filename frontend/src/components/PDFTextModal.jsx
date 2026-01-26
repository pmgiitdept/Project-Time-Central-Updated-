import React, { useState } from "react";
import api from "../api";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable"; 
import * as pdfjsLib from "pdfjs-dist/build/pdf";
import "pdfjs-dist/build/pdf.worker.entry"; // important!
import "./styles/PDFModal.css";

export default function PDFTextModal({ pdfData, currentUser }) {
  const [currentPage, setCurrentPage] = useState(1);
  const [editableData, setEditableData] = useState(pdfData?.parsed_pages || {});
  const [changes, setChanges] = useState({});
  const isAdmin = currentUser?.role === "admin";
  const [viewMode, setViewMode] = useState("parsed");

  if (!pdfData) return null;

  const totalPages = Object.keys(editableData || {}).length;
  const pageData = editableData[String(currentPage)];

  const goNext = () =>
    currentPage < totalPages && setCurrentPage(currentPage + 1);
  const goPrev = () =>
    currentPage > 1 && setCurrentPage(currentPage - 1);

  const getFullPDFUrl = (pdfUrl) => {
    return pdfUrl.startsWith("http")
      ? pdfUrl
      : `${import.meta.env.VITE_API_URL || "http://localhost:8000"}${pdfUrl}`;
  };

  // --- Load PDF text when viewMode === "pdf" ---
  useEffect(() => {
    if (viewMode !== "pdf") return;

    const fetchPDFText = async () => {
      const url = getFullPDFUrl(pdfData.file);

      try {
        const loadingTask = pdfjsLib.getDocument(url);
        const pdf = await loadingTask.promise;
        const pagesText = [];

        for (let i = 1; i <= pdf.numPages; i++) {
          const page = await pdf.getPage(i);
          const textContent = await page.getTextContent();
          const pageText = textContent.items.map((item) => item.str).join(" ");
          pagesText.push(pageText);
        }

        setPdfPagesText(pagesText);
      } catch (err) {
        console.error("Error loading PDF:", err);
        setPdfPagesText(["Failed to load PDF content."]);
      }
    };

    fetchPDFText();
  }, [viewMode, pdfData]);

  // Handle editing a single cell (admin only)
  const handleEditCell = (tableIdx, rowIdx, colIdx, newValue) => {
    if (!isAdmin) return;

    setEditableData((prev) => {
      const updated = { ...prev };
      const pageKey = String(currentPage);
      const tables = [...(updated[pageKey].tables || [])];
      const table = tables[tableIdx].map((r) => [...r]);

      // Save old value safely
      const oldValue =
        typeof table[rowIdx][colIdx] === "object"
          ? table[rowIdx][colIdx]?.text || ""
          : table[rowIdx][colIdx] || "";

      // Save updated value
      table[rowIdx][colIdx] =
        typeof table[rowIdx][colIdx] === "object"
          ? { ...table[rowIdx][colIdx], text: newValue }
          : newValue;

      tables[tableIdx] = table;
      updated[pageKey] = { ...updated[pageKey], tables };
      return updated;
    });

    // Track changes for backend
    setChanges((prev) => {
      const pageKey = String(currentPage);
      const pageChanges = prev[pageKey] || [];

      const oldValue =
        pageData?.tables?.[tableIdx]?.[rowIdx]?.[colIdx]?.text ||
        pageData?.tables?.[tableIdx]?.[rowIdx]?.[colIdx] ||
        "";

      const existing = pageChanges.find((c) => c.old_text === oldValue);

      const newChange = { old_text: oldValue, new_text: newValue || "" };
      const updatedPageChanges = existing
        ? pageChanges.map((c) =>
            c.old_text === oldValue ? newChange : c
          )
        : [...pageChanges, newChange];

      return { ...prev, [pageKey]: updatedPageChanges };
    });
  };

  // Save changes to backend
  const handleSave = async () => {
    if (!isAdmin) return alert("Only admins can save changes.");

    const payload = { parsed_pages: editableData };
    Object.entries(changes).forEach(([pageNum, pageChanges]) => {
      if (!payload.parsed_pages[pageNum]) payload.parsed_pages[pageNum] = {};
      payload.parsed_pages[pageNum].changes = pageChanges;
    });

    try {
      await api.put(`/files/pdfs/${pdfData.id}/update-parsed/`, payload);
      alert("✅ Changes saved successfully!");
    } catch (err) {
      console.error("❌ Save failed:", err);
      alert("Error saving data. Check console for details.");
    }
  };

  const handleExportPDF = () => {
    const doc = new jsPDF();
    const projectName = pdfData.uploaded_by_name || "Unknown Project";
    const pageWidth = doc.internal.pageSize.getWidth();
    const leftMargin = 14;
    const rightMargin = 14;

    Object.keys(editableData).forEach((pageNum, pageIndex) => {
      const page = editableData[pageNum];

      // --- Left side: Project + Address ---
      doc.setFontSize(12);
      doc.setFont("helvetica", "bold");
      doc.text(`PROJECT: ${projectName}`, leftMargin, 20);

      doc.setFontSize(10);
      doc.setFont("helvetica", "normal");
      const addressLines = [
        "METRO MANILA",
        "MANILA",
        "Philippines",
        "8564018"
      ];
      addressLines.forEach((line, i) => {
        doc.text(line, leftMargin, 20 + 6 + i * 5);
      });

      const leftBlockHeight = 6 + addressLines.length * 5; // total height of left block

      // --- Right side: Legends as two columns ---
      const legendLines = [
        "Legend:",
        "LOW - Length Of Work",
        "OT - Over Time",
        "UT - Under Time",
        "LT - Lates",
        "ND - Night Differential",
        "WD - Whole Day",
        "HD - Half Day",
        "HDL - Half Day Leave",
        "Note: *** All computations are in",
        "hours and minutes"
      ];

      const col1 = legendLines.slice(0, Math.ceil(legendLines.length / 2));
      const col2 = legendLines.slice(Math.ceil(legendLines.length / 2));
      const colWidth = 30;
      const colGap = 2;
      const colStartX = pageWidth - rightMargin - colWidth * 2 - colGap;

      doc.setFontSize(7);
      col1.forEach((line, i) => {
        if (line.startsWith("Legend:")) {
          doc.setFont("helvetica", "bold");
        } else {
          doc.setFont("helvetica", "normal");
        }
        doc.text(line, colStartX, 20 + i * 4);
      });
      col2.forEach((line, i) => {
        doc.setFont("helvetica", "normal");
        doc.text(line, colStartX + colWidth + colGap, 20 + i * 4);
      });

      const rightBlockHeight = Math.max(col1.length, col2.length) * 4;

      // --- startY for table below both left and right blocks ---
      let startY = 20 + Math.max(leftBlockHeight, rightBlockHeight) + 5;

      // --- Header text (centered and bold) ---
      if (page.header_text?.length) {
        doc.setFont("helvetica", "bold");
        doc.setFontSize(10);

        page.header_text.forEach((line, i) => {
          const textWidth = doc.getTextWidth(line);
          doc.text(line, (pageWidth - textWidth) / 2, startY + i * 6);
        });

        startY += page.header_text.length * 7 + 3;
      }

      // --- Tables ---
      if (page.tables?.length) {
        page.tables.forEach((table) => {
          if (!table || table.length === 0) return;

          const headerRows = table.slice(0, 2);
          const bodyRows = table.slice(2);

          const head = headerRows.map((row) =>
            row.map((cell) => (typeof cell === "object" ? cell?.text || "" : cell || ""))
          );

          const body = bodyRows.map((row) =>
            row.map((cell) => (typeof cell === "object" ? cell?.text || "" : cell || ""))
          );

          const colStyles = {
            0: { halign: "left", fontStyle: "bold" },
            1: { halign: "center", fontStyle: "bold" },
          };
          for (let i = 2; i < head[0].length; i++) {
            colStyles[i] = { halign: "center", fontStyle: "bold" };
          }

          autoTable(doc, {
            startY,
            head,
            body,
            theme: "grid",
            styles: {
              fontSize: 8,
              cellPadding: 2,
              valign: "middle",
              lineColor: [0, 0, 0],
              lineWidth: 0.25,
              textColor: 0,
              overflow: "linebreak",
            },
            headStyles: {
              fillColor: [200, 200, 200],
              textColor: 0,
              fontStyle: "bold",
            },
            columnStyles: colStyles,
          });

          startY = doc.lastAutoTable.finalY + 20;
        });
      }

      // --- Footer: Employee Signature & Authorized Official ---
      const footerY = startY + 10;
      const lineLength = 60;
      const gapBetween = 40;
      const totalWidth = lineLength * 2 + gapBetween;
      const startX = (pageWidth - totalWidth) / 2;

      doc.setLineWidth(0.5);
      doc.line(startX, footerY, startX + lineLength, footerY);
      doc.text("Employee Signature", startX + lineLength / 2, footerY + 5, { align: "center" });

      const authX = startX + lineLength + gapBetween;
      doc.line(authX, footerY, authX + lineLength, footerY);
      doc.text("Authorized Official", authX + lineLength / 2, footerY + 5, { align: "center" });

      if (pageIndex < Object.keys(editableData).length - 1) {
        doc.addPage();
      }
    });

    doc.save(`${projectName}_DTR(UPDATED).pdf`);
  };

  return (
    <div className="pdf-card-container">
      <div className="pdf-card-header">
        <h3>
          PROJECT: <strong>{pdfData.uploaded_by_name || "Unknown"}</strong>
        </h3>

        {isAdmin && (
          <div className="header-buttons">
            <button
              className="export-button"
              onClick={() => setViewMode(viewMode === "parsed" ? "pdf" : "parsed")}
            >
              {viewMode === "parsed" ? "📄 View PDF" : "🧾 View Parsed"}
            </button>

            {isAdmin && viewMode === "parsed" && (
              <>
                <button className="save-button" onClick={() => alert("Save Changes")}>
                  💾 Save Changes
                </button>
                <button className="export-button" onClick={() => alert("Export PDF")}>
                  📄 Export as PDF
                </button>
              </>
            )}
          </div>
        )}
      </div>

      <div className="pdf-card-body">
        {viewMode === "pdf" ? (
          <div style={{ minHeight: "70vh", whiteSpace: "pre-wrap" }}>
            {pdfPagesText.length === 0 ? (
              <p>Loading PDF content...</p>
            ) : (
              pdfPagesText.map((text, idx) => (
                <div key={idx} style={{ marginBottom: "2rem" }}>
                  <h4>Page {idx + 1}</h4>
                  <p>{text}</p>
                </div>
              ))
            )}
          </div>
        ) : (
          <>
            {pageData ? (
              <>
                {pageData.header_text?.length > 0 ? (
                  <div className="pdf-header-text">
                    {pageData.header_text.map((line, i) => (
                      <p key={i}>
                        <strong>{line}</strong>
                      </p>
                    ))}
                  </div>
                ) : (
                  <p>No header text found.</p>
                )}

                {pageData.tables?.length > 0 ? (
                  pageData.tables.map((table, tIdx) => {
                    if (!table || table.length === 0) return null;
                    const headerRows = table.slice(0, 2);
                    const bodyRows = table.slice(2);

                    return (
                      <div key={tIdx} className="table-container">
                        <table
                          className={`pdf-table ${
                            isAdmin ? "editable-table" : ""
                          }`}
                        >
                          <thead>
                            {headerRows.map((row, rIdx) => (
                              <tr key={rIdx}>
                                {row.map((cell, cIdx) => (
                                  <th key={cIdx}>
                                    {typeof cell === "object" ? cell?.text : cell}
                                  </th>
                                ))}
                              </tr>
                            ))}
                          </thead>
                          <tbody>
                            {bodyRows.map((row, rIdx) => (
                              <tr key={rIdx}>
                                {row.map((cell, cIdx) => (
                                  <td key={cIdx}>
                                    {isAdmin ? (
                                      <input
                                        type="text"
                                        value={
                                          typeof cell === "object"
                                            ? cell?.text
                                            : cell
                                        }
                                        onChange={(e) =>
                                          console.log("Editing cell")
                                        }
                                      />
                                    ) : typeof cell === "object" ? (
                                      cell?.text
                                    ) : (
                                      cell
                                    )}
                                  </td>
                                ))}
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    );
                  })
                ) : (
                  <p>No tables found on this page.</p>
                )}

                <div className="pagination-controls1">
                  <button onClick={goPrev} disabled={currentPage === 1}>
                    ◀ Prev
                  </button>
                  <span>
                    Page {currentPage} of {totalPages}
                  </span>
                  <button
                    onClick={goNext}
                    disabled={currentPage === totalPages}
                  >
                    Next ▶
                  </button>
                </div>
              </>
            ) : (
              <p>No parsed data available.</p>
            )}
          </>
        )}
      </div>
    </div>
  );
}