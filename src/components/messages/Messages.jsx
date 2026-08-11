import { useCallback, useEffect, useState } from "react";
import { useAuth } from "../../context/AuthContext.jsx";
import { listConversations, createConversation } from "../../lib/db.js";
import ConversationList from "./ConversationList.jsx";
import MessageThread from "./MessageThread.jsx";
import NewConversationModal from "./NewConversationModal.jsx";
import { button, colors, mutedText } from "../../styles.js";

export default function Messages() {
  const { user } = useAuth();
  const [conversations, setConversations] = useState([]);
  const [selectedId, setSelectedId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showNewModal, setShowNewModal] = useState(false);

  const loadConversations = useCallback(() => {
    return listConversations(user.id).then(setConversations);
  }, [user.id]);

  useEffect(() => {
    loadConversations().finally(() => setLoading(false));
  }, [loadConversations]);

  async function handleCreateConversation(participantIds) {
    const conversation = await createConversation(user.id, participantIds);
    await loadConversations();
    setSelectedId(conversation.id);
    setShowNewModal(false);
  }

  const selected = conversations.find((c) => c.id === selectedId);

  return (
    <div style={{ display: "flex", height: "calc(100vh - 49px)", maxWidth: 960, margin: "0 auto" }}>
      <div style={{ width: 280, borderRight: `1px solid ${colors.border}`, padding: 16, overflowY: "auto" }}>
        <button style={{ ...button, width: "100%", marginBottom: 12 }} onClick={() => setShowNewModal(true)}>
          Nova conversa
        </button>
        {loading ? (
          <p style={mutedText}>A carregar conversas…</p>
        ) : (
          <ConversationList conversations={conversations} selectedId={selectedId} onSelect={setSelectedId} />
        )}
      </div>

      <div style={{ flex: 1, padding: 16 }}>
        {selected ? (
          <MessageThread conversation={selected} />
        ) : (
          <p style={mutedText}>Seleciona uma conversa ou cria uma nova.</p>
        )}
      </div>

      {showNewModal && (
        <NewConversationModal onCreate={handleCreateConversation} onClose={() => setShowNewModal(false)} />
      )}
    </div>
  );
}
