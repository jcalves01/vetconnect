import { useState } from "react";
import { buttonSmall, input } from "../../styles.js";

export default function CommentComposer({ onSubmit }) {
  const [content, setContent] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    if (!content.trim()) return;
    setSubmitting(true);
    try {
      await onSubmit(content.trim());
      setContent("");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} style={{ display: "flex", gap: 8 }}>
      <input
        style={{ ...input, marginBottom: 0 }}
        placeholder="Escreve um comentário…"
        value={content}
        onChange={(e) => setContent(e.target.value)}
      />
      <button style={buttonSmall} type="submit" disabled={submitting || !content.trim()}>
        Enviar
      </button>
    </form>
  );
}
