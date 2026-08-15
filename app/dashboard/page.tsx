import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabaseServer";
import DashboardClient from "./DashboardClient";

export default async function DashboardPage() {
  const supabase = createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: connections } = await supabase
    .from("connections")
    .select("id, name, schema_text, has_db, created_at")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  return (
    <DashboardClient
      userEmail={user.email ?? ""}
      initialConnections={connections ?? []}
    />
  );
}
