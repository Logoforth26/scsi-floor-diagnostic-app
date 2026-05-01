"use client";

import { useState, useRef } from "react";
import "./styles.css";

export default function Page() {
  const [imageData, setImageData] = useState(null);
  const [mediaType, setMediaType] = useState(null);
  const [facilityType, setFacilityType] = useState("");
  const [siteLocation, setSiteLocation] = useState("");
  const [trafficLevel, setTrafficLevel] = useState("");
  const [knownIssues, setKnownIssues] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState("");
  const inputRef = useRef(null);

async function handleFile(file) {
  if (!file) return;

  const fileName = file.name.toLowerCase();

  const isHeic =
    file.type === "image/heic" ||
    file.type === "image/heif" ||
    fileName.endsWith(".heic") ||
    fileName.endsWith(".heif");

  const isImage = file.type.startsWith("image/") || isHeic;

  if (!isImage) {
    setError("Please upload a valid image.");
    return;
  }

  if (file.size > 20 * 1024 * 1024) {
    setError("Please upload an image under 20MB.");
    return;
  }

  try {
    setLoading(true);
    setError("");

    let uploadFile = file;

    if (isHeic) {
  const heic2anyModule = await import("heic2any");
  const heic2any = heic2anyModule.default;

  const convertedBlob = await heic2any({
    blob: file,
    toType: "image/jpeg",
    quality: 0.85
  });

  uploadFile = new File(
    [convertedBlob],
    file.name.replace(/\.(heic|heif)$/i, ".jpg"),
    { type: "image/jpeg" }
  );
} else {
  const imageBitmap = await createImageBitmap(file);

  const canvas = document.createElement("canvas");
const maxSize = 1400;
let width = imageBitmap.width;
let height = imageBitmap.height;

if (width > height && width > maxSize) {
  height = Math.round((height * maxSize) / width);
  width = maxSize;
} else if (height > maxSize) {
  width = Math.round((width * maxSize) / height);
  height = maxSize;
}

canvas.width = width;
canvas.height = height;

const ctx = canvas.getContext("2d");
ctx.drawImage(imageBitmap, 0, 0, width, height);

  const jpegBlob = await new Promise((resolve) => {
   canvas.toBlob(resolve, "image/jpeg", 0.7);
  });

  if (!jpegBlob) {
    throw new Error("Could not convert image to JPEG.");
  }

  uploadFile = new File(
    [jpegBlob],
    file.name.replace(/\.[^/.]+$/, ".jpg"),
    { type: "image/jpeg" }
  );
}

    const reader = new FileReader();

    reader.onload = (event) => {
const dataUrl = event.target?.result;
if (!dataUrl) {
  setError("Could not read image.");
  return;
}
      const [prefix, base64] = dataUrl.split(",");
setImageData({ dataUrl, base64 });
setMediaType("image/jpeg");

      setResult(null);
      setError("");
    };

    reader.readAsDataURL(uploadFile);
  } catch (err) {
    console.error(err);
    setError("We could not prepare that photo. Please try taking another picture.");
  } finally {
    setLoading(false);
  }
}
async function analyzeFloor() {
  if (!imageData) return;

  setLoading(true);
  setResult(null);
  setError("");

  try {
    const response = await fetch("/api/analyze-floor", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
  imageBase64: imageData.base64,
  mediaType,
  facilityType,
  siteLocation,
  trafficLevel,
  knownIssues
})
    });

    const text = await response.text();

let data;
try {
  data = JSON.parse(text);
} catch {
  throw new Error(text || "Server returned an invalid response.");
}

    if (!response.ok) {
      throw new Error(data.error || "Analysis failed.");
    }

    setResult(data);
  } catch (err) {
    setError(err.message || "Analysis failed. Please try again.");
  } finally {
    setLoading(false);
  }
}
 async function downloadReportPDF() {
  if (!result) return;

  try {
    setLoading(true);
    setError("");

    const jsPDFModule = await import("jspdf");
    const jsPDF = jsPDFModule.default;

const pdf = new jsPDF("p", "mm", "a4");

const logoResponse = await fetch("/scsi-logo.png");
const logoBlob = await logoResponse.blob();

const logoDataUrl = await new Promise((resolve) => {
  const reader = new FileReader();
  reader.onloadend = () => resolve(reader.result);
  reader.readAsDataURL(logoBlob);
});

const pageWidth = pdf.internal.pageSize.getWidth();
    const margin = 15;
    const maxWidth = pageWidth - margin * 2;
    let y = 18;

    function addText(text, size = 11, isBold = false) {
      pdf.setFont("helvetica", isBold ? "bold" : "normal");
      pdf.setFontSize(size);

      const lines = pdf.splitTextToSize(String(text || ""), maxWidth);

      lines.forEach((line) => {
        if (y > 275) {
          pdf.addPage();
          y = 18;
        }

        pdf.text(line, margin, y);
        y += size * 0.45;
      });

      y += 3;
    }

pdf.setFillColor(20, 45, 80);
pdf.rect(0, 0, pageWidth, 32, "F");

pdf.addImage(logoDataUrl, "PNG", margin, 7, 34, 16);

pdf.setTextColor(255, 255, 255);
pdf.setFont("helvetica", "bold");
pdf.setFontSize(18);
pdf.text("SCSI Floor Diagnostic Report", margin + 44, 18);

y = 42;
    pdf.setTextColor(0, 0, 0);

    addText(`Floor Type: ${result.floorType || "Not provided"}`, 13, true);
    addText(`Condition Score: ${result.conditionScore || "N/A"} / 100`, 13, true);
    addText(`Condition: ${result.conditionTitle || "Not provided"}`, 13, true);

    addText("Condition Summary", 14, true);
    addText(result.conditionSummary || "No summary provided.", 11);

    addText("Recommended SCSI Services", 14, true);

    if (Array.isArray(result.services) && result.services.length > 0) {
      result.services.forEach((service, index) => {
        addText(
          `${index + 1}. ${service.name || "Service"} — Priority: ${service.priority || "N/A"}`,
          11,
          true
        );
        addText(service.description || "", 10);
      });
    } else {
      addText("No services provided.", 11);
    }

    addText("Detailed Findings", 14, true);

    if (Array.isArray(result.findings) && result.findings.length > 0) {
      result.findings.forEach((finding, index) => {
        addText(`${index + 1}. ${finding.text || ""}`, 10);
      });
    } else {
      addText("No findings provided.", 11);
    }

    addText("Next Step", 14, true);
    addText(
      "For precise assessment and pricing, contact SCSI directly at 1 (800) 695-0773 or info@scsione.com.",
      11
    );

    pdf.save("SCSI-Floor-Diagnostic-Report.pdf");
  } catch (err) {
    console.error(err);
    setError("Could not download the PDF report. Please try again.");
  } finally {
    setLoading(false);
  }
}
  function resetTool() {
    setImageData(null);
    setMediaType(null);
    setFacilityType("");
    setSiteLocation("");
    setTrafficLevel("");
    setKnownIssues("");
    setResult(null);
    setError("");
    setLoading(false);
    if (inputRef.current) inputRef.current.value = "";
  }

  return (
    <main>
      <header>
        <div className="logo-area">
         <img
  src="/scsi-logo.png"
  alt="SCSI Logo"
  className="real-logo"
/>
<div className="logo-text">
  <span>Southern Cleaning Services Inc</span>
  <span className="logo-tagline">“Smarter Cleaning & Superior Innovations.”</span>
</div>
        </div>
        <div className="header-tag">⚡ AI Floor Diagnostics</div>
      </header>

      <section className="hero">
        <div className="hero-eyebrow">Live AI Analysis</div>
        <h1>Floor Condition<br /><span>Diagnostic Tool</span></h1>
        <p>Upload a photo of your floor and our AI analyzes the condition, identifies the floor type, and recommends SCSI services.</p>
      </section>

      <section className="app-container">
        <div
          className="upload-card"
          onClick={() => !imageData && inputRef.current?.click()}
          onDragOver={(e) => e.preventDefault()}
          onDrop={(e) => {
            e.preventDefault();
            handleFile(e.dataTransfer.files?.[0]);
          }}
        >
          {!imageData ? (
            <div className="upload-inner">
              <div className="upload-icon">📸</div>
              <h3>Upload Floor Photo</h3>
              <p>Drag and drop your photo here, or click to browse.</p>
              <button className="btn-upload" type="button">⬆ Choose Photo</button>
              <div className="upload-formats">JPG · PNG · WEBP · HEIC — up to 20MB</div>
            </div>
          ) : (
            <div className="preview-area active">
              <div className="preview-header">
                <span>📎 Photo loaded — ready for analysis</span>
                <button className="btn-remove" type="button" onClick={(e) => { e.stopPropagation(); resetTool(); }}>✕ Remove</button>
              </div>
              <div className="preview-img-wrap">
                <img src={imageData.dataUrl} alt="Floor preview" />
              </div>
            </div>
          )}
          <input
  ref={inputRef}
  type="file"
 accept="image/*"
  hidden
  onChange={(e) => handleFile(e.target.files?.[0])}
/>
        </div>

        {imageData && (
          <div className="context-section active">
            <div className="section-label">Additional Context Optional</div>
            <div className="context-grid">
            <Field label="Site / Location">
  <input
    type="text"
    value={siteLocation}
    onChange={(e) => setSiteLocation(e.target.value)}
    placeholder="Example: Walmart #1762 - Seabrook, NH"
  />
</Field>
              <Field label="Facility Type">
                <select value={facilityType} onChange={(e) => setFacilityType(e.target.value)}>
                  <option value="">Select type...</option>
                  <option>Retail / Grocery Store</option>
                  <option>Office Building</option>
                  <option>Healthcare / Hospital</option>
                  <option>Warehouse / Industrial</option>
                  <option>Restaurant / Food Service</option>
                  <option>Hotel / Hospitality</option>
                  <option>School / University</option>
                  <option>Government / Municipal</option>
                  <option>Residential / Multi-Family</option>
                  <option>Other</option>
                </select>
              </Field>
              <Field label="Foot Traffic Level">
                <select value={trafficLevel} onChange={(e) => setTrafficLevel(e.target.value)}>
                  <option value="">Select level...</option>
                  <option>Low</option>
                  <option>Medium</option>
                  <option>High</option>
                  <option>Very High</option>
                </select>
              </Field>
            </div>
            <Field label="Known Issues or History">
              <textarea value={knownIssues} onChange={(e) => setKnownIssues(e.target.value)} placeholder="Example: heavy wax buildup, entrance staining, floor has not been stripped in 2 years..." />
            </Field>
          </div>
        )}

        <button className="analyze-btn" disabled={!imageData || loading} onClick={analyzeFloor}>
          🔍 <span>{loading ? "Analyzing..." : "Analyze My Floor"}</span>
        </button>

        {loading && <LoadingState />}
        {error && <div className="error-box active">⚠ {error}</div>}
{result && (
  <>
<div>
  <Results result={result} />
</div>

    <div className="scan-again-wrap">
      <button
        className="btn-primary"
        type="button"
        onClick={downloadReportPDF}
        disabled={loading}
      >
        📄 Download PDF Report
      </button>
    </div>
  </>
)}

        {result && (
          <div className="scan-again-wrap">
            <button className="btn-scan-again" onClick={resetTool}>↩ Analyze Another Floor</button>
          </div>
        )}

        <div className="disclaimer">
          AI diagnostics are recommendations based on visual analysis. For precise assessment and pricing, contact SCSI directly at <strong>1 (800) 695-0773</strong> or <strong>info@scsione.com</strong>.
        </div>
      </section>
    </main>
  );
}

function Field({ label, children }) {
  return (
    <div className="field-group">
      <label>{label}</label>
      {children}
    </div>
  );
}

function LoadingState() {
  return (
    <div className="loading-state active">
      <div className="scan-animation">
        <div className="scan-ring"></div>
        <div className="scan-ring"></div>
        <div className="scan-ring"></div>
        <div className="scan-dot"></div>
      </div>
      <h3>Scanning Floor Condition</h3>
      <p>Inspecting surface type, visible wear patterns, and treatment needs.</p>
    </div>
  );
}

function Results({ result }) {
  const score = Number(result.conditionScore || 0);
  const scoreColor = score >= 70 ? "#22c55e" : score >= 40 ? "#f59e0b" : "#ef4444";
  const circumference = 2 * Math.PI * 28;
  const offset = circumference - (score / 100) * circumference;

  return (
    <div className="results-panel active">
      <div className="diagnosis-header">
        <div className={`severity-badge ${result.severity || "maintenance"}`}>{result.severityEmoji || "🔍"}</div>
        <div className="diagnosis-meta">
          <div className="floor-type">📊 {result.floorType}</div>
          <h2>{result.conditionTitle}</h2>
          <p>{result.conditionSummary}</p>
        </div>
        <div className="condition-score">
          <div className="score-ring">
            <svg width="70" height="70" viewBox="0 0 70 70">
              <circle cx="35" cy="35" r="28" fill="none" stroke="rgba(46,124,246,0.15)" strokeWidth="5" />
              <circle cx="35" cy="35" r="28" fill="none" stroke={scoreColor} strokeWidth="5" strokeLinecap="round" strokeDasharray={circumference} strokeDashoffset={offset} />
            </svg>
            <div className="score-text">
              <span className="score-number">{score}</span>
              <span className="score-label">/ 100</span>
            </div>
          </div>
          <div className="condition-text">Condition</div>
        </div>
      </div>

      <div className="services-section">
        <div className="section-title">Recommended SCSI Services</div>
        <div className="services-grid">
          {(result.services || []).map((service, i) => (
            <div className={`service-card priority-${service.priority}`} key={i}>
              <div className="service-card-top">
                <span className="service-icon">{service.icon}</span>
                <span className={`priority-tag ${service.priority}`}>{service.priority}</span>
              </div>
              <div className="service-name">{service.name}</div>
              <div className="service-desc">{service.description}</div>
            </div>
          ))}
        </div>
      </div>

      <div className="findings-section">
        <div className="section-title">Detailed Findings</div>
        <div className="findings-list">
          {(result.findings || []).map((finding, i) => (
            <div className={`finding-item ${finding.type}`} key={i}>
              <span className="finding-icon">{finding.icon}</span>
              <span>{finding.text}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="cta-section">
        <div className="cta-text">
          <h3>Ready to Restore Your Floor?</h3>
          <p>Get a free quote from SCSI — nationwide service, one partner for everything.</p>
        </div>
        <div className="cta-buttons">
          <a href="https://www.scsione.com/contact-us" target="_blank" className="btn-primary">📞 Get a Free Quote</a>
          <a href="https://www.scsione.com/care-maintenace" target="_blank" className="btn-secondary">📖 View All Floor Services</a>
        </div>
      </div>
    </div>
  );
}
