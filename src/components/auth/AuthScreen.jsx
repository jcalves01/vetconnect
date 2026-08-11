import { useState } from "react";
import { useAuth } from "../../context/AuthContext.jsx";
import LoginForm from "./LoginForm.jsx";
import SignupForm from "./SignupForm.jsx";
import GoogleButton from "./GoogleButton.jsx";
import { card, colors, errorText, mutedText } from "../../styles.js";

export default function AuthScreen() {
  const { authError } = useAuth();
  const [mode, setMode] = useState("login"); // "login" | "signup"

  return (
    <div style={{ maxWidth: 420, margin: "10vh auto", padding: "0 16px" }}>
      <div style={{ textAlign: "center", marginBottom: 24 }}>
        <div style={{ fontSize: 34 }}>🐾</div>
        <h1 style={{ margin: "8px 0 0", color: colors.text }}>VetConnect</h1>
        <p style={mutedText}>A rede profissional dos veterinários.</p>
      </div>

      <div style={card}>
        {mode === "login" ? <LoginForm /> : <SignupForm />}

        <div style={{ margin: "16px 0", textAlign: "center", ...mutedText }}>ou</div>

        <GoogleButton />
        {authError && <p style={{ ...errorText, textAlign: "center", marginTop: 12, marginBottom: 0 }}>{authError}</p>}

        <p style={{ ...mutedText, textAlign: "center", marginTop: 16, marginBottom: 0 }}>
          {mode === "login" ? (
            <>
              Ainda não tens conta?{" "}
              <a href="#" onClick={(e) => { e.preventDefault(); setMode("signup"); }}>
                Cria uma
              </a>
            </>
          ) : (
            <>
              Já tens conta?{" "}
              <a href="#" onClick={(e) => { e.preventDefault(); setMode("login"); }}>
                Entra
              </a>
            </>
          )}
        </p>
      </div>
    </div>
  );
}
