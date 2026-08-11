import { useState } from "react";
import { useAuth } from "../../context/AuthContext.jsx";
import { updateProfile } from "../../lib/db.js";
import { button, buttonSecondary, card, colors, errorText, input, label, mutedText, page, textarea } from "../../styles.js";

export default function Profile() {
  const { user, profile, refreshProfile, signOut } = useAuth();
  const [editing, setEditing] = useState(false);
  const [fields, setFields] = useState({
    full_name: profile?.full_name || "",
    specialty: profile?.specialty || "",
    location: profile?.location || "",
    bio: profile?.bio || "",
  });
  const [error, setError] = useState(null);
  const [saving, setSaving] = useState(false);

  function set(key) {
    return (e) => setFields((prev) => ({ ...prev, [key]: e.target.value }));
  }

  async function handleSave(e) {
    e.preventDefault();
    setError(null);
    setSaving(true);
    try {
      await updateProfile(user.id, fields);
      await refreshProfile();
      setEditing(false);
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  if (!profile) {
    return (
      <div style={page}>
        <p style={mutedText}>A carregar perfil…</p>
      </div>
    );
  }

  return (
    <div style={page}>
      <div style={card}>
        {editing ? (
          <form onSubmit={handleSave}>
            <label style={label}>Nome completo</label>
            <input style={input} value={fields.full_name} onChange={set("full_name")} />

            <label style={label}>Especialidade</label>
            <input style={input} value={fields.specialty} onChange={set("specialty")} />

            <label style={label}>Localização</label>
            <input style={input} value={fields.location} onChange={set("location")} />

            <label style={label}>Bio</label>
            <textarea style={textarea} value={fields.bio} onChange={set("bio")} />

            {error && <p style={errorText}>{error}</p>}
            <div style={{ display: "flex", gap: 8 }}>
              <button style={button} type="submit" disabled={saving}>
                {saving ? "A guardar…" : "Guardar"}
              </button>
              <button style={buttonSecondary} type="button" onClick={() => setEditing(false)}>
                Cancelar
              </button>
            </div>
          </form>
        ) : (
          <>
            <h2 style={{ margin: "0 0 4px", color: colors.text }}>
              {profile.full_name || "Sem nome"}
            </h2>
            {profile.specialty && <p style={mutedText}>{profile.specialty}</p>}
            {profile.location && <p style={mutedText}>{profile.location}</p>}
            {profile.bio && <p style={{ color: colors.text }}>{profile.bio}</p>}
            <p style={mutedText}>{user.email}</p>
            <div style={{ display: "flex", gap: 8 }}>
              <button style={button} onClick={() => setEditing(true)}>
                Editar perfil
              </button>
              <button style={buttonSecondary} onClick={() => signOut()}>
                Sair
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
