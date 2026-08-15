"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabaseClient";

type Connection = {
  id: string;
  name: string;
  schema_text: string;
  has_db: boolean;
  created_at: string;
};

type ChatMessage = {
  role: "user" | "assistant";
  question?: string;
  sql?: string;
  explanation?: string;
  rows?: any[];
  error?: string;
};

export default function DashboardClient({
  userEmail,
  initialConnections,
}: {
  userEmail: string;
  initialConnections: Connection[];
}) {
  const router = useRouter();
  const supabase = createClient();

  const [connections, setConnections] = useState<Connection[]>(initialConnections);
  const [activeId, setActiveId] = useState<string | null>(
    initialConnections[0]?.id ?? null
  );
  const [showNewConn, setShowNewConn] = useState(initialConnections.length === 0);

  // new connection form
  const [connName, setConnName] = useState("");
  const [schemaText, setSchemaText] = useState("");
  const [dbUrl, setDbUrl] = useState("");
  const [savingConn, setSavingConn] = useState(false);

  // chat
  const [question, setQuestion] = useState("");
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [asking, setAsking] = useState(false);

  const activeConnection = connections.find((c) => c.id === activeId) || null;

  async function handleLogout() {
    await supabase.auth.signOut();
    router.push("/");
    router.refresh();
  }

  async function handleSaveConnection(e: React.FormEvent) {
    e.preventDefault();
    setSavingConn(true);

    const res = await fetch("/api/connections", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: connName,
        schema_text: schemaText,
        db_url: dbUrl || null,
      }),
    });

    const data = await res.json();
    setSavingConn(false);

    if (!res.ok) {
      alert(data.error || "Could not save connection");
      return;
    }

    setConnections([data.connection, ...connections]);
    setActiveId(data.connection.id);
    setShowNewConn(false);
    setConnName("");
    setSchemaText("");
    setDbUrl("");
  }

  async function handleAsk(e: React.FormEvent) {
    e.preventDefault();
    if (!activeConnection || !question.trim()) return;

    const q = question.trim();
    setMessages((m) => [...m, { role: "user", question: q }]);
    setQuestion("");
    setAsking(true);

    const res = await fetch("/api/query", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        connectionId: activeConnection.id,
        question: q,
      }),
    });

    const data = await res.json();
    setAsking(false);

    if (!res.ok) {
      setMessages((m) => [...m, { role: "assistant", error: data.error }]);
      return;
    }

    setMessages((m) => [
      ...m,
      {
        role: "assistant",
        sql: data.sql,
        explanation: data.explanation,
        rows: data.rows,
        error: data.executionError,
      },
    ]);
  }

  return (
    <div className="min-h-screen flex">
      {/* Sidebar */}
      <aside className="w-72 border-r border-gray-200 flex flex-col">
        <div className="p-4 border-b border-gray-200">
          <p className="text-sm text-gray-500 truncate">{userEmail}</p>
        </div>

        <div className="flex-1 overflow-y-auto p-3 space-y-1">
          <button
            onClick={() => setShowNewConn(true)}
            className="w-full text-left px-3 py-2 rounded-lg text-sm font-medium text-accent hover:bg-indigo-50 transition"
          >
            + New schema/connection
          </button>

          {connections.map((c) => (
            <button
              key={c.id}
              onClick={() => {
                setActiveId(c.id);
                setShowNewConn(false);
                setMessages([]);
              }}
              className={`w-full text-left px-3 py-2 rounded-lg text-sm transition ${
                activeId === c.id && !showNewConn
                  ? "bg-gray-100 font-medium"
                  : "hover:bg-gray-50 text-gray-600"
              }`}
            >
              {c.name}
              {c.has_db && (
                <span className="ml-2 text-[10px] uppercase tracking-wide text-green-600">
                  live
                </span>
              )}
            </button>
          ))}
        </div>

        <div className="p-3 border-t border-gray-200">
          <button
            onClick={handleLogout}
            className="w-full text-left px-3 py-2 rounded-lg text-sm text-gray-500 hover:bg-gray-50 transition"
          >
            Log out
          </button>
        </div>
      </aside>

      {/* Main panel */}
      <main className="flex-1 flex flex-col">
        {showNewConn ? (
          <div className="max-w-xl mx-auto w-full p-8">
            <h2 className="text-xl font-bold mb-1">Add a schema</h2>
            <p className="text-gray-500 text-sm mb-6">
              Paste your table structure (CREATE TABLE statements or a plain
              description of tables/columns). Optionally add a live Postgres
              connection string to run generated queries (read-only SELECT
              only).
            </p>

            <form onSubmit={handleSaveConnection} className="space-y-4">
              <input
                required
                placeholder="Name (e.g. Production DB)"
                value={connName}
                onChange={(e) => setConnName(e.target.value)}
                className="w-full px-4 py-2.5 rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-accent"
              />
              <textarea
                required
                placeholder={
                  "CREATE TABLE users (id serial primary key, name text, email text, created_at timestamp);\nCREATE TABLE orders (id serial primary key, user_id int, total numeric, created_at timestamp);"
                }
                value={schemaText}
                onChange={(e) => setSchemaText(e.target.value)}
                rows={8}
                className="w-full px-4 py-2.5 rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-accent font-mono text-sm"
              />
              <input
                placeholder="postgres://... (optional, for live execution)"
                value={dbUrl}
                onChange={(e) => setDbUrl(e.target.value)}
                className="w-full px-4 py-2.5 rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-accent font-mono text-sm"
              />

              <div className="flex gap-3">
                <button
                  type="submit"
                  disabled={savingConn}
                  className="px-5 py-2.5 rounded-lg bg-accent text-white font-medium hover:bg-indigo-700 transition disabled:opacity-50"
                >
                  {savingConn ? "Saving..." : "Save"}
                </button>
                {connections.length > 0 && (
                  <button
                    type="button"
                    onClick={() => setShowNewConn(false)}
                    className="px-5 py-2.5 rounded-lg border border-gray-200 font-medium hover:bg-gray-50 transition"
                  >
                    Cancel
                  </button>
                )}
              </div>
            </form>
          </div>
        ) : activeConnection ? (
          <>
            <div className="flex-1 overflow-y-auto p-6 space-y-5 max-w-3xl w-full mx-auto">
              {messages.length === 0 && (
                <p className="text-gray-400 text-sm mt-10 text-center">
                  Ask a question about &ldquo;{activeConnection.name}&rdquo; in
                  plain English.
                </p>
              )}

              {messages.map((m, i) =>
                m.role === "user" ? (
                  <div key={i} className="flex justify-end">
                    <div className="bg-accent text-white px-4 py-2.5 rounded-2xl rounded-br-sm max-w-lg">
                      {m.question}
                    </div>
                  </div>
                ) : (
                  <div key={i} className="flex justify-start">
                    <div className="bg-white border border-gray-200 px-4 py-3 rounded-2xl rounded-bl-sm max-w-xl space-y-2">
                      {m.sql && (
                        <pre className="bg-gray-900 text-gray-100 text-xs p-3 rounded-lg overflow-x-auto whitespace-pre-wrap">
                          {m.sql}
                        </pre>
                      )}
                      {m.explanation && (
                        <p className="text-sm text-gray-600">{m.explanation}</p>
                      )}
                      {m.rows && (
                        <div className="overflow-x-auto border border-gray-100 rounded-lg mt-2">
                          <table className="text-xs w-full">
                            <thead>
                              <tr className="bg-gray-50">
                                {m.rows[0] &&
                                  Object.keys(m.rows[0]).map((k) => (
                                    <th key={k} className="text-left px-3 py-1.5 font-medium">
                                      {k}
                                    </th>
                                  ))}
                              </tr>
                            </thead>
                            <tbody>
                              {m.rows.slice(0, 50).map((row, ri) => (
                                <tr key={ri} className="border-t border-gray-100">
                                  {Object.values(row).map((v: any, ci) => (
                                    <td key={ci} className="px-3 py-1.5">
                                      {String(v)}
                                    </td>
                                  ))}
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      )}
                      {m.error && (
                        <p className="text-sm text-red-600">{m.error}</p>
                      )}
                    </div>
                  </div>
                )
              )}

              {asking && (
                <div className="flex justify-start">
                  <div className="bg-white border border-gray-200 px-4 py-3 rounded-2xl rounded-bl-sm text-sm text-gray-400">
                    Thinking...
                  </div>
                </div>
              )}
            </div>

            <form
              onSubmit={handleAsk}
              className="border-t border-gray-200 p-4 max-w-3xl w-full mx-auto flex gap-2"
            >
              <input
                value={question}
                onChange={(e) => setQuestion(e.target.value)}
                placeholder="e.g. show me the top 5 customers by total order value"
                className="flex-1 px-4 py-2.5 rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-accent"
              />
              <button
                type="submit"
                disabled={asking || !question.trim()}
                className="px-5 py-2.5 rounded-lg bg-accent text-white font-medium hover:bg-indigo-700 transition disabled:opacity-50"
              >
                Ask
              </button>
            </form>
          </>
        ) : null}
      </main>
    </div>
  );
}
