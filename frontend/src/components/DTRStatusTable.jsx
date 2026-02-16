import { useState } from "react";

export default function DTRStatusTable({ title, files }) {
  const [expandedFile, setExpandedFile] = useState(null);

  return (
    <div className="status-table">
      <h3>
        {title} ({files.length})
      </h3>

      <div className="table-wrapper">
        <table>
          <thead>
            <tr>
              <th>Filename</th>
              <th>Uploader</th>
              <th>Start</th>
              <th>End</th>
              <th>Status</th>
            </tr>
          </thead>

          <tbody>
            {files.map((file) => (
              <tr
                key={file.id}
                onClick={() => setExpandedFile(file.id)}
                style={{ cursor: "pointer" }}
              >
                <td>{file.filename}</td>
                <td>{file.uploaded_by?.username}</td>
                <td>{new Date(file.start_date).toLocaleDateString()}</td>
                <td>{new Date(file.end_date).toLocaleDateString()}</td>
                <td>{file.status}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
