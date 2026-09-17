import type { CSSProperties } from "react";
import { ModalShell } from "./ui";

type EntryFormModalProps = {
  open: boolean;
  onClose: () => void;
  active: boolean;
  editingEntryId: string | null;
  message: string;
  entryType: string;
  setEntryType: (value: string) => void;
  entryTitle: string;
  setEntryTitle: (value: string) => void;
  entryDate: string;
  setEntryDate: (value: string) => void;
  entryDurationMinutes: string;
  setEntryDurationMinutes: (value: string) => void;
  entryIntensity: string;
  setEntryIntensity: (value: string) => void;
  entryLocation: string;
  setEntryLocation: (value: string) => void;
  entrySubtype: string;
  setEntrySubtype: (value: string) => void;
  entryTags: string;
  setEntryTags: (value: string) => void;
  entryMood: string;
  setEntryMood: (value: string) => void;
  entryEnergy: string;
  setEntryEnergy: (value: string) => void;
  content: string;
  setContent: (value: string) => void;
  onSubmit: () => void;
  onCancel: () => void;
};

type GoalFormModalProps = {
  open: boolean;
  onClose: () => void;
  active: boolean;
  goalTitle: string;
  setGoalTitle: (value: string) => void;
  goalDueDate: string;
  setGoalDueDate: (value: string) => void;
  goalDescription: string;
  setGoalDescription: (value: string) => void;
  onSubmit: () => void;
};

type HabitFormModalProps = {
  open: boolean;
  onClose: () => void;
  active: boolean;
  habitTitle: string;
  setHabitTitle: (value: string) => void;
  habitTarget: string;
  setHabitTarget: (value: string) => void;
  onSubmit: () => void;
};

type ShareFormModalProps = {
  open: boolean;
  onClose: () => void;
  active: boolean;
  shareAudience: "person" | "people" | "group" | "connections";
  setShareAudience: (value: "person" | "people" | "group" | "connections") => void;
  shareRecipients: string[];
  setShareRecipients: (value: string[] | ((current: string[]) => string[])) => void;
  connections: Array<{ id: string; person: { id: string; name: string } }>;
  shareGroupId: string;
  setShareGroupId: (value: string) => void;
  shareContent: string;
  setShareContent: (value: string) => void;
  onSubmit: () => void;
};

const row: CSSProperties = {
  display: "flex",
  gap: 8,
  alignItems: "center",
  flexWrap: "wrap",
};

const input: CSSProperties = {
  flex: 1,
  minWidth: 180,
  padding: 10,
  border: "1px solid #ccd6d0",
  borderRadius: 6,
  font: "inherit",
};

const textarea: CSSProperties = {
  width: "100%",
  boxSizing: "border-box",
  minHeight: 120,
  padding: 10,
  border: "1px solid #ccd6d0",
  borderRadius: 6,
  font: "inherit",
  marginTop: 12,
};

const select: CSSProperties = {
  display: "block",
  width: "100%",
  boxSizing: "border-box",
  padding: 10,
  marginTop: 8,
  border: "1px solid #ccd6d0",
  borderRadius: 6,
  font: "inherit",
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

const secondary: CSSProperties = {
  padding: "10px 16px",
  border: "1px solid #b9c6bf",
  borderRadius: 6,
  cursor: "pointer",
  background: "#ffffff",
  color: "#29473d",
  fontFamily: "system-ui, sans-serif",
};

const fieldLabel: CSSProperties = {
  display: "block",
  marginBottom: 12,
  fontWeight: 650,
  fontFamily: "system-ui, sans-serif",
};

const shareList: CSSProperties = {
  display: "grid",
  gap: 8,
  margin: "12px 0",
};

const checkLabelRow: CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: 8,
  padding: "6px 0",
};

export function EntryFormModal({
  open,
  onClose,
  active,
  editingEntryId,
  message,
  entryType,
  setEntryType,
  entryTitle,
  setEntryTitle,
  entryDate,
  setEntryDate,
  entryDurationMinutes,
  setEntryDurationMinutes,
  entryIntensity,
  setEntryIntensity,
  entryLocation,
  setEntryLocation,
  entrySubtype,
  setEntrySubtype,
  entryTags,
  setEntryTags,
  entryMood,
  setEntryMood,
  entryEnergy,
  setEntryEnergy,
  content,
  setContent,
  onSubmit,
  onCancel
}: EntryFormModalProps) {
  return (
    <ModalShell open={open} onClose={onClose} title={editingEntryId ? "Editar registro" : "Novo registro"} width="min(760px, 100%)">
      <label style={fieldLabel}>
        Tipo
        <select value={entryType} onChange={(e) => setEntryType(e.target.value)} style={select}>
          <option value="note">Livre</option>
          <option value="activity">Atividade</option>
          <option value="exercise">Exercício</option>
          <option value="study">Estudo</option>
          <option value="reading">Leitura</option>
          <option value="work">Trabalho</option>
          <option value="project">Projeto</option>
          <option value="meeting">Encontro</option>
          <option value="travel">Viagem</option>
          <option value="important_event">Acontecimento importante</option>
          <option value="habit">Hábito</option>
          <option value="goal_achieved">Meta atingida</option>
          <option value="goal_missed">Meta não atingida</option>
          <option value="learning">Aprendizado</option>
        </select>
      </label>

      <input value={entryTitle} onChange={(e) => setEntryTitle(e.target.value)} placeholder="Título do registro" style={input} />

      <div style={row}>
        <input type="date" value={entryDate} onChange={(e) => setEntryDate(e.target.value)} style={{ ...input, flex: 1 }} />
        <input type="number" min={1} value={entryDurationMinutes} onChange={(e) => setEntryDurationMinutes(e.target.value)} placeholder="Duração (min)" style={{ ...input, flex: 1 }} />
      </div>

      <div style={row}>
        <input value={entryIntensity} onChange={(e) => setEntryIntensity(e.target.value)} placeholder="Intensidade" style={{ ...input, flex: 1 }} />
        <input value={entryLocation} onChange={(e) => setEntryLocation(e.target.value)} placeholder="Local" style={{ ...input, flex: 1 }} />
      </div>

      <div style={row}>
        <input value={entrySubtype} onChange={(e) => setEntrySubtype(e.target.value)} placeholder="Subtipo" style={{ ...input, flex: 1 }} />
        <input value={entryTags} onChange={(e) => setEntryTags(e.target.value)} placeholder="Tags separados por vírgula" style={{ ...input, flex: 2 }} />
      </div>

      <div style={row}>
        <input value={entryMood} onChange={(e) => setEntryMood(e.target.value)} placeholder="Humor" style={{ ...input, flex: 1 }} />
        <input value={entryEnergy} onChange={(e) => setEntryEnergy(e.target.value)} placeholder="Energia" style={{ ...input, flex: 1 }} />
      </div>

      <textarea
        rows={5}
        disabled={!active}
        value={content}
        onChange={(e) => setContent(e.target.value)}
        placeholder="Descreva o que aconteceu, o que aprendeu ou o que precisa registrar."
        style={textarea}
      />

      <div style={row}>
        <button disabled={!active} onClick={onSubmit} style={buttonStyle}>{editingEntryId ? "Salvar alterações" : "Registrar"}</button>
        {editingEntryId && <button onClick={onCancel} style={secondary}>Cancelar</button>}
      </div>

      {message && <p>{message}</p>}
    </ModalShell>
  );
}

export function GoalFormModal({
  open,
  onClose,
  active,
  goalTitle,
  setGoalTitle,
  goalDueDate,
  setGoalDueDate,
  goalDescription,
  setGoalDescription,
  onSubmit,
}: GoalFormModalProps) {
  return (
    <ModalShell open={open} onClose={onClose} title="Novo objetivo" width="min(560px, 100%)">
      <div style={row}>
        <input value={goalTitle} onChange={(e) => setGoalTitle(e.target.value)} placeholder="Novo objetivo" style={{ ...input, flex: 1 }} />
        <input type="date" value={goalDueDate} onChange={(e) => setGoalDueDate(e.target.value)} style={{ ...input, flex: 1 }} />
      </div>
      <textarea value={goalDescription} onChange={(e) => setGoalDescription(e.target.value)} placeholder="Por que isso importa ou como pretende avançar?" rows={3} style={textarea} />
      <button disabled={!active} onClick={onSubmit} style={buttonStyle}>Criar objetivo</button>
    </ModalShell>
  );
}

export function HabitFormModal({ open, onClose, active, habitTitle, setHabitTitle, habitTarget, setHabitTarget, onSubmit }: HabitFormModalProps) {
  return (
    <ModalShell open={open} onClose={onClose} title="Novo hábito" width="min(560px, 100%)">
      <div style={row}>
        <input value={habitTitle} onChange={(e) => setHabitTitle(e.target.value)} placeholder="Novo hábito" style={{ ...input, flex: 2 }} />
        <input type="number" min={1} max={7} value={habitTarget} onChange={(e) => setHabitTarget(e.target.value)} aria-label="Frequência semanal" style={{ ...input, flex: 1, maxWidth: 120 }} />
      </div>
      <button disabled={!active} onClick={onSubmit} style={buttonStyle}>Criar hábito</button>
    </ModalShell>
  );
}

export function ShareFormModal({
  open,
  onClose,
  active,
  shareAudience,
  setShareAudience,
  shareRecipients,
  setShareRecipients,
  connections,
  shareGroupId,
  setShareGroupId,
  shareContent,
  setShareContent,
  onSubmit,
}: ShareFormModalProps) {
  return (
    <ModalShell open={open} onClose={onClose} title="Novo compartilhamento" width="min(620px, 100%)">
      <label style={fieldLabel}>
        Público
        <select
          value={shareAudience}
          onChange={(e) => {
            const next = e.target.value as "person" | "people" | "group" | "connections";
            setShareAudience(next);
            if (next === "person") setShareRecipients([]);
            if (next !== "people" && next !== "connections") setShareRecipients([]);
          }}
          style={select}
        >
          <option value="person">Uma pessoa</option>
          <option value="people">Várias pessoas</option>
          <option value="connections">Minha lista privada de conexões</option>
          <option value="group">Um grupo</option>
        </select>
      </label>

      {shareAudience === "group" ? (
        <label style={fieldLabel}>
          ID do grupo
          <input value={shareGroupId} onChange={(e) => setShareGroupId(e.target.value)} placeholder="Grupo opcional" style={input} />
        </label>
      ) : (
        <div style={shareList}>
          {connections.length === 0 && <p>Você precisa aceitar conexões para compartilhar com outras pessoas.</p>}
          {connections.map((connection) => {
            const selected = shareRecipients.includes(connection.person.id);
            return (
              <label key={connection.id} style={checkLabelRow}>
                <input
                  type={shareAudience === "person" ? "radio" : "checkbox"}
                  checked={selected}
                  onChange={() => {
                    if (shareAudience === "person") {
                      setShareRecipients([connection.person.id]);
                      return;
                    }
                    setShareRecipients((current) =>
                      current.includes(connection.person.id)
                        ? current.filter((id) => id !== connection.person.id)
                        : [...current, connection.person.id]
                    );
                  }}
                />
                <span>{connection.person.name}</span>
              </label>
            );
          })}
        </div>
      )}

      <textarea
        rows={4}
        disabled={!active}
        value={shareContent}
        onChange={(e) => setShareContent(e.target.value)}
        placeholder="O que você quer compartilhar com o público escolhido?"
        style={textarea}
      />
      <button disabled={!active} onClick={onSubmit} style={buttonStyle}>Enviar compartilhamento</button>
    </ModalShell>
  );
}
