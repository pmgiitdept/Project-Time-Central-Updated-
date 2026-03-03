// components/DTRStatusTable.jsx
export default function DTRStatusTable({ title, files = [] }) {

  const normalize = (value) =>
    (value || "").toString().toLowerCase().trim();

  const getStatusClass = () => {
    const normalizedTitle = normalize(title);

    if (normalizedTitle === "verified") return "status-verified";
    if (normalizedTitle === "pending") return "status-pending";
    if (normalizedTitle === "rejected") return "status-rejected";
    return "status-other";
  };

  const formatDate = (dateValue) => {
    if (!dateValue) return "-";
    const date = new Date(dateValue);
    return isNaN(date) ? "-" : date.toLocaleDateString();
  };

  const getFileName = (file) => {
    // If backend sends file path instead of filename
    if (file.filename) return file.filename;

    if (file.file) {
      const parts = file.file.split("/");
      return parts[parts.length - 1];
    }

    return "Unknown File";
  };

  return (
    <div className={`status-table ${getStatusClass()}`}>

      <div className="status-header">
        <h3>{title} ({files.length})</h3>
      </div>

      <div className="table-wrapper">
        <table>
          <thead>
            <tr>
              <th>Filename</th>
              <th>Uploader</th>
              <th>Start</th>
              <th>End</th>
            </tr>
          </thead>

          <tbody>
            {files.length === 0 ? (
              <tr>
                <td colSpan="4" style={{ textAlign: "center" }}>
                  No records found
                </td>
              </tr>
            ) : (
              files.map((file) => (
                <tr key={file.id}>
                  <td>{getFileName(file)}</td>
                  <td>{file.uploaded_by?.username || "-"}</td>
                  <td>{formatDate(file.start_date)}</td>
                  <td>{formatDate(file.end_date)}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

    </div>
  );
}