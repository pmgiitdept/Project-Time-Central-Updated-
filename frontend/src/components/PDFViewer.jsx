// components/PDFViewer.jsx
export default function PDFViewer({ fileUrl }) {
  if (!fileUrl) return null;

  return (
    <div style={{ width: "100%", height: "80vh" }}>
      <iframe
        src={fileUrl}
        title="PDF Viewer"
        width="100%"
        height="100%"
        style={{ border: "none" }}
      />
    </div>
  );
}