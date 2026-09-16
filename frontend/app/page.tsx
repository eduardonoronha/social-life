"use client";

import { useCallback, useEffect, useRef, useState } from "react";

const API = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

type Usage = {
  daily_used_seconds: number;
  weekly_used_seconds: number;
  daily_limit_seconds: number;
  weekly_limit_seconds: number;
  daily_remaining_seconds: number;
  weekly_remaining_seconds: number;
  active_session_id: string | null;
  active_hard_stop_at: string | null;
};

type Entry = {
  id: string;
  entry_type: string;
  title: string | null;
  content: string;
  date: string | null;
  duration_minutes: number | null;
  intensity: string | null;
  location: string | null;
  structured_data: {
    schema_version?: number;
    type?: string;
    subtype?: string;
    intensity?: string;
    tags?: string[];
    mood?: string;
    energy?: string;
    people?: string[];
    context?: string;
    extras?: Record<string, string>;
  };
  created_at: string;
};

type Goal = {
  id: string;
  title: string;
  description: string | null;
  reason: string | null;
  due_date: string | null;
  metric: string | null;
  progress: number;
  status: "active" | "completed" | "paused" | "cancelled";
  notes: string | null;
  created_at: string;
  updated_at: string;
};

type Habit = {
  id: string;
  title: string;
  description: string | null;
  target_per_week: number;
  active: boolean;
  created_at: string;
  checkins: { id: string; checked_on: string; note: string | null }[];
};

type Person = {
  id: string;
  name: string;
  bio: string | null;
  city: string | null;
  interests: string[];
};

type Relationship = {
  id: string;
  status: string;
  person: Person;
  category: string | null;
};

type SharedMoment = {
  id: string;
  owner_id: string;
  owner_name: string | null;
  content: string;
  audience: string;
  shared_with_id: string | null;
  shared_with_ids: string[];
  group_id: string | null;
  created_at: string;
};

type PrivateMessage = {
  id: string;
  sender_id: string;
  sender_name: string | null;
  recipient_id: string;
  recipient_name: string | null;
  content: string;
  reply_to_id: string | null;
  attachment_ids: string[];
  reactions: Record<string, string>;
  created_at: string;
};

type Profile = {
  id: string;
  name: string;
  bio: string | null;
  city: string | null;
  interests: string[];
  profile_visible: boolean;
};

type ShareAudience = "person" | "people" | "group" | "connections";

function fmt(s: number) {
  return `${Math.floor(s / 60)}m ${s % 60}s`;
}

function errorMessage(detail: unknown, fallback: string) {
  return typeof detail === "string" ? detail : fallback;
}

export default function Home() {
  const [token, setToken] = useState("");
  const [authMode, setAuthMode] = useState<"login" | "register">("login");
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [password, setPassword] = useState("");
  const [authMessage, setAuthMessage] = useState("");
  const [usage, setUsage] = useState<Usage | null>(null);
  const [entries, setEntries] = useState<Entry[]>([]);
  const [entryFilter, setEntryFilter] = useState("all");
  const [entryType, setEntryType] = useState("note");
  const [entryTitle, setEntryTitle] = useState("");
  const [entryDate, setEntryDate] = useState("");
  const [entryDurationMinutes, setEntryDurationMinutes] = useState("");
  const [entryIntensity, setEntryIntensity] = useState("");
  const [entrySubtype, setEntrySubtype] = useState("");
  const [entryTags, setEntryTags] = useState("");
  const [entryMood, setEntryMood] = useState("");
  const [entryEnergy, setEntryEnergy] = useState("");
  const [entryLocation, setEntryLocation] = useState("");
  const [content, setContent] = useState("");
  const [editingEntryId, setEditingEntryId] = useState<string | null>(null);
  const [retrospective, setRetrospective] = useState<{ days: number; total_entries: number; by_type: Record<string, number>; entries: Entry[] } | null>(null);
  const [goals, setGoals] = useState<Goal[]>([]);
  const [habits, setHabits] = useState<Habit[]>([]);
  const [goalTitle, setGoalTitle] = useState("");
  const [goalDescription, setGoalDescription] = useState("");
  const [goalDueDate, setGoalDueDate] = useState("");
  const [habitTitle, setHabitTitle] = useState("");
  const [habitTarget, setHabitTarget] = useState("1");
  const [message, setMessage] = useState("");
  const [peopleQuery, setPeopleQuery] = useState("");
  const [people, setPeople] = useState<Person[]>([]);
  const [connections, setConnections] = useState<Relationship[]>([]);
  const [requests, setRequests] = useState<Relationship[]>([]);
  const [sharedMoments, setSharedMoments] = useState<SharedMoment[]>([]);
  const [receivedMessages, setReceivedMessages] = useState<PrivateMessage[]>([]);
  const [activeConversationId, setActiveConversationId] = useState("");
  const [conversationMessages, setConversationMessages] = useState<PrivateMessage[]>([]);
  const [messageContent, setMessageContent] = useState("");
  const [replyToMessage, setReplyToMessage] = useState<PrivateMessage | null>(null);
  const [messageFiles, setMessageFiles] = useState<File[]>([]);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [shareContent, setShareContent] = useState("");
  const [shareAudience, setShareAudience] = useState<ShareAudience>("person");
  const [shareRecipients, setShareRecipients] = useState<string[]>([]);
  const [shareGroupId, setShareGroupId] = useState("");
  const heartbeat = useRef<ReturnType<typeof setInterval> | null>(null);

  const api = useCallback(async (path: string, init: RequestInit = {}) => {
    const isMultipart = typeof FormData !== "undefined" && init.body instanceof FormData;
    return fetch(`${API}${path}`, {
      ...init,
      headers: {
        ...(!isMultipart ? { "Content-Type": "application/json" } : {}),
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...(init.headers ?? {}),
      },
    });
  }, [token]);

  const refreshUsage = useCallback(async () => {
    if (!token) return null;

    const response = await api("/usage/heartbeat", { method: "POST" });

    if (!response.ok) return null;

    const data = await response.json();
    setUsage(data);
    return data as Usage;
  }, [api, token]);

  const stop = useCallback(async () => {
    if (!token) return;

    await api("/usage/stop", { method: "POST" });

    if (heartbeat.current) {
      clearInterval(heartbeat.current);
      heartbeat.current = null;
    }

    await refreshUsage();
  }, [api, refreshUsage, token]);

  const start = useCallback(async () => {
    if (!token) return false;

    const response = await api("/usage/start", { method: "POST" });
    const data = await response.json();

    if (!response.ok) {
      setMessage(errorMessage(data.detail, "Não foi possível iniciar a sessão."));
      await refreshUsage();
      return false;
    }

    setMessage("");
    await refreshUsage();

    if (heartbeat.current) clearInterval(heartbeat.current);

    heartbeat.current = setInterval(async () => {
      const current = await refreshUsage();

      if (!current?.active_session_id) {
        if (heartbeat.current) {
          clearInterval(heartbeat.current);
          heartbeat.current = null;
        }

        setMessage(
          "O limite foi atingido. A sessão foi encerrada pelo servidor."
        );
      }
    }, 10000);

    return true;
  }, [api, refreshUsage, token]);

  const loadEntries = useCallback(async (selectedType: string = entryFilter) => {
    if (!token) return;

    const response = await api(selectedType === "all" ? "/life/entries" : `/life/entries?entry_type=${encodeURIComponent(selectedType)}`);
    if (response.ok) {
      setEntries(await response.json());
    }
  }, [api, entryFilter, token]);

  const loadRetrospective = useCallback(async () => {
    if (!token) return;

    const response = await api("/life/retrospective?days=30");
    if (response.ok) {
      setRetrospective(await response.json());
    }
  }, [api, token]);

  const loadPersonal = useCallback(async () => {
    if (!token) return;
    const [goalsResponse, habitsResponse] = await Promise.all([
      api("/personal/goals"),
      api("/personal/habits"),
    ]);
    if (goalsResponse.ok) setGoals(await goalsResponse.json());
    if (habitsResponse.ok) setHabits(await habitsResponse.json());
  }, [api, token]);

  const loadSocial = useCallback(async () => {
    if (!token) return;
    const [connectionsResponse, requestsResponse] = await Promise.all([
      api("/social/connections"),
      api("/social/connections/requests"),
    ]);
    if (connectionsResponse.ok) setConnections(await connectionsResponse.json());
    if (requestsResponse.ok) setRequests(await requestsResponse.json());
  }, [api, token]);

  const loadIncomingMoments = useCallback(async () => {
    if (!token) return;
    const response = await api("/social/moments/inbox");
    if (response.ok) setSharedMoments(await response.json());
  }, [api, token]);

  const loadReceivedMessages = useCallback(async () => {
    if (!token) return;
    const response = await api("/social/messages/inbox");
    if (response.ok) setReceivedMessages(await response.json());
  }, [api, token]);

  const loadConversation = useCallback(async (personId: string) => {
    if (!token || !personId) return;
    const response = await api(`/social/messages/${personId}`);
    if (response.ok) setConversationMessages(await response.json());
  }, [api, token]);

  const loadProfile = useCallback(async () => {
    if (!token) return;
    const response = await api("/profile");
    if (response.ok) setProfile(await response.json());
  }, [api, token]);

  async function authenticate() {
    const path = authMode === "register" ? "/auth/register" : "/auth/login";
    const body = authMode === "register" ? { email, name, password } : { email, password };
    const response = await api(path, { method: "POST", body: JSON.stringify(body) });
    const data = await response.json();
    if (!response.ok) {
      setAuthMessage(errorMessage(data.detail, "Não foi possível entrar."));
      return;
    }
    setToken(data.access_token);
    setAuthMessage("");
  }

  async function saveProfile() {
    if (!profile) return;
    const response = await api("/profile", {
      method: "PUT",
      body: JSON.stringify(profile),
    });
    const data = await response.json();
    if (response.ok) {
      setProfile(data);
      setMessage("Perfil atualizado.");
    } else {
      setMessage(errorMessage(data.detail, "Não foi possível atualizar o perfil."));
    }
  }

  async function searchPeople() {
    const query = peopleQuery.trim();
    if (!query) return setPeople([]);
    if (!usage?.active_session_id && !(await start())) return;
    const response = await api(`/social/people?query=${encodeURIComponent(query)}`);
    const data = await response.json();
    if (response.ok) {
      setPeople(data);
    } else {
      setMessage(errorMessage(data.detail, "Não foi possível buscar pessoas."));
    }
  }

  async function requestConnection(person: Person) {
    const response = await api("/social/connections", {
      method: "POST",
      body: JSON.stringify({ addressee_id: person.id }),
    });
    const data = await response.json();
    setMessage(response.ok ? `Convite enviado para ${person.name}.` : errorMessage(data.detail, "Não foi possível enviar o convite."));
  }

  async function decideRequest(connection: Relationship, action: "accept" | "decline") {
    const response = await api(`/social/connections/${connection.id}/${action}`, { method: "POST" });
    const data = await response.json();
    setMessage(response.ok ? (action === "accept" ? `Conexão com ${connection.person.name} aceita.` : "Solicitação recusada.") : errorMessage(data.detail, "Não foi possível atualizar a solicitação."));
    if (response.ok) await loadSocial();
  }

  async function updateCategory(connection: Relationship, category: string) {
    const response = await api(`/social/connections/${connection.id}/category`, {
      method: "PUT",
      body: JSON.stringify({ category: category || null }),
    });
    if (response.ok) await loadSocial();
  }

  async function removeConnection(connection: Relationship) {
    const response = await api(`/social/connections/${connection.id}`, { method: "DELETE" });
    if (response.ok) {
      setMessage(`Conexão com ${connection.person.name} desfeita.`);
      await loadSocial();
    }
  }

  async function addEntry() {
    const value = content.trim();
    const title = entryTitle.trim();
    if (!value && !title) {
      setMessage("Escreva algo ou dê um título ao registro.");
      return;
    }

    const payload = {
      entry_type: entryType,
      title: title || null,
      content: value || null,
      date: entryDate || null,
      duration_minutes: entryDurationMinutes ? Number(entryDurationMinutes) : null,
      intensity: entryIntensity || null,
      location: entryLocation || null,
      structured_data: {
        type: entryType,
        subtype: entrySubtype.trim() || null,
        intensity: entryIntensity.trim() || null,
        tags: entryTags.split(",").map((tag) => tag.trim()).filter(Boolean),
        mood: entryMood.trim() || null,
        energy: entryEnergy.trim() || null,
      },
    };

    const response = await api(
      editingEntryId ? `/life/entries/${editingEntryId}` : "/life/entries",
      {
        method: editingEntryId ? "PUT" : "POST",
        body: JSON.stringify(payload),
      }
    );

    const data = await response.json();

    if (!response.ok) {
      setMessage(errorMessage(data.detail, "Não foi possível salvar o registro."));
      return;
    }

    setEntryType("note");
    setEntryTitle("");
    setEntryDate("");
    setEntryDurationMinutes("");
    setEntryIntensity("");
    setEntrySubtype("");
    setEntryTags("");
    setEntryMood("");
    setEntryEnergy("");
    setEntryLocation("");
    setContent("");
    setEditingEntryId(null);
    setMessage(editingEntryId ? "Registro atualizado." : "Registro salvo.");
    await loadEntries(entryFilter);
    await loadRetrospective();
  }

  async function createGoal() {
    if (!goalTitle.trim()) return;
    const response = await api("/personal/goals", {
      method: "POST",
      body: JSON.stringify({
        title: goalTitle.trim(),
        description: goalDescription.trim() || null,
        due_date: goalDueDate || null,
      }),
    });
    if (!response.ok) {
      const data = await response.json();
      setMessage(errorMessage(data.detail, "Não foi possível criar o objetivo."));
      return;
    }
    setGoalTitle("");
    setGoalDescription("");
    setGoalDueDate("");
    await loadPersonal();
  }

  async function updateGoal(goal: Goal, updates: Partial<Goal>) {
    const response = await api(`/personal/goals/${goal.id}`, {
      method: "PUT",
      body: JSON.stringify(updates),
    });
    if (response.ok) await loadPersonal();
  }

  async function createHabit() {
    if (!habitTitle.trim()) return;
    const response = await api("/personal/habits", {
      method: "POST",
      body: JSON.stringify({ title: habitTitle.trim(), target_per_week: Number(habitTarget) }),
    });
    if (!response.ok) {
      const data = await response.json();
      setMessage(errorMessage(data.detail, "Não foi possível criar o hábito."));
      return;
    }
    setHabitTitle("");
    await loadPersonal();
  }

  async function checkinHabit(habit: Habit) {
    const response = await api(`/personal/habits/${habit.id}/checkins`, {
      method: "POST",
      body: JSON.stringify({}),
    });
    if (response.ok) await loadPersonal();
  }

  function startEditingEntry(entry: Entry) {
    setEditingEntryId(entry.id);
    setEntryType(entry.entry_type || "note");
    setEntryTitle(entry.title ?? "");
    setEntryDate(entry.date ?? "");
    setEntryDurationMinutes(entry.duration_minutes ? String(entry.duration_minutes) : "");
    setEntryIntensity(entry.intensity ?? "");
    setEntrySubtype(entry.structured_data.subtype ?? "");
    setEntryTags(entry.structured_data.tags?.join(", ") ?? "");
    setEntryMood(entry.structured_data.mood ?? "");
    setEntryEnergy(entry.structured_data.energy ?? "");
    setEntryLocation(entry.location ?? "");
    setContent(entry.content ?? "");
    setMessage("Editando registro.");
  }

  function cancelEditingEntry() {
    setEditingEntryId(null);
    setEntryType("note");
    setEntryTitle("");
    setEntryDate("");
    setEntryDurationMinutes("");
    setEntryIntensity("");
    setEntrySubtype("");
    setEntryTags("");
    setEntryMood("");
    setEntryEnergy("");
    setEntryLocation("");
    setContent("");
    setMessage("");
  }

  async function shareMoment() {
    const value = shareContent.trim();
    if (!value) {
      setMessage("Escreva algo para compartilhar.");
      return;
    }

    const payload: Record<string, unknown> = {
      content: value,
      audience: shareAudience,
    };

    if (shareAudience === "person") {
      if (shareRecipients.length !== 1) {
        setMessage("Selecione uma pessoa para compartilhar com uma pessoa.");
        return;
      }
      payload.shared_with_id = shareRecipients[0];
    }

    if (shareAudience === "people") {
      if (shareRecipients.length === 0) {
        setMessage("Selecione pelo menos uma pessoa para compartilhar.");
        return;
      }
      payload.shared_with_ids = shareRecipients;
    }

    if (shareAudience === "connections") {
      payload.shared_with_ids = shareRecipients;
    }

    if (shareAudience === "group") {
      if (!shareGroupId.trim()) {
        setMessage("Informe um identificador de grupo para este compartilhamento.");
        return;
      }
      payload.group_id = shareGroupId.trim();
    }

    const response = await api("/social/moments", {
      method: "POST",
      body: JSON.stringify(payload),
    });

    const data = await response.json();

    if (!response.ok) {
      setMessage(errorMessage(data.detail, "Não foi possível compartilhar."));
      return;
    }

    setShareContent("");
    setShareRecipients([]);
    setShareGroupId("");
    setShareAudience("person");
    setMessage("Compartilhamento enviado.");
  }

  async function sendPrivateMessage() {
    const value = messageContent.trim();
    if (!activeConversationId || (!value && messageFiles.length === 0)) return;

    const attachmentIds: string[] = [];
    for (const file of messageFiles) {
      const formData = new FormData();
      formData.append("file", file);
      const uploadResponse = await api("/social/uploads", {
        method: "POST",
        body: formData,
      });
      const uploadData = await uploadResponse.json();
      if (!uploadResponse.ok) {
        setMessage(errorMessage(uploadData.detail, "Não foi possível enviar o arquivo."));
        return;
      }
      attachmentIds.push(uploadData.id);
    }

    const response = await api("/social/messages", {
      method: "POST",
      body: JSON.stringify({
        recipient_id: activeConversationId,
        content: value || "Arquivo enviado",
        ...(replyToMessage ? { reply_to_id: replyToMessage.id } : {}),
        attachment_ids: attachmentIds,
      }),
    });
    const data = await response.json();
    if (!response.ok) {
      setMessage(errorMessage(data.detail, "Não foi possível enviar a mensagem."));
      return;
    }

    setMessageContent("");
    setMessageFiles([]);
    setReplyToMessage(null);
    await loadConversation(activeConversationId);
  }

  async function downloadAttachment(attachmentId: string) {
    const preview = window.open("about:blank", "_blank");
    const response = await api(`/social/uploads/${attachmentId}/content`);
    if (!response.ok) {
      preview?.close();
      const data = await response.json();
      setMessage(errorMessage(data.detail, "Não foi possível abrir o arquivo."));
      return;
    }

    const blobUrl = URL.createObjectURL(await response.blob());
    if (preview) {
      preview.location.href = blobUrl;
    } else {
      const link = document.createElement("a");
      link.href = blobUrl;
      link.download = "arquivo";
      link.click();
    }
    window.setTimeout(() => URL.revokeObjectURL(blobUrl), 60_000);
  }

  async function toggleMessageReaction(message: PrivateMessage) {
    const reaction = profile?.id && message.reactions[profile.id] === "heart" ? null : "heart";
    const response = await api(`/social/messages/${message.id}/reaction`, {
      method: "POST",
      body: JSON.stringify({ reaction }),
    });
    if (response.ok && activeConversationId) await loadConversation(activeConversationId);
  }

  useEffect(() => {
    if (!token) return;

    start();
    loadEntries(entryFilter);
    loadRetrospective();
    loadPersonal();
    loadSocial();
    loadIncomingMoments();
    loadReceivedMessages();
    loadProfile();

    const refreshInterval = window.setInterval(() => {
      loadSocial();
      loadIncomingMoments();
      loadReceivedMessages();
    }, 5000);

    return () => {
      window.clearInterval(refreshInterval);
      if (heartbeat.current) {
        clearInterval(heartbeat.current);
        heartbeat.current = null;
      }
    };
  }, [token, start, entryFilter, loadEntries, loadRetrospective, loadPersonal, loadSocial, loadIncomingMoments, loadReceivedMessages, loadProfile]);

  useEffect(() => {
    if (!activeConversationId) {
      setConversationMessages([]);
      return;
    }

    loadConversation(activeConversationId);
    const conversationInterval = window.setInterval(() => {
      loadConversation(activeConversationId);
    }, 5000);

    return () => window.clearInterval(conversationInterval);
  }, [activeConversationId, loadConversation]);

  useEffect(() => {
    if (!token) return;
    const websocketUrl = `${API.replace(/^http/, "ws")}/ws?token=${encodeURIComponent(token)}`;
    const socket = new WebSocket(websocketUrl);
    socket.onmessage = (event) => {
      const payload = JSON.parse(event.data) as {
        type: string;
        message?: PrivateMessage;
      };
      if (payload.type === "message.created" && payload.message) {
        const incoming = payload.message;
        if (incoming.recipient_id === profile?.id) {
          setReceivedMessages((current) =>
            current.some((item) => item.id === incoming.id) ? current : [incoming, ...current]
          );
        }
        if (incoming.sender_id === activeConversationId || incoming.recipient_id === activeConversationId) {
          setConversationMessages((current) =>
            current.some((item) => item.id === incoming.id) ? current : [...current, incoming]
          );
        }
      }
      if (payload.type === "message.reaction" && activeConversationId) {
        loadConversation(activeConversationId);
      }
    };
    return () => socket.close();
  }, [token, activeConversationId, loadConversation]);

  useEffect(() => {
    if (!token) return;

    const handleVisibility = () => {
      if (document.visibilityState === "hidden") {
        stop();
      } else {
        start();
      }
    };

    document.addEventListener("visibilitychange", handleVisibility);

    return () => {
      document.removeEventListener("visibilitychange", handleVisibility);
    };
  }, [token, start, stop]);

  if (!token) {
    return (
      <main style={page}>
        <h1>Minha Vida</h1>
        <p>Entre para cuidar do que importa — e depois volte para a vida.</p>
        <section style={card}>
          <h2>{authMode === "login" ? "Entrar" : "Criar conta"}</h2>
          {authMode === "register" && (
            <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Seu nome" style={authInput} />
          )}
          <input value={email} onChange={(e) => setEmail(e.target.value)} type="email" placeholder="E-mail" style={authInput} />
          <input value={password} onChange={(e) => setPassword(e.target.value)} type="password" placeholder="Senha (ao menos 8 caracteres)" style={authInput} />
          <div style={row}>
            <button onClick={authenticate} style={button}>{authMode === "login" ? "Entrar" : "Criar conta"}</button>
            <button onClick={() => setAuthMode(authMode === "login" ? "register" : "login")} style={secondary}>
              {authMode === "login" ? "Criar conta" : "Já tenho conta"}
            </button>
          </div>
          {authMessage && <p>{authMessage}</p>}
        </section>
      </main>
    );
  }

  const active = Boolean(usage?.active_session_id);

  return (
    <main style={page}>
      <h1>Minha Vida</h1>
      <p>Registre o que importa. Depois, volte para a vida.</p>

      <section style={card}>
        <h2>Controle de tempo</h2>

        {usage && (
          <>
            <p>
              Hoje: {fmt(usage.daily_used_seconds)} /{" "}
              {fmt(usage.daily_limit_seconds)}
            </p>
            <p>
              Semana: {fmt(usage.weekly_used_seconds)} /{" "}
              {fmt(usage.weekly_limit_seconds)}
            </p>

            {active ? (
              <button onClick={stop} style={secondary}>
                Encerrar sessão
              </button>
            ) : (
              <button onClick={start} style={button}>
                Iniciar sessão
              </button>
            )}
          </>
        )}
      </section>

      <section style={card}>
        <h2>{editingEntryId ? "Editar registro" : "Novo registro"}</h2>

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

        <input
          value={entryTitle}
          onChange={(e) => setEntryTitle(e.target.value)}
          placeholder="Título do registro"
          style={input}
        />

        <div style={row}>
          <input
            type="date"
            value={entryDate}
            onChange={(e) => setEntryDate(e.target.value)}
            style={{ ...input, flex: 1 }}
          />
          <input
            type="number"
            min={1}
            value={entryDurationMinutes}
            onChange={(e) => setEntryDurationMinutes(e.target.value)}
            placeholder="Duração (min)"
            style={{ ...input, flex: 1 }}
          />
        </div>

        <div style={row}>
          <input
            value={entryIntensity}
            onChange={(e) => setEntryIntensity(e.target.value)}
            placeholder="Intensidade"
            style={{ ...input, flex: 1 }}
          />
          <input
            value={entryLocation}
            onChange={(e) => setEntryLocation(e.target.value)}
            placeholder="Local"
            style={{ ...input, flex: 1 }}
          />
        </div>

        <div style={row}>
          <input
            value={entrySubtype}
            onChange={(e) => setEntrySubtype(e.target.value)}
            placeholder="Subtipo"
            style={{ ...input, flex: 1 }}
          />
          <input
            value={entryTags}
            onChange={(e) => setEntryTags(e.target.value)}
            placeholder="Tags separados por vírgula"
            style={{ ...input, flex: 2 }}
          />
        </div>

        <div style={row}>
          <input
            value={entryMood}
            onChange={(e) => setEntryMood(e.target.value)}
            placeholder="Humor"
            style={{ ...input, flex: 1 }}
          />
          <input
            value={entryEnergy}
            onChange={(e) => setEntryEnergy(e.target.value)}
            placeholder="Energia"
            style={{ ...input, flex: 1 }}
          />
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
          <button disabled={!active} onClick={addEntry} style={button}>
            {editingEntryId ? "Salvar alterações" : "Registrar"}
          </button>
          {editingEntryId && (
            <button onClick={cancelEditingEntry} style={secondary}>
              Cancelar
            </button>
          )}
        </div>

        {message && <p>{message}</p>}
      </section>

      <section style={card}>
        <h2>Compartilhar</h2>
        <p>Sem posts públicos. Escolha explicitamente com quem compartilhar.</p>

        <label style={fieldLabel}>
          Público
          <select
            value={shareAudience}
            onChange={(e) => {
              const next = e.target.value as ShareAudience;
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
            <input
              value={shareGroupId}
              onChange={(e) => setShareGroupId(e.target.value)}
              placeholder="Grupo opcional"
              style={input}
            />
          </label>
        ) : (
          <div style={shareList}>
            {connections.length === 0 && (
              <p>Você precisa aceitar conexões para compartilhar com outras pessoas.</p>
            )}
            {connections.map((connection) => {
              const selected = shareAudience === "person"
                ? shareRecipients.includes(connection.person.id)
                : shareRecipients.includes(connection.person.id);

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

        <button disabled={!active} onClick={shareMoment} style={button}>
          Enviar compartilhamento
        </button>
      </section>

      <section style={card}>
        <h2>Minha vida</h2>

        <label style={fieldLabel}>
          Filtro por tipo
          <select value={entryFilter} onChange={(e) => { setEntryFilter(e.target.value); void loadEntries(e.target.value); }} style={select}>
            <option value="all">Todos</option>
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

        {entries.length === 0 && <p>Nenhum registro encontrado para este filtro.</p>}
        {entries.map((entry) => (
          <article key={entry.id} style={card}>
            <small>
              {entry.date ? new Date(`${entry.date}T12:00:00`).toLocaleDateString("pt-BR") : new Date(entry.created_at).toLocaleDateString("pt-BR")}
              {entry.duration_minutes ? ` · ${entry.duration_minutes} min` : ""}
              {entry.location ? ` · ${entry.location}` : ""}
            </small>
            <p><strong>{entry.title || "Registro"}</strong></p>
            <p><small>{entry.entry_type}</small></p>
            {entry.intensity && <p><small>Intensidade: {entry.intensity}</small></p>}
            {entry.structured_data.subtype && <p><small>Subtipo: {entry.structured_data.subtype}</small></p>}
            {entry.structured_data.tags && entry.structured_data.tags.length > 0 && <p><small>Tags: {entry.structured_data.tags.join(", ")}</small></p>}
            <p>{entry.content || "Sem descrição adicional."}</p>
            <div style={row}>
              <button onClick={() => startEditingEntry(entry)} style={secondary}>Editar</button>
            </div>
          </article>
        ))}
      </section>

      <section style={card}>
        <h2>Retrospectiva dos últimos 30 dias</h2>
        {retrospective ? (
          <>
            <p>Total de registros: <strong>{retrospective.total_entries}</strong></p>
            <div style={row}>
              {Object.entries(retrospective.by_type).map(([type, count]) => (
                <span key={type} style={{ ...secondary, display: "inline-block", padding: "0.5rem 0.75rem", marginRight: 8 }}>
                  {type}: {count}
                </span>
              ))}
            </div>
            {retrospective.entries.length === 0 && <p>Nenhum registro recente.</p>}
            {retrospective.entries.slice(0, 5).map((entry) => (
              <article key={entry.id} style={personCard}>
                <small>{entry.entry_type} · {entry.title || "Registro"}</small>
                <p>{entry.content || "Sem descrição adicional."}</p>
              </article>
            ))}
          </>
        ) : (
          <p>Carregando retrospectiva...</p>
        )}
      </section>

      <section style={card}>
        <h2>Objetivos</h2>
        <div style={row}>
          <input value={goalTitle} onChange={(e) => setGoalTitle(e.target.value)} placeholder="Novo objetivo" style={input} />
          <input type="date" value={goalDueDate} onChange={(e) => setGoalDueDate(e.target.value)} style={input} />
        </div>
        <textarea value={goalDescription} onChange={(e) => setGoalDescription(e.target.value)} placeholder="Por que isso importa ou como pretende avançar?" rows={3} style={textarea} />
        <button disabled={!active} onClick={createGoal} style={button}>Criar objetivo</button>
        {goals.length === 0 && <p>Nenhum objetivo criado.</p>}
        {goals.map((goal) => (
          <article key={goal.id} style={personCard}>
            <strong>{goal.title}</strong>
            {goal.due_date && <small> · prazo {new Date(`${goal.due_date}T12:00:00`).toLocaleDateString("pt-BR")}</small>}
            {goal.description && <p>{goal.description}</p>}
            <label style={fieldLabel}>
              Progresso: {goal.progress}%
              <input type="range" min={0} max={100} value={goal.progress} onChange={(e) => void updateGoal(goal, { progress: Number(e.target.value) })} style={{ width: "100%" }} />
            </label>
            <select value={goal.status} onChange={(e) => void updateGoal(goal, { status: e.target.value as Goal["status"] })} style={select}>
              <option value="active">Em andamento</option>
              <option value="completed">Concluído</option>
              <option value="paused">Pausado</option>
              <option value="cancelled">Cancelado</option>
            </select>
          </article>
        ))}
      </section>

      <section style={card}>
        <h2>Hábitos</h2>
        <div style={row}>
          <input value={habitTitle} onChange={(e) => setHabitTitle(e.target.value)} placeholder="Novo hábito" style={input} />
          <input type="number" min={1} max={7} value={habitTarget} onChange={(e) => setHabitTarget(e.target.value)} aria-label="Frequência semanal" style={{ ...input, maxWidth: 120 }} />
          <button disabled={!active} onClick={createHabit} style={button}>Criar hábito</button>
        </div>
        {habits.length === 0 && <p>Nenhum hábito criado.</p>}
        {habits.map((habit) => (
          <article key={habit.id} style={personCard}>
            <strong>{habit.title}</strong>
            <p>{habit.checkins.length} registro(s) nos últimos 7 dias · meta de {habit.target_per_week}/semana</p>
            <button disabled={!active || habit.checkins.some((item) => item.checked_on === new Date().toISOString().slice(0, 10))} onClick={() => void checkinHabit(habit)} style={secondary}>
              Registrar hoje
            </button>
          </article>
        ))}
      </section>

      <section style={card}>
        <h2>Compartilhados comigo</h2>
        {sharedMoments.length === 0 && <p>Nenhum momento compartilhado com você.</p>}
        {sharedMoments.map((moment) => (
          <article key={moment.id} style={personCard}>
            <small>{moment.owner_name ?? "Pessoa"} · {new Date(moment.created_at).toLocaleString("pt-BR")}</small>
            <p>{moment.content}</p>
          </article>
        ))}
      </section>

      <section style={card}>
        <h2>Mensagens recebidas</h2>
        {receivedMessages.length === 0 && <p>Nenhuma mensagem recebida.</p>}
        {receivedMessages.map((privateMessage) => (
          <article key={privateMessage.id} style={personCard}>
            <small>{privateMessage.sender_name ?? "Pessoa"} · {new Date(privateMessage.created_at).toLocaleString("pt-BR")}</small>
            <p>{privateMessage.content}</p>
            <button
              onClick={() => setActiveConversationId(privateMessage.sender_id)}
              style={secondary}
            >
              Abrir conversa
            </button>
          </article>
        ))}
      </section>

      <section style={card}>
        <h2>Mensagens privadas</h2>
        <p>Converse apenas com conexões aceitas.</p>
        {connections.length === 0 ? (
          <p>Você precisa ter uma conexão aceita para enviar mensagens.</p>
        ) : (
          <>
            <label style={fieldLabel}>
              Conversa
              <select
                value={activeConversationId}
                onChange={(e) => setActiveConversationId(e.target.value)}
                style={select}
              >
                <option value="">Selecione uma conexão</option>
                {connections.map((connection) => (
                  <option key={connection.person.id} value={connection.person.id}>
                    {connection.person.name}
                  </option>
                ))}
              </select>
            </label>

            {activeConversationId && (
              <>
                <div style={messageList}>
                  {conversationMessages.length === 0 && <p>Nenhuma mensagem nesta conversa.</p>}
                  {conversationMessages.map((privateMessage) => (
                    <article key={privateMessage.id} style={messageBubble}>
                      <small>
                        {privateMessage.sender_name ?? "Pessoa"} · {new Date(privateMessage.created_at).toLocaleString("pt-BR")}
                      </small>
                      {privateMessage.reply_to_id && <small>Respondendo a uma mensagem anterior</small>}
                      <p>{privateMessage.content}</p>
                      {privateMessage.attachment_ids.length > 0 && (
                        <div style={row}>
                          {privateMessage.attachment_ids.map((attachmentId) => (
                            <button key={attachmentId} onClick={() => downloadAttachment(attachmentId)} style={secondary}>
                              Abrir arquivo
                            </button>
                          ))}
                        </div>
                      )}
                      <div style={row}>
                        <button onClick={() => setReplyToMessage(privateMessage)} style={secondary}>Responder</button>
                        <button onClick={() => toggleMessageReaction(privateMessage)} style={secondary}>
                          {privateMessage.reactions[profile?.id ?? ""] === "heart" ? "♥" : "♡"}
                        </button>
                      </div>
                    </article>
                  ))}
                </div>
                {replyToMessage && <p>Respondendo: {replyToMessage.content}</p>}
                <textarea
                  rows={3}
                  disabled={!active}
                  value={messageContent}
                  onChange={(e) => setMessageContent(e.target.value)}
                  placeholder="Escreva uma mensagem privada"
                  style={textarea}
                />
                <input
                  type="file"
                  multiple
                  accept="image/*,audio/*,application/pdf,application/zip,text/plain"
                  onChange={(e) => setMessageFiles(Array.from(e.target.files ?? []))}
                />
                {messageFiles.length > 0 && <small>{messageFiles.length} arquivo(s) selecionado(s)</small>}
                <button disabled={!active} onClick={sendPrivateMessage} style={button}>Enviar mensagem</button>
              </>
            )}
          </>
        )}
      </section>

      <section style={card}>
        <h2>Pessoas e relacionamentos</h2>
        <p>Encontre pessoas e envie um convite. Uma conexão só existe depois do aceite mútuo.</p>
        <div style={row}>
          <input
            value={peopleQuery}
            onChange={(e) => setPeopleQuery(e.target.value)}
            placeholder="Buscar pelo nome"
            style={input}
          />
          <button onClick={searchPeople} style={button}>Buscar</button>
        </div>
        {people.map((person) => (
          <article key={person.id} style={personCard}>
            <strong>{person.name}</strong>
            {person.city && <span> · {person.city}</span>}
            {person.bio && <p>{person.bio}</p>}
            <button disabled={!active} onClick={() => requestConnection(person)} style={secondary}>Enviar convite</button>
          </article>
        ))}
      </section>

      {profile && (
        <section style={card}>
          <h2>Meu perfil</h2>
          <p>Você decide se seu perfil pode aparecer na busca. Informações não são públicas por padrão.</p>
          <input value={profile.name} onChange={(e) => setProfile({ ...profile, name: e.target.value })} placeholder="Nome" style={authInput} />
          <input value={profile.city ?? ""} onChange={(e) => setProfile({ ...profile, city: e.target.value || null })} placeholder="Cidade ou região" style={authInput} />
          <textarea value={profile.bio ?? ""} onChange={(e) => setProfile({ ...profile, bio: e.target.value || null })} placeholder="Uma breve descrição" rows={3} style={textarea} />
          <label style={checkLabel}>
            <input type="checkbox" checked={profile.profile_visible} onChange={(e) => setProfile({ ...profile, profile_visible: e.target.checked })} />
            Permitir que meu perfil apareça na busca de pessoas
          </label>
          <button onClick={saveProfile} style={button}>Salvar perfil</button>
        </section>
      )}

      <section style={card}>
        <h2>Solicitações recebidas</h2>
        {requests.length === 0 && <p>Nenhuma solicitação pendente.</p>}
        {requests.map((connection) => (
          <article key={connection.id} style={personCard}>
            <strong>{connection.person.name}</strong>
            <div style={row}>
              <button disabled={!active} onClick={() => decideRequest(connection, "accept")} style={button}>Aceitar</button>
              <button disabled={!active} onClick={() => decideRequest(connection, "decline")} style={secondary}>Recusar</button>
            </div>
          </article>
        ))}
      </section>

      <section style={card}>
        <h2>Minhas conexões</h2>
        {connections.length === 0 && <p>Suas conexões aceitas aparecerão aqui.</p>}
        {connections.map((connection) => (
          <article key={connection.id} style={personCard}>
            <strong>{connection.person.name}</strong>
            {connection.person.city && <span> · {connection.person.city}</span>}
            <div style={row}>
              <label>
                Categoria privada: {" "}
                <select
                  value={connection.category ?? ""}
                  onChange={(e) => updateCategory(connection, e.target.value)}
                  disabled={!active}
                >
                  <option value="">Sem categoria</option>
                  <option value="family">Família</option>
                  <option value="friend">Amigo</option>
                  <option value="close_friend">Amigo próximo</option>
                  <option value="colleague">Colega</option>
                  <option value="acquaintance">Conhecido</option>
                  <option value="other">Outro</option>
                </select>
              </label>
              <button disabled={!active} onClick={() => removeConnection(connection)} style={secondary}>Desfazer conexão</button>
            </div>
          </article>
        ))}
      </section>
    </main>
  );
}

const page = {
  maxWidth: 720,
  margin: "40px auto",
  padding: 24,
};

const card = {
  background: "white",
  border: "1px solid #ddd",
  borderRadius: 12,
  padding: 20,
  margin: "20px 0",
};

const textarea = {
  display: "block",
  width: "100%",
  boxSizing: "border-box" as const,
  padding: 12,
  marginBottom: 12,
  border: "1px solid #ccc",
  borderRadius: 8,
};

const button = {
  padding: "10px 16px",
  border: 0,
  borderRadius: 8,
  cursor: "pointer",
};

const secondary = {
  padding: "10px 16px",
  border: "1px solid #aaa",
  borderRadius: 8,
  cursor: "pointer",
  background: "white",
};

const row = {
  display: "flex",
  gap: 8,
  alignItems: "center",
  flexWrap: "wrap" as const,
};

const input = {
  flex: 1,
  minWidth: 180,
  padding: 10,
  border: "1px solid #ccc",
  borderRadius: 8,
};

const authInput = {
  display: "block",
  width: "100%",
  boxSizing: "border-box" as const,
  padding: 10,
  marginBottom: 10,
  border: "1px solid #ccc",
  borderRadius: 8,
};

const checkLabel = {
  display: "block",
  marginBottom: 12,
};

const fieldLabel = {
  display: "block",
  marginBottom: 12,
  fontWeight: 600,
};

const select = {
  display: "block",
  width: "100%",
  boxSizing: "border-box" as const,
  padding: 10,
  marginTop: 8,
  border: "1px solid #ccc",
  borderRadius: 8,
};

const shareList = {
  display: "grid",
  gap: 8,
  margin: "12px 0",
};

const messageList = {
  display: "grid",
  gap: 10,
  maxHeight: 420,
  overflowY: "auto" as const,
  margin: "16px 0",
};

const messageBubble = {
  border: "1px solid #eee",
  borderRadius: 8,
  padding: 12,
};

const checkLabelRow = {
  display: "flex",
  alignItems: "center",
  gap: 8,
  padding: "6px 0",
};

const personCard = {
  borderTop: "1px solid #eee",
  padding: "14px 0",
};
