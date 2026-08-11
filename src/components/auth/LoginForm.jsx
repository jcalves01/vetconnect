import { useState } from "react";
import { useAuth } from "../../context/AuthContext.jsx";
import { button, errorText, input, label } from "../../styles.js";

export default function LoginForm() {
  const { signInWithPassword } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      await signInWithPassword(email, password);
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit}>
      <label style={label}>Email</label>
      <input
        style={input}
        type="email"
        required
        value={email}
        onChange={(e) => setEmail(e.target.value)}
      />
      <label style={label}>Password</label>
      <input
        style={input}
        type="password"
        required
        value={password}
        onChange={(e) => setPassword(e.target.value)}
      />
      {error && <p style={errorText}>{error}</p>}
      <button style={{ ...button, width: "100%" }} type="submit" disabled={submitting}>
        {submitting ? "A entrar…" : "Entrar"}
      </button>
    </form>
  );
}
