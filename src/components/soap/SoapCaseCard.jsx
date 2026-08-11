import { useState } from "react";
import SoapCaseComments from "./SoapCaseComments.jsx";
import { card, colors, mutedText } from "../../styles.js";

const FIELDS = [
  ["subjective", "Subjective"],
  ["objective", "Objective"],
  ["assessment", "Assessment"],
  ["plan", "Plan"],
];

export default function SoapCaseCard({ soapCase }) {
  const [showComments, setShowComments] = useState(false);

  return (
    <div style={card}>
      <div style={{ display: "flex", justifyContent: "space-between" }}>
        <strong style={{ color: colors.text }}>
          {soapCase.patient_name || "Paciente"} {soapCase.species ? `· ${soapCase.species}` : ""}
        </strong>
        <span style={mutedText}>{new Date(soapCase.created_at).toLocaleDateString()}</span>
      </div>
      {soapCase.author?.full_name && <p style={mutedText}>{soapCase.author.full_name}</p>}

      {FIELDS.map(([key, heading]) =>
        soapCase[key] ? (
          <div key={key} style={{ marginBottom: 8 }}>
            <div style={{ fontSize: 13, fontWeight: 600, color: colors.muted }}>{heading}</div>
            <div style={{ color: colors.text, whiteSpace: "pre-wrap" }}>{soapCase[key]}</div>
          </div>
        ) : null
      )}

      {soapCase.visibility === "shared" && (
        <div style={{ marginTop: 8, borderTop: `1px solid ${colors.border}`, paddingTop: 8 }}>
          <button
            onClick={() => setShowComments((v) => !v)}
            style={{ border: "none", background: "none", cursor: "pointer", ...mutedText, fontSize: 13 }}
          >
            💬 {showComments ? "Fechar discussão" : "Ver/discutir"}
          </button>
          {showComments && (
            <div style={{ marginTop: 8 }}>
              <SoapCaseComments caseId={soapCase.id} />
            </div>
          )}
        </div>
      )}
    </div>
  );
}
