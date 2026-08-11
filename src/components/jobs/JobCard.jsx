import { useState } from "react";
import { useAuth } from "../../context/AuthContext.jsx";
import { button, buttonSecondary, card, colors, errorText, input, mutedText } from "../../styles.js";

export default function JobCard({ job, onApply }) {
  const { user } = useAuth();
  const isOwner = job.author_id === user.id;
  const [showApply, setShowApply] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleApply() {
    setError(null);
    setSubmitting(true);
    try {
      await onApply(job, message);
      setShowApply(false);
      setMessage("");
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div style={card}>
      <div style={{ display: "flex", justifyContent: "space-between" }}>
        <strong style={{ color: colors.text }}>{job.title}</strong>
        <span style={mutedText}>{new Date(job.created_at).toLocaleDateString()}</span>
      </div>
      <p style={mutedText}>
        {[job.employer_name, job.location].filter(Boolean).join(" · ") || "—"}
      </p>
      {job.description && <p style={{ color: colors.text }}>{job.description}</p>}
      {job.salary_range && <p style={mutedText}>Remuneração: {job.salary_range}</p>}

      <div style={{ display: "flex", gap: 12, alignItems: "center", marginTop: 8 }}>
        {isOwner ? (
          // job_applications RLS only lets the job's author see every
          // application — for anyone else, an aggregate count would be
          // silently under-counted to just their own row, so it's only
          // shown here, to the owner, where it's accurate.
          <span style={mutedText}>
            A tua vaga · {job.applicationCount} interessado{job.applicationCount === 1 ? "" : "s"}
          </span>
        ) : job.appliedByMe ? (
          <span style={mutedText}>Já demonstraste interesse ✓</span>
        ) : showApply ? (
          <div style={{ flex: 1 }}>
            <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
              <input
                style={{ ...input, marginBottom: 0, flex: 1 }}
                placeholder="Mensagem (opcional)"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
              />
              <button style={button} onClick={handleApply} disabled={submitting}>
                Enviar
              </button>
            </div>
            {error && <p style={{ ...errorText, marginTop: 8, marginBottom: 0 }}>{error}</p>}
          </div>
        ) : (
          <button style={buttonSecondary} onClick={() => setShowApply(true)}>
            Candidatar-me
          </button>
        )}
      </div>
    </div>
  );
}
