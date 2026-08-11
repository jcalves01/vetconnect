import { useCallback, useEffect, useState } from "react";
import { useAuth } from "../../context/AuthContext.jsx";
import { getMessages, sendMessage } from "../../lib/db.js";
import MessageComposer from "./MessageComposer.jsx";
import { buttonSecondary, colors, mutedText } from "../../styles.js";

export default function MessageThread({ conversation }) {
  const { user } = useAuth();
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);

  const loadMessages = useCallback(() => {
    return getMessages(conversation.id).then(setMessages);
  }, [conversation.id]);

  useEffect(() => {
    setLoading(true);
    loadMessages().finally(() => setLoading(false));
  }, [loadMessages]);

  async function handleSend(content) {
    await sendMessage(conversation.id, user.id, content);
    await loadMessages();
  }

  const title = conversation.participants.map((p) => p.full_name).join(", ") || "Conversa";

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%" }}>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          borderBottom: `1px solid ${colors.border}`,
          paddingBottom: 8,
          marginBottom: 12,
        }}
      >
        <strong style={{ color: colors.text }}>{title}</strong>
        <button style={buttonSecondary} onClick={() => loadMessages()}>
          Atualizar
        </button>
      </div>

      <div style={{ flex: 1, overflowY: "auto", marginBottom: 12 }}>
        {loading ? (
          <p style={mutedText}>A carregar mensagens…</p>
        ) : messages.length === 0 ? (
          <p style={mutedText}>Ainda sem mensagens. Diz olá!</p>
        ) : (
          messages.map((m) => {
            const isMe = m.sender_id === user.id;
            return (
              <div key={m.id} style={{ marginBottom: 10, textAlign: isMe ? "right" : "left" }}>
                <div style={mutedText}>{isMe ? "Tu" : m.sender?.full_name || "Utilizador"}</div>
                <div
                  style={{
                    display: "inline-block",
                    background: isMe ? colors.primary : "#eef2f6",
                    color: isMe ? colors.primaryText : colors.text,
                    borderRadius: 12,
                    padding: "6px 12px",
                    maxWidth: "80%",
                  }}
                >
                  {m.content}
                </div>
              </div>
            );
          })
        )}
      </div>

      <MessageComposer onSend={handleSend} />
    </div>
  );
}
