import type { CSSProperties, ReactNode } from "react";

type SectionName = "home" | "me" | "us" | "profile";

type ModalShellProps = {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  width?: string;
};

const modalBackdrop: CSSProperties = {
  position: "fixed",
  inset: 0,
  background: "rgba(16, 24, 40, 0.5)",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  padding: 20,
  zIndex: 20,
};

const modalCard: CSSProperties = {
  background: "#fff",
  borderRadius: 18,
  padding: 24,
  boxShadow: "0 28px 60px rgba(17, 24, 39, 0.25)",
};

const buttonStyle: CSSProperties = {
  padding: "10px 16px",
  border: "1px solid #8aa096",
  borderRadius: 6,
  cursor: "pointer",
  background: "#154d41",
  color: "#fff",
  fontFamily: "system-ui, sans-serif",
};

const secondaryButton: CSSProperties = {
  padding: "10px 16px",
  border: "1px solid #b9c6bf",
  borderRadius: 6,
  cursor: "pointer",
  background: "#ffffff",
  color: "#29473d",
  fontFamily: "system-ui, sans-serif",
};

export function ModalShell({ open, onClose, title, children, width = "min(760px, 100%)" }: ModalShellProps) {
  if (!open) return null;

  return (
    <div style={modalBackdrop} onClick={onClose}>
      <div
        style={{ ...modalCard, width, maxHeight: "90vh", overflowY: "auto" }}
        onClick={(event) => event.stopPropagation()}
      >
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
          <h2 style={{ margin: 0 }}>{title}</h2>
          <button onClick={onClose} style={secondaryButton}>Fechar</button>
        </div>
        {children}
      </div>
    </div>
  );
}

export function PlusButton({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <button
      aria-label={label}
      onClick={onClick}
      style={{
        ...buttonStyle,
        minWidth: "fit-content",
        width: 42,
        height: 42,
        padding: 0,
        borderRadius: "50%",
        fontSize: 28,
        lineHeight: 1,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      ＋
    </button>
  );
}

const navStyle: CSSProperties = {
  display: "flex",
  gap: 12,
  margin: "18px 0 16px",
  flexWrap: "wrap",
};

const tabStyle: CSSProperties = {
  flex: "1 1 180px",
  minHeight: 72,
  display: "flex",
  flexDirection: "column",
  justifyContent: "center",
  gap: 4,
  padding: "12px 14px",
  borderRadius: 12,
  border: "1px solid #d8dfdb",
  background: "#f8faf8",
  color: "#1f2d29",
  cursor: "pointer",
  textAlign: "left",
  fontFamily: "system-ui, sans-serif",
};

const activeTabStyle: CSSProperties = {
  ...tabStyle,
  background: "#eaf3ee",
  borderColor: "#a9c0b5",
};

export function SectionTabs({ section, onSelect }: { section: SectionName; onSelect: (value: SectionName) => void }) {
  const tabs: [SectionName, string, string][] = [
    ["home", "Home", "Visão geral"],
    ["me", "Eu", "Diário e objetivos"],
    ["us", "Nós", "Relações e mensagens"],
    ["profile", "Perfil", "Preferências"],
  ];

  return (
    <nav style={navStyle} aria-label="Seções principais">
      {tabs.map(([key, label, description]) => (
        <button
          key={key}
          onClick={() => onSelect(key)}
          style={section === key ? activeTabStyle : tabStyle}
        >
          <strong>{label}</strong>
          <small>{description}</small>
        </button>
      ))}
    </nav>
  );
}

const eyebrowStyle: CSSProperties = {
  fontSize: 11,
  letterSpacing: "0.18em",
  textTransform: "uppercase",
  color: "#5e7b72",
  fontWeight: 700,
};

export function SectionHeading({ section }: { section: SectionName }) {
  const labels: Record<SectionName, { eyebrow: string; title: string; description: string }> = {
    home: {
      eyebrow: "Visão geral",
      title: "Home",
      description: "Uma visão curta do que merece sua atenção agora.",
    },
    me: {
      eyebrow: "Eu",
      title: "Eu",
      description: "Registre experiências, acompanhe objetivos e cuide do seu ritmo.",
    },
    us: {
      eyebrow: "Nós",
      title: "Nós",
      description: "Conexões escolhidas por você, sem audiência pública.",
    },
    profile: {
      eyebrow: "Você",
      title: "Perfil",
      description: "Controle o que você compartilha e como usa seu tempo.",
    },
  };

  const current = labels[section];

  return (
    <div style={{ margin: "18px 0 12px" }}>
      <div>
        <span style={eyebrowStyle}>{current.eyebrow}</span>
        <h2 style={{ margin: "8px 0 0", fontSize: 32 }}>{current.title}</h2>
      </div>
      <p style={{ margin: "8px 0 0", color: "#445a54" }}>{current.description}</p>
    </div>
  );
}
