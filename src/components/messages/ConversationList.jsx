import { colors, mutedText } from "../../styles.js";

export default function ConversationList({ conversations, selectedId, onSelect }) {
  if (conversations.length === 0) {
    return <p style={mutedText}>Ainda sem conversas.</p>;
  }

  return (
    <div>
      {conversations.map((c) => {
        const title = c.participants.map((p) => p.full_name).join(", ") || "Conversa";
        return (
          <button
            key={c.id}
            onClick={() => onSelect(c.id)}
            style={{
              display: "block",
              width: "100%",
              textAlign: "left",
              border: "none",
              borderBottom: `1px solid ${colors.border}`,
              background: selectedId === c.id ? "#eef2f6" : "transparent",
              padding: "10px 8px",
              cursor: "pointer",
            }}
          >
            <div style={{ fontWeight: 600, color: colors.text, fontSize: 14 }}>{title}</div>
            <div style={{ ...mutedText, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
              {c.lastMessage?.content || "Sem mensagens"}
            </div>
          </button>
        );
      })}
    </div>
  );
}
