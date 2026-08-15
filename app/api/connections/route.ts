import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabaseServer";

export async function POST(req: NextRequest) {
  const supabase = createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const body = await req.json();
  const { name, schema_text, db_url } = body;

  if (!name || !schema_text) {
    return NextResponse.json(
      { error: "Name and schema are required" },
      { status: 400 }
    );
  }

  // NOTE: for a real production app, encrypt db_url at rest (e.g. via
  // Supabase Vault or a KMS) instead of storing it in plain text.
  const { data, error } = await supabase
    .from("connections")
    .insert({
      user_id: user.id,
      name,
      schema_text,
      db_url: db_url || null,
      has_db: !!db_url,
    })
    .select("id, name, schema_text, has_db, created_at")
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ connection: data });
}

export async function GET() {
  const supabase = createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const { data, error } = await supabase
    .from("connections")
    .select("id, name, schema_text, has_db, created_at")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ connections: data });
}
