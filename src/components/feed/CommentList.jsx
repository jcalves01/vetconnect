import { colors, mutedText } from "../../styles.js";

export default function CommentList({ comments }) {
  if (comments.length === 0) {
    return <p style={mutedText}>Ainda sem comentários.</p>;
  }

  return (
    <div>
      {comments.map((c) => (
        <div key={c.id} style={{ marginBottom: 10 }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: colors.text }}>
            {c.author?.full_name || "Utilizador"}
          </div>
          <div style={{ fontSize: 14, color: colors.text }}>{c.content}</div>
        </div>
      ))}
    </div>
  );
}
