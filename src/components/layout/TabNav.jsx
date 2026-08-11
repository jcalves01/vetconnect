import { colors } from "../../styles.js";

const TABS = [
  { id: "feed", label: "Feed" },
  { id: "messages", label: "Mensagens" },
  { id: "jobs", label: "Vagas" },
  { id: "soap", label: "Casos SOAP" },
  { id: "profile", label: "Perfil" },
];

export default function TabNav({ active, onChange }) {
  return (
    <nav
      style={{
        display: "flex",
        gap: 4,
        borderBottom: `1px solid ${colors.border}`,
        background: colors.card,
        padding: "0 16px",
        position: "sticky",
        top: 0,
        zIndex: 1,
      }}
    >
      {TABS.map((tab) => (
        <button
          key={tab.id}
          onClick={() => onChange(tab.id)}
          style={{
            border: "none",
            background: "none",
            padding: "14px 12px",
            fontSize: 14,
            fontWeight: 600,
            cursor: "pointer",
            color: active === tab.id ? colors.primary : colors.muted,
            borderBottom: active === tab.id ? `2px solid ${colors.primary}` : "2px solid transparent",
          }}
        >
          {tab.label}
        </button>
      ))}
    </nav>
  );
}
