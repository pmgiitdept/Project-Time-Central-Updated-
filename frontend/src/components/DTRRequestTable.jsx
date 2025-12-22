{/*components/DTRRequestTable.jsx*/}
import { useEffect, useState } from "react";
import api from "../api";
import { toast } from "react-toastify";

export default function DTRRequestTable({ refreshTrigger }) {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(false);

  const fetchRequests = async () => {
    setLoading(true);
    const token = localStorage.getItem("access_token");
    try {
      const res = await api.get("/files/dtr/request-list/", {
        headers: { Authorization: `Bearer ${token}` },
      });

      // Ensure requests is always an array
      const data = Array.isArray(res.data) ? res.data : res.data.results || [];
      setRequests(data);

    } catch (err) {
      console.error(err);
      toast.error("Failed to fetch DTR upload requests.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRequests();
  }, [refreshTrigger]);

  const approveRequest = async (id) => {
    const token = localStorage.getItem("access_token");
    try {
      await api.post(`/files/dtr/request-approve/${id}/`, {}, {
        headers: { Authorization: `Bearer ${token}` },
      });
      toast.success("Request approved!");
      fetchRequests();
    } catch (err) {
      console.error(err);
      toast.error("Failed to approve request.");
    }
  };

  const rejectRequest = async (id) => {
    const token = localStorage.getItem("access_token");
    try {
      await api.post(`/files/dtr/request-reject/${id}/`, {}, {
        headers: { Authorization: `Bearer ${token}` },
      });
      toast.success("Request rejected!");
      fetchRequests();
    } catch (err) {
      console.error(err);
      toast.error("Failed to reject request.");
    }
  };

  return (
    <div style={{ marginTop: "2rem" }}>
      <h3>DTR Upload Requests</h3>

      {loading ? (
        <p>Loading...</p>
      ) : requests.length === 0 ? (
        <p>No requests found.</p>
      ) : (
        <table className="table" style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead style={{ backgroundColor: "#f0f0f0" }}>
            <tr>
              <th style={{ padding: "0.5rem" }}>User</th>
              <th style={{ padding: "0.5rem" }}>Status</th>
              <th style={{ padding: "0.5rem" }}>Created At</th>
              <th style={{ padding: "0.5rem" }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {requests.map((req) => (
              <tr key={req.id} style={{ borderBottom: "1px solid #ddd" }}>
                <td style={{ padding: "0.5rem" }}>{req.user.username}</td>
                <td style={{ padding: "0.5rem", color: req.approved ? "green" : "orange", fontWeight: "bold" }}>
                  {req.approved ? "Approved" : "Pending"}
                </td>
                <td style={{ padding: "0.5rem" }}>{new Date(req.created_at).toLocaleString()}</td>
                <td style={{ padding: "0.5rem" }}>
                  {!req.approved && (
                    <>
                      <button
                        className="upload-button"
                        style={{ marginRight: "0.5rem" }}
                        onClick={() => approveRequest(req.id)}
                      >
                        ✅ Approve
                      </button>
                      <button
                        className="upload-button1 secondary"
                        onClick={() => rejectRequest(req.id)}
                      >
                        ❌ Reject
                      </button>
                    </>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
