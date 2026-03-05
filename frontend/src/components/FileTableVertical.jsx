/* components/FileTableVertical.jsx */

import { FaSyncAlt } from "react-icons/fa";
import { useEffect, useState, useRef } from "react";
import api from "../api";
import DTRTable from "../components/DTRTable";
import { toast } from "react-toastify";
import "./styles/FileTableVertical.css";
import { motion } from "framer-motion";

export default function FileTableVertical({ role, uploaderFilter = null }) {

  const [files, setFiles] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedFileId, setSelectedFileId] = useState(null);

  const [search, setSearch] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  const hasFetchedRef = useRef(false);

  useEffect(() => {
    if (hasFetchedRef.current) return;
    hasFetchedRef.current = true;

    fetchFiles();
  }, []);

  const fetchFiles = async (url = "/files/dtr/files/") => {
    setLoading(true);

    try {
      const token = localStorage.getItem("access_token");

      const res = await api.get(url, {
        headers: { Authorization: `Bearer ${token}` }
      });

      setFiles(res.data.results || res.data);

    } catch (err) {
      console.error(err);
      toast.error("Failed to fetch files");
    } finally {
      setLoading(false);
    }
  };

  const getFilteredFiles = () => {
    return files.filter((file) => {

      const name = (file.file?.split("/").pop() || "").toLowerCase();
      const owner = (file.uploaded_by?.username || "").toLowerCase();

      const query = search.toLowerCase();

      const matchesSearch =
        name.includes(query) || owner.includes(query);

      const fileDate = new Date(file.uploaded_at).setHours(0,0,0,0);

      const matchesStart =
        startDate ? fileDate >= new Date(startDate).setHours(0,0,0,0) : true;

      const matchesEnd =
        endDate ? fileDate <= new Date(endDate).setHours(0,0,0,0) : true;

      return matchesSearch && matchesStart && matchesEnd;

    });
  };

  if (loading) {
    return <p>Loading files...</p>;
  }

  const filteredFiles = getFilteredFiles();

  return (

    <motion.div
      className="file-vertical-wrapper"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
    >

      {/* TOP SECTION (FILES) */}
      <div className="file-vertical-top">

        <div className="vertical-header">

          <h2>Summary Forms Dashboard</h2>

          <button
            className="refresh-btn"
            onClick={fetchFiles}
          >
            <FaSyncAlt />
          </button>

        </div>

        {/* Filters */}

        <div className="vertical-filters">

          <input
            type="text"
            placeholder="Search uploader or filename"
            value={search}
            onChange={(e)=>setSearch(e.target.value)}
          />

          <input
            type="date"
            value={startDate}
            onChange={(e)=>setStartDate(e.target.value)}
          />

          <input
            type="date"
            value={endDate}
            onChange={(e)=>setEndDate(e.target.value)}
          />

        </div>

        {/* TABLE */}

        <div className="vertical-table-container">

          <table className="vertical-file-table">

            <thead>
              <tr>
                <th>Uploader</th>
                <th>Uploaded</th>
                <th>Status</th>
                <th>Start</th>
                <th>End</th>
              </tr>
            </thead>

            <tbody>

              {filteredFiles.map(file => (

                <tr
                  key={file.id}
                  onClick={()=>setSelectedFileId(file.id)}
                  className={selectedFileId === file.id ? "selected-row" : ""}
                >

                  <td>{file.uploaded_by?.username}</td>

                  <td>
                    {new Date(file.uploaded_at).toLocaleString()}
                  </td>

                  <td>{file.status}</td>

                  <td>
                    {file.start_date
                      ? new Date(file.start_date).toLocaleDateString()
                      : "-"}
                  </td>

                  <td>
                    {file.end_date
                      ? new Date(file.end_date).toLocaleDateString()
                      : "-"}
                  </td>

                </tr>

              ))}

            </tbody>

          </table>

        </div>

      </div>

      {/* BOTTOM SECTION (DTR TABLE) */}

      <div className="file-vertical-bottom">

        <DTRTable
          role={role}
          fileId={selectedFileId}
        />

      </div>

    </motion.div>
  );
}