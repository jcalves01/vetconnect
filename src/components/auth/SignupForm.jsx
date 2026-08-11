import { useState } from "react";
import { useAuth } from "../../context/AuthContext.jsx";
import { button, errorText, input, label, mutedText } from "../../styles.js";

export default function SignupForm() {
  const { signUpWithPassword } = useAuth();
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [needsEmailConfirmation, setNeedsEmailConfirmation] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const { needsEmailConfirmation } = await signUpWithPassword(email, password, fullName);
      setNeedsEmailConfirmation(needsEmailConfirmation);
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  }

  if (needsEmailConfirmation) {
    return (
      <p style={mutedText}>
        Verifica o teu email ({email}) e clica no link de confirmação para
        poderes entrar.
      </p>
    );
  }

  return (
    <form onSubmit={handleSubmit}>
      <label style={label}>Nome completo</label>
      <input
        style={input}
        type="text"
        required
        value={fullName}
        onChange={(e) => setFullName(e.target.value)}
      />
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
        minLength={6}
        value={password}
        onChange={(e) => setPassword(e.target.value)}
      />
      {error && <p style={errorText}>{error}</p>}
      <button style={{ ...button, width: "100%" }} type="submit" disabled={submitting}>
        {submitting ? "A criar conta…" : "Criar conta"}
      </button>
    </form>
  );
}
