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

  const openModal = (file, type) => setActiveModal({ type, data: file });
  const closeModal = () => setActiveModal({ type: null, data: null });

  return (
    <motion.div className="file-vertical-wrapper" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>

      <div className="file-vertical-top">
        <div className="vertical-header">
          <h3>Uploaded DTR Files</h3>
          <button onClick={fetchFiles}>🔄 Refresh</button>
        </div>

        <div className="vertical-filters">
            <div className="filter-label">
                <span>Search</span>
                <input
                type="text"
                placeholder="Filename / Employee Name"
                value={search}
                onChange={e => setSearch(e.target.value)}
                />
            </div>

            <div className="filter-label">
                <span>Upload Start</span>
                <input
                type="date"
                value={uploadStartDate}
                onChange={e => setUploadStartDate(e.target.value)}
                />
            </div>

            <div className="filter-label">
                <span>Upload End</span>
                <input
                type="date"
                value={uploadEndDate}
                onChange={e => setUploadEndDate(e.target.value)}
                />
            </div>

            <div className="filter-label">
                <span>Uploader / Project</span>
                <input
                type="text"
                placeholder="Uploader or Project Name"
                value={uploaderFilterLocal}
                onChange={e => setUploaderFilterLocal(e.target.value)}
                />
            </div>
        </div>

        {loading ? <p>Loading...</p> : (
          <div className="vertical-table-container">
            <table className="vertical-file-table">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Uploaded / Period</th>
                  <th>Project</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredFiles.map(file => (
                  <tr key={file.id} className={selectedFile?.id === file.id ? "selected-row" : ""} onClick={() => setSelectedFile(file)}>
                    <td>{file.type === "pdf" ? file.file.split("/").pop() : file.employee_name}</td>
                    <td>{file.type === "pdf" ? new Date(file.uploaded_at).toLocaleString() : `${file.period_from} → ${file.period_to}`}</td>
                    <td>{file.type === "pdf" ? file.uploaded_by_name : file.project}</td>
                    <td>
                      {file.type === "pdf" ? (
                        <>
                          <button onClick={e => { e.stopPropagation(); openModal(file, "text"); }}>View DTR</button>
                          <button onClick={e => { e.stopPropagation(); openModal(file, "visual"); }}>Visual</button>
                        </>
                      ) : (
                        <button onClick={e => { e.stopPropagation(); openModal(file, "parsed"); }}>View Parsed</button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* BOTTOM SECTION: SELECTED FILE DETAILS */}
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