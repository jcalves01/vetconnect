import { useAuth } from "../../context/AuthContext.jsx";
import { buttonSecondary } from "../../styles.js";

export default function GoogleButton() {
  const { signInWithGoogle } = useAuth();

  return (
    <button
      type="button"
      style={{ ...buttonSecondary, width: "100%" }}
      onClick={() => signInWithGoogle().catch(() => {})}
    >
      Continuar com Google
    </button>
  );
}
