import { useCallback, useEffect, useState } from "react";
import { useAuth } from "../../context/AuthContext.jsx";
import { getPosts, createPost, toggleLike } from "../../lib/db.js";
import PostComposer from "./PostComposer.jsx";
import PostCard from "./PostCard.jsx";
import { errorText, mutedText, page } from "../../styles.js";

export default function Feed() {
  const { user } = useAuth();
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const loadPosts = useCallback(() => {
    return getPosts(user.id)
      .then(setPosts)
      .catch((err) => setError(err.message));
  }, [user.id]);

  useEffect(() => {
    loadPosts().finally(() => setLoading(false));
  }, [loadPosts]);

  async function handleCreate(content, imageUrl) {
    await createPost(user.id, content, imageUrl);
    await loadPosts();
  }

  function handleToggleLike(post) {
    setPosts((prev) =>
      prev.map((p) =>
        p.id === post.id
          ? { ...p, likedByMe: !p.likedByMe, likeCount: p.likeCount + (p.likedByMe ? -1 : 1) }
          : p
      )
    );
    toggleLike(post.id, user.id, post.likedByMe).catch(() => loadPosts());
  }

  function handleCommentAdded(postId) {
    setPosts((prev) =>
      prev.map((p) => (p.id === postId ? { ...p, commentCount: p.commentCount + 1 } : p))
    );
  }

  return (
    <div style={page}>
      <PostComposer onCreate={handleCreate} />
      {error && <p style={errorText}>{error}</p>}
      {loading ? (
        <p style={mutedText}>A carregar publicações…</p>
      ) : posts.length === 0 ? (
        <p style={mutedText}>Ainda não há publicações. Sê o primeiro a partilhar algo!</p>
      ) : (
        posts.map((post) => (
          <PostCard
            key={post.id}
            post={post}
            onToggleLike={handleToggleLike}
            onCommentAdded={handleCommentAdded}
          />
        ))
      )}
    </div>
  );
}
