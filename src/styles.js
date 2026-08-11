/* ============================================================================
   src/styles.js — SHARED INLINE STYLE PRIMITIVES
   ----------------------------------------------------------------------------
   The app styles itself inline (see index.css) rather than via a CSS
   framework. These are just the handful of repeated primitives (card,
   input, button, page) factored out so every new component isn't
   redeclaring the same object.
   ============================================================================ */

export const colors = {
  bg: "#f5f7fa",
  card: "#ffffff",
  border: "#e2e8f0",
  text: "#0F1923",
  muted: "#5a6b7b",
  primary: "#2563eb",
  primaryText: "#ffffff",
  danger: "#dc2626",
};

export const page = {
  maxWidth: 640,
  margin: "0 auto",
  padding: "24px 16px 80px",
  color: colors.text,
};

export const card = {
  background: colors.card,
  border: `1px solid ${colors.border}`,
  borderRadius: 12,
  padding: 20,
  marginBottom: 16,
};

export const input = {
  width: "100%",
  padding: "8px 10px",
  borderRadius: 8,
  border: `1px solid ${colors.border}`,
  fontSize: 14,
  fontFamily: "inherit",
  marginBottom: 12,
};

export const textarea = {
  ...input,
  resize: "vertical",
  minHeight: 70,
};

export const label = {
  display: "block",
  fontSize: 13,
  fontWeight: 600,
  color: colors.muted,
  marginBottom: 4,
};

export const button = {
  padding: "8px 16px",
  borderRadius: 8,
  border: "none",
  background: colors.primary,
  color: colors.primaryText,
  fontSize: 14,
  fontWeight: 600,
  cursor: "pointer",
};

export const buttonSecondary = {
  ...button,
  background: "#eef2f6",
  color: colors.text,
};

export const buttonSmall = {
  ...button,
  padding: "4px 10px",
  fontSize: 13,
};

export const errorText = {
  color: colors.danger,
  fontSize: 13,
  marginBottom: 12,
};

export const mutedText = {
  color: colors.muted,
  fontSize: 13,
};
