import { useState } from "react";
import { button, card, errorText, input, label, textarea } from "../../styles.js";

const EMPTY = {
  title: "",
  employer_name: "",
  location: "",
  salary_range: "",
  contact_info: "",
  description: "",
};

export default function JobForm({ onCreate }) {
  const [fields, setFields] = useState(EMPTY);
  const [error, setError] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  function set(key) {
    return (e) => setFields((prev) => ({ ...prev, [key]: e.target.value }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (!fields.title.trim()) return;
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
      <label style={label}>Título</label>
      <input style={input} required value={fields.title} onChange={set("title")} />

      <label style={label}>Clínica/Empresa</label>
      <input style={input} value={fields.employer_name} onChange={set("employer_name")} />

      <label style={label}>Localização</label>
      <input style={input} value={fields.location} onChange={set("location")} />

      <label style={label}>Remuneração</label>
      <input style={input} value={fields.salary_range} onChange={set("salary_range")} />

      <label style={label}>Contacto</label>
      <input style={input} value={fields.contact_info} onChange={set("contact_info")} />

      <label style={label}>Descrição</label>
      <textarea style={textarea} value={fields.description} onChange={set("description")} />

      {error && <p style={errorText}>{error}</p>}
      <button style={button} type="submit" disabled={submitting || !fields.title.trim()}>
        {submitting ? "A publicar…" : "Publicar vaga"}
      </button>
    </form>
  );
}
