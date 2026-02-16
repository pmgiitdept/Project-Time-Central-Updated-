// components/DTRStatusTable.jsx
export default function DTRStatusTable({ title, files }) {

  const getStatusClass = () => {
    if (title.toLowerCase() === "verified") return "status-verified";
    if (title.toLowerCase() === "pending") return "status-pending";
    if (title.toLowerCase() === "rejected") return "status-rejected";
    return "";
  };

  const getBadgeClass = (status) => {
    if (status === "verified") return "badge-verified";
    if (status === "pending") return "badge-pending";
    if (status === "rejected") return "badge-rejected";
    return "";
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return "-";
    return new Date(dateStr).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "2-digit",
    });
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
              <th>Date Uploaded</th> {/* NEW COLUMN */}
              <th>Status</th>
            </tr>
          </thead>

          <tbody>
            {files.map((file) => (
              <tr key={file.id}>
                <td>{file.filename}</td>
                <td>{file.uploaded_by?.username}</td>
                <td>{formatDate(file.start_date)}</td>
                <td>{formatDate(file.end_date)}</td>
                <td>{formatDate(file.uploaded_at)}</td> {/* NEW COLUMN */}
                <td>
                  <span className={`status-badge ${getBadgeClass(file.status)}`}>
                    {file.status}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

    </div>
  );
}