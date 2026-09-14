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

function fmt(s: number) {
  return `${Math.floor(s / 60)}m ${s % 60}s`;
}

export default function Home() {
  const [token, setToken] = useState("");
  const [usage, setUsage] = useState<Usage | null>(null);
  const [entries, setEntries] = useState<Entry[]>([]);
  const [content, setContent] = useState("");
  const [message, setMessage] = useState("");
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
      setMessage(data.detail ?? "Limite atingido.");
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
      setMessage(data.detail ?? "Não foi possível registrar.");
      return;
    }

    setContent("");
    setMessage("Registro salvo.");
    await loadEntries();
  }

  useEffect(() => {
    if (!token) return;

    start();
    loadEntries();

    return () => {
      if (heartbeat.current) {
        clearInterval(heartbeat.current);
        heartbeat.current = null;
      }
    };
  }, [token, start, loadEntries]);

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
        <p>Faça login usando o fluxo já existente do MVP.</p>
        <p>
          Esta tela deve ser integrada ao componente de autenticação existente.
        </p>
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
