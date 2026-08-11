import { useState } from "react";
import { button, card, errorText, input, textarea } from "../../styles.js";

export default function PostComposer({ onCreate }) {
  const [content, setContent] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [error, setError] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    if (!content.trim()) return;
    setError(null);
    setSubmitting(true);
    try {
      await onCreate(content.trim(), imageUrl.trim());
      setContent("");
      setImageUrl("");
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} style={card}>
      <textarea
        style={textarea}
        placeholder="Partilha algo com a rede…"
        value={content}
        onChange={(e) => setContent(e.target.value)}
      />
      <input
        style={input}
        type="url"
        placeholder="URL de imagem (opcional)"
        value={imageUrl}
        onChange={(e) => setImageUrl(e.target.value)}
      />
      {error && <p style={errorText}>{error}</p>}
      <button style={button} type="submit" disabled={submitting || !content.trim()}>
        {submitting ? "A publicar…" : "Publicar"}
      </button>
    </form>
  );
}
