import { useState } from "react";
import { button, card, errorText, input, label, textarea } from "../../styles.js";

const EMPTY = {
  patient_name: "",
  species: "",
  subjective: "",
  objective: "",
  assessment: "",
  plan: "",
  visibility: "private",
};

export default function SoapCaseForm({ onCreate }) {
  const [fields, setFields] = useState(EMPTY);
  const [error, setError] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  function set(key) {
    return (e) => setFields((prev) => ({ ...prev, [key]: e.target.value }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      await onCreate(fields);
      setFields(EMPTY);
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} style={card}>
      <label style={label}>Paciente</label>
      <input style={input} value={fields.patient_name} onChange={set("patient_name")} />

      <label style={label}>Espécie</label>
      <input style={input} value={fields.species} onChange={set("species")} />

      <label style={label}>Subjective</label>
      <textarea style={textarea} value={fields.subjective} onChange={set("subjective")} />

      <label style={label}>Objective</label>
      <textarea style={textarea} value={fields.objective} onChange={set("objective")} />

      <label style={label}>Assessment</label>
      <textarea style={textarea} value={fields.assessment} onChange={set("assessment")} />

      <label style={label}>Plan</label>
      <textarea style={textarea} value={fields.plan} onChange={set("plan")} />

      <label style={label}>Visibilidade</label>
      <select style={input} value={fields.visibility} onChange={set("visibility")}>
        <option value="private">Privado (só eu)</option>
        <option value="shared">Partilhado com a rede</option>
      </select>

      {error && <p style={errorText}>{error}</p>}
      <button style={button} type="submit" disabled={submitting}>
        {submitting ? "A guardar…" : "Guardar caso"}
      </button>
    </form>
  );
}
