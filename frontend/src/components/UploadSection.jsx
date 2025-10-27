// components/UploadSection.jsx
import FileUpload from "./FileUpload";
import DTRUpload from "./DTRUpload";
import "./styles/UploadSection.css";

export default function UploadSection({ refreshFiles, refreshDTR, refreshPDFs }) {
  return (
    <div className="upload-section">
      <FileUpload refreshFiles={refreshFiles} refreshPDFs={refreshPDFs} />
      <DTRUpload refreshDTR={refreshDTR} />
    </div>
  );
}
