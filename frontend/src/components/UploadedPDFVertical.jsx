import { useState, useEffect, useRef } from "react";
import api from "../api";
import { motion } from "framer-motion";
import PDFTextModal from "./PDFTextModal";
import PDFVisualModal from "./PDFVIsualModal";
import ParsedDTRModal from "./ParsedDTRModal";
import { toast } from "react-toastify";

export default function DTRFilesVertical({ currentUser, uploaderFilter }) {
  const [files, setFiles] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedFile, setSelectedFile] = useState(null);
  const [search, setSearch] = useState("");
  const [uploaderFilterLocal, setUploaderFilterLocal] = useState("");
  const [uploadStartDate, setUploadStartDate] = useState("");
  const [uploadEndDate, setUploadEndDate] = useState("");
  const [activeModal, setActiveModal] = useState({ type: null, data: null });

  const hasFetchedRef = useRef(false);

  const fetchFiles = async () => {
    setLoading(true);
    try {
      const pdfRes = await api.get("/files/pdfs/");
      const dtrRes = await api.get("/files/parsed-dtrs/");

      let pdfData = pdfRes.data.results || pdfRes.data;
      let dtrData = dtrRes.data.results || dtrRes.data;

      if (uploaderFilter) {
        pdfData = pdfData.filter(f => f.uploaded_by_name === uploaderFilter);
        dtrData = dtrData.filter(d => d.project === uploaderFilter);
      }

      setFiles([
        ...pdfData.map(f => ({ ...f, type: "pdf" })),
        ...dtrData.map(d => ({ ...d, type: "parsed" }))
      ]);
    } catch (err) {
      console.error("Failed to fetch files:", err);
      toast.error("Failed to fetch files");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!hasFetchedRef.current) {
      hasFetchedRef.current = true;
      fetchFiles();
    }
  }, []);

  const uploaderProjectOptions = [
    ...new Set(
      files.map(file =>
        file.type === "pdf" ? file.uploaded_by_name : file.project
      )
    ),
  ].filter(Boolean);

  const filteredFiles = files.filter(file => {
    const matchesSearch = file.type === "pdf"
      ? file.file.split("/").pop().toLowerCase().includes(search.toLowerCase())
      : file.employee_name.toLowerCase().includes(search.toLowerCase());
    
    const fileDate = new Date(file.uploaded_at || file.period_from).setHours(0,0,0,0);
    const matchesUploadStart = uploadStartDate ? fileDate >= new Date(uploadStartDate).setHours(0,0,0,0) : true;
    const matchesUploadEnd = uploadEndDate ? fileDate <= new Date(uploadEndDate).setHours(0,0,0,0) : true;

    const matchesUploader = uploaderFilterLocal 
      ? (file.type === "pdf" ? file.uploaded_by_name === uploaderFilterLocal : file.project === uploaderFilterLocal) 
      : true;

    return matchesSearch && matchesUploadStart && matchesUploadEnd && matchesUploader;
  });

  const openModal = (file, type) => {
    setSelectedFile(file);
    setActiveModal({ type, data: file });
  };
  const closeModal = () => setActiveModal({ type: null, data: null });

  const normalizeDate = (dateStr) => {
    if (!dateStr) return null;

    const parts = dateStr.split(/[\/\-\s]/); 
    if (parts.length !== 3) return new Date(dateStr);

    let [a, b, c] = parts.map(Number);

    if (a > 12) {
      return new Date(c, b - 1, a);
    }

    if (b > 12) {
      return new Date(c, a - 1, b);
    }

    return new Date(c, a - 1, b);
  };

  return (
    <motion.div className="file-vertical-wrapper" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>

      <div className="file-vertical-top">
        <div className="vertical-header">
          <h3>Uploaded DTR Files</h3>
          <button onClick={fetchFiles}>🔄 Refresh</button>
        </div>

        <div className="vertical-filters">
          <div className="filter-item">
            <label>Search</label>
            <input
              type="text"
              placeholder="Filename / Employee Name"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          <div className="filter-item">
            <label>Upload From</label>
            <input
              type="date"
              value={uploadStartDate}
              onChange={(e) => setUploadStartDate(e.target.value)}
            />
          </div>

          <div className="filter-item">
            <label>Uploader / Project</label>
            <select
              value={uploaderFilterLocal}
              onChange={(e) => setUploaderFilterLocal(e.target.value)}
            >
              <option value="">All Projects</option>
              {uploaderProjectOptions.map((option, index) => (
                <option key={index} value={option}>
                  {option}
                </option>
              ))}
            </select>
          </div>
        </div>

        {loading ? <p>Loading...</p> : (
          <div className="vertical-table-container">
            <table className="vertical-file-table">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Uploaded At</th>
                  <th>Period</th>
                  <th>Project</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredFiles.map(file => (
                  <tr key={file.id} className={selectedFile?.id === file.id ? "selected-row" : ""} onClick={() => setSelectedFile(file)}>
                    <td>{file.type === "pdf" ? file.file.split("/").pop() : file.employee_name}</td>
                    <td>{file.type === "pdf" ? new Date(file.uploaded_at).toLocaleString() : ""}</td>
                    <td>
                      {file.type === "pdf"
                        ? file.start_date && file.end_date
                          ? `${normalizeDate(file.start_date)?.toLocaleDateString()} → ${normalizeDate(file.end_date)?.toLocaleDateString()}`
                          : "N/A"
                        : `${file.period_from} → ${file.period_to}`}
                    </td>
                    <td>{file.type === "pdf" ? file.uploaded_by_name : file.project}</td>
                    <td>
                      {file.type === "pdf" ? (
                        <>
                          <button onClick={e => { e.stopPropagation(); openModal(file, "text"); }}  className="dtr-btn">View DTR</button>
                          <button onClick={e => { e.stopPropagation(); openModal(file, "visual"); }}  className="visual-btn">Visual</button>
                        </>
                      ) : (
                        <button onClick={e => { e.stopPropagation(); openModal(file, "parsed"); }}>View Parsed</button>
                      )}

                      <button
                        onClick={async e => {
                          e.stopPropagation();
                          try {
                            const token = localStorage.getItem("access_token");
                            const res = await api.get(
                              file.type === "pdf"
                                ? `/files/pdfs/${file.id}/download/`
                                : `/files/parsed-dtrs/${file.id}/export/`,
                              { headers: { Authorization: `Bearer ${token}` }, responseType: "blob" }
                            );
                            const url = window.URL.createObjectURL(new Blob([res.data]));
                            const link = document.createElement("a");
                            link.href = url;
                            link.setAttribute("download", file.type === "pdf" ? file.file.split("/").pop() : `DTR_${file.id}.xlsx`);
                            document.body.appendChild(link);
                            link.click();
                            toast.success("File downloaded");
                          } catch (err) {
                            console.error(err);
                            toast.error("Failed to download file");
                          }
                        }}
                         className="download-btn"
                      >
                        Download
                      </button>

                      <button
                        onClick={async e => {
                          e.stopPropagation();
                          if (!confirm("Are you sure you want to delete this file?")) return;
                          try {
                            const token = localStorage.getItem("access_token");
                            await api.delete(
                              file.type === "pdf"
                                ? `/files/pdfs/${file.id}/`
                                : `/files/parsed-dtrs/${file.id}/`,
                              { headers: { Authorization: `Bearer ${token}` } }
                            );
                            setFiles(prev => prev.filter(f => f.id !== file.id));
                            toast.success("File deleted successfully");
                            if (selectedFile?.id === file.id) setSelectedFile(null);
                          } catch (err) {
                            console.error(err);
                            toast.error("Failed to delete file");
                          }
                        }}
                        className="delete-btn"
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div className="file-vertical-bottom">
        {selectedFile && selectedFile.type === "pdf" && activeModal.type === "text" && (
          <PDFTextModal pdfData={selectedFile} currentUser={currentUser} onClose={closeModal} />
        )}
        {selectedFile && selectedFile.type === "pdf" && activeModal.type === "visual" && (
          <PDFVisualModal pdfData={selectedFile} onClose={closeModal} />
        )}
        {selectedFile && selectedFile.type === "parsed" && activeModal.type === "parsed" && (
          <ParsedDTRModal dtrData={selectedFile} currentUser={currentUser} onClose={closeModal} />
        )}
        {!activeModal.type && selectedFile && <p>Select a file and click an action to view details.</p>}
      </div>

    </motion.div>
  );
}