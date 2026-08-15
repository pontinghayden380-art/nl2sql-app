import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabaseServer";
import { runReadOnlyQuery } from "@/lib/db";

const GROQ_MODEL = "llama-3.3-70b-versatile";

export async function POST(req: NextRequest) {
  const supabase = createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const { connectionId, question } = await req.json();

  if (!connectionId || !question) {
    return NextResponse.json(
      { error: "connectionId and question are required" },
      { status: 400 }
    );
  }

  const { data: connection, error: connError } = await supabase
    .from("connections")
    .select("id, schema_text, db_url")
    .eq("id", connectionId)
    .eq("user_id", user.id)
    .single();

  if (connError || !connection) {
    return NextResponse.json({ error: "Connection not found" }, { status: 404 });
  }

  // Ask Groq (Llama 3.3 70B) to produce SQL + a short plain-English
  // explanation, as JSON. Groq exposes an OpenAI-compatible endpoint.
  let sql = "";
  let explanation = "";

  try {
    const groqRes = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${process.env.GROQ_API_KEY}`,
      },
      body: JSON.stringify({
        model: GROQ_MODEL,
        temperature: 0,
        response_format: { type: "json_object" },
        messages: [
          {
            role: "system",
            content:
              "You are a SQL generation engine for a Postgres database. " +
              "Given a schema and a natural language question, output ONLY a JSON object " +
              '(no markdown, no code fences) of the shape {"sql": "...", "explanation": "..."}. ' +
              "The sql field must be a single valid, read-only SELECT statement (never INSERT/UPDATE/DELETE/DDL). " +
              "The explanation field is one short sentence in plain English describing what the query returns. " +
              "If the question cannot be answered from the given schema, set sql to an empty string and explain why.",
          },
          {
            role: "user",
            content: `Schema:\n${connection.schema_text}\n\nQuestion: ${question}`,
          },
        ],
      }),
    });

    if (!groqRes.ok) {
      const errBody = await groqRes.text();
      throw new Error(`Groq API error (${groqRes.status}): ${errBody}`);
    }

    const data = await groqRes.json();
    const raw = data.choices?.[0]?.message?.content ?? "{}";
    const cleaned = raw.replace(/```json|```/g, "").trim();
    const parsed = JSON.parse(cleaned);
    sql = parsed.sql || "";
    explanation = parsed.explanation || "";
  } catch (err: any) {
    return NextResponse.json(
      { error: "Failed to generate SQL: " + err.message },
      { status: 500 }
    );
  }

  if (!sql) {
    return NextResponse.json({ sql: "", explanation, rows: null });
  }

  // Optionally execute against the user's live database, read-only.
  let rows: any[] | null = null;
  let executionError: string | undefined;

  if (connection.db_url) {
    try {
      rows = await runReadOnlyQuery(connection.db_url, sql);
    } catch (err: any) {
      executionError = err.message;
    }
  }

  // Log query history (best-effort, ignore failures).
  await supabase.from("queries").insert({
    user_id: user.id,
    connection_id: connectionId,
    question,
    sql,
  });

  return NextResponse.json({ sql, explanation, rows, executionError });
}
