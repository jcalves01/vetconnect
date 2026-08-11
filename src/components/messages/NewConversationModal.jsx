import { useEffect, useState } from "react";
import { useAuth } from "../../context/AuthContext.jsx";
import { listProfiles } from "../../lib/db.js";
import { button, buttonSecondary, card, colors, input, mutedText } from "../../styles.js";

export default function NewConversationModal({ onCreate, onClose }) {
  const { user } = useAuth();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState([]);
  const [selectedIds, setSelectedIds] = useState([]);
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    listProfiles(query, { excludeUserId: user.id }).then(setResults);
  }, [query, user.id]);

  function toggle(id) {
    setSelectedIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  }

  async function handleCreate() {
    if (selectedIds.length === 0) return;
    setCreating(true);
    try {
      await onCreate(selectedIds);
    } finally {
      setCreating(false);
    }
  }

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(15,25,35,0.4)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 10,
      }}
      onClick={onClose}
    >
      <div style={{ ...card, width: 360, maxHeight: "70vh", overflowY: "auto" }} onClick={(e) => e.stopPropagation()}>
        <h3 style={{ marginTop: 0, color: colors.text }}>Nova conversa</h3>
        <input
          style={input}
          placeholder="Procurar colegas por nome…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
        <div style={{ marginBottom: 12 }}>
          {results.length === 0 ? (
            <p style={mutedText}>Sem resultados.</p>
          ) : (
            results.map((p) => (
              <label key={p.id} style={{ display: "flex", alignItems: "center", gap: 8, padding: "4px 0" }}>
                <input
                  type="checkbox"
                  checked={selectedIds.includes(p.id)}
                  onChange={() => toggle(p.id)}
                />
                <span style={{ color: colors.text }}>{p.full_name}</span>
              </label>
            ))
          )}
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <button style={button} onClick={handleCreate} disabled={creating || selectedIds.length === 0}>
            {creating ? "A criar…" : "Criar conversa"}
          </button>
          <button style={buttonSecondary} onClick={onClose} type="button">
            Cancelar
          </button>
        </div>
      </div>
    </div>
  );
}
