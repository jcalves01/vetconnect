import { useState } from "react";
import { button, input } from "../../styles.js";

export default function MessageComposer({ onSend }) {
  const [content, setContent] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    if (!content.trim()) return;
    setSubmitting(true);
    try {
      await onSend(content.trim());
      setContent("");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} style={{ display: "flex", gap: 8 }}>
      <input
        style={{ ...input, marginBottom: 0 }}
        placeholder="Escreve uma mensagem…"
        value={content}
        onChange={(e) => setContent(e.target.value)}
      />
      <button style={button} type="submit" disabled={submitting || !content.trim()}>
        Enviar
      </button>
    </form>
  );
}
