import { useState } from "react";
import { getComments, addComment } from "../../lib/db.js";
import { useAuth } from "../../context/AuthContext.jsx";
import CommentList from "./CommentList.jsx";
import CommentComposer from "./CommentComposer.jsx";
import { card, colors, mutedText } from "../../styles.js";

export default function PostCard({ post, onToggleLike, onCommentAdded }) {
  const { user } = useAuth();
  const [expanded, setExpanded] = useState(false);
  const [comments, setComments] = useState(null);

  async function handleExpand() {
    if (expanded) {
      setExpanded(false);
      return;
    }
    setExpanded(true);
    if (comments === null) {
      setComments(await getComments(post.id));
    }
  }

  async function handleAddComment(content) {
    const comment = await addComment(post.id, user.id, content);
    setComments((prev) => [...(prev || []), comment]);
    onCommentAdded(post.id);
  }

  return (
    <div style={card}>
      <div style={{ display: "flex", justifyContent: "space-between" }}>
        <div>
          <div style={{ fontWeight: 600, color: colors.text }}>
            {post.author?.full_name || "Utilizador"}
          </div>
          {post.author?.specialty && <div style={mutedText}>{post.author.specialty}</div>}
        </div>
        <div style={mutedText}>{new Date(post.created_at).toLocaleDateString()}</div>
      </div>

      <p style={{ color: colors.text, whiteSpace: "pre-wrap" }}>{post.content}</p>

      {post.image_url && (
        <img
          src={post.image_url}
          alt=""
          style={{ maxWidth: "100%", borderRadius: 8, marginBottom: 12 }}
        />
      )}

      <div style={{ display: "flex", gap: 16, ...mutedText }}>
        <button
          onClick={() => onToggleLike(post)}
          style={{
            border: "none",
            background: "none",
            cursor: "pointer",
            color: post.likedByMe ? colors.primary : colors.muted,
            fontWeight: 600,
            fontSize: 13,
          }}
        >
          👍 {post.likeCount}
        </button>
        <button
          onClick={handleExpand}
          style={{ border: "none", background: "none", cursor: "pointer", ...mutedText, fontSize: 13 }}
        >
          💬 {post.commentCount} comentário{post.commentCount === 1 ? "" : "s"}
        </button>
      </div>

      {expanded && (
        <div style={{ marginTop: 16, borderTop: `1px solid ${colors.border}`, paddingTop: 12 }}>
          {comments === null ? (
            <p style={mutedText}>A carregar comentários…</p>
          ) : (
            <CommentList comments={comments} />
          )}
          <div style={{ marginTop: 8 }}>
            <CommentComposer onSubmit={handleAddComment} />
          </div>
        </div>
      )}
    </div>
  );
}
