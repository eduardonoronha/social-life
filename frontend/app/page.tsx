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
  content: string;
  entry_type: string;
  created_at: string;
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
  const [content, setContent] = useState("");
  const [message, setMessage] = useState("");
  const [peopleQuery, setPeopleQuery] = useState("");
  const [people, setPeople] = useState<Person[]>([]);
  const [connections, setConnections] = useState<Relationship[]>([]);
  const [requests, setRequests] = useState<Relationship[]>([]);
  const [sharedMoments, setSharedMoments] = useState<SharedMoment[]>([]);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [shareContent, setShareContent] = useState("");
  const [shareAudience, setShareAudience] = useState<ShareAudience>("person");
  const [shareRecipients, setShareRecipients] = useState<string[]>([]);
  const [shareGroupId, setShareGroupId] = useState("");
  const heartbeat = useRef<ReturnType<typeof setInterval> | null>(null);

  const api = useCallback(async (path: string, init: RequestInit = {}) => {
    return fetch(`${API}${path}`, {
      ...init,
      headers: {
        "Content-Type": "application/json",
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

  const loadEntries = useCallback(async () => {
    if (!token) return;

    const response = await api("/life/entries");
    if (response.ok) {
      setEntries(await response.json());
    }
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
    if (!value) return;

    const response = await api("/life/entries", {
      method: "POST",
      body: JSON.stringify({
        content: value,
        entry_type: "note",
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      setMessage(errorMessage(data.detail, "Não foi possível registrar."));
      return;
    }

    setContent("");
    setMessage("Registro salvo.");
    await loadEntries();
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

  useEffect(() => {
    if (!token) return;

    start();
    loadEntries();
    loadSocial();
    loadIncomingMoments();
    loadProfile();

    const refreshInterval = window.setInterval(() => {
      loadSocial();
      loadIncomingMoments();
    }, 5000);

    return () => {
      window.clearInterval(refreshInterval);
      if (heartbeat.current) {
        clearInterval(heartbeat.current);
        heartbeat.current = null;
      }
    };
  }, [token, start, loadEntries, loadSocial, loadIncomingMoments, loadProfile]);

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
        <h2>Novo registro</h2>

        <textarea
          rows={5}
          disabled={!active}
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder="O que vale a pena guardar?"
          style={textarea}
        />

        <button disabled={!active} onClick={addEntry} style={button}>
          Registrar
        </button>

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

      <section>
        <h2>Minha vida</h2>

        {entries.map((entry) => (
          <article key={entry.id} style={card}>
            <small>
              {new Date(entry.created_at).toLocaleString("pt-BR")}
            </small>
            <p>{entry.content}</p>
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
