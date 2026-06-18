import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Trash2, UserPlus, Users as UsersIcon, Shield, ShieldCheck } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Card, Label, PageShell, PrimaryButton, Spinner, inputCls } from "@/components/ui-kit";
import { OwnerOnly } from "@/components/OwnerOnly";
import type { AppRole } from "@/lib/use-auth";

export const Route = createFileRoute("/_authenticated/admin")({
  head: () => ({ meta: [{ title: "Admin dashboard — Reynolds Properties" }] }),
  component: () => <OwnerOnly><AdminPage /></OwnerOnly>,
});

type Allowed = { id: string; email: string; role: AppRole; created_at: string };
type Member = { user_id: string; role: AppRole; email: string | null };

function AdminPage() {
  const [allowed, setAllowed] = useState<Allowed[] | null>(null);
  const [members, setMembers] = useState<Member[] | null>(null);
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<AppRole>("user");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const [toast, setToast] = useState("");

  function flash(msg: string) { setToast(msg); setTimeout(() => setToast(""), 2500); }

  async function loadAll() {
    const [{ data: a }, { data: r }] = await Promise.all([
      supabase.from("allowed_emails").select("*").order("created_at", { ascending: false }),
      supabase.from("user_roles").select("user_id, role"),
    ]);
    setAllowed((a as Allowed[]) ?? []);
    // We can't list auth.users from the client; show user_id + role only.
    setMembers(((r ?? []) as { user_id: string; role: AppRole }[]).map((x) => ({ ...x, email: null })));
  }

  useEffect(() => { loadAll(); }, []);

  async function addAllowed(e: React.FormEvent) {
    e.preventDefault();
    if (!email.trim()) return;
    setBusy(true); setErr("");
    const { error } = await supabase
      .from("allowed_emails")
      .insert({ email: email.trim().toLowerCase(), role });
    setBusy(false);
    if (error) { setErr(error.message); return; }
    setEmail(""); setRole("user"); flash("Email added to allowed list");
    loadAll();
  }

  async function removeAllowed(id: string) {
    const { error } = await supabase.from("allowed_emails").delete().eq("id", id);
    if (error) { setErr(error.message); return; }
    flash("Removed"); loadAll();
  }

  async function updateMemberRole(user_id: string, newRole: AppRole) {
    const { error } = await supabase
      .from("user_roles")
      .update({ role: newRole })
      .eq("user_id", user_id);
    if (error) { setErr(error.message); return; }
    flash("Role updated"); loadAll();
  }

  return (
    <PageShell title="Admin dashboard" subtitle="Grant access and manage roles">
      <div className="space-y-8">
        <Card>
          <div className="flex items-center gap-2 mb-4">
            <UserPlus size={18} className="text-primary" />
            <h2 className="font-display text-xl">Grant access</h2>
          </div>
          <p className="text-sm text-muted-foreground mb-5">
            Add an email and choose a role. When that person signs up, they'll be assigned the role automatically.
            Owners see all pages; users only see "Submit invoice".
          </p>
          <form onSubmit={addAllowed} className="grid sm:grid-cols-[1fr_180px_auto] gap-3 items-end">
            <div>
              <Label required>Email</Label>
              <input type="email" required className={inputCls} placeholder="person@example.com"
                value={email} onChange={(e) => setEmail(e.target.value)} />
            </div>
            <div>
              <Label required>Role</Label>
              <select className={inputCls} value={role} onChange={(e) => setRole(e.target.value as AppRole)}>
                <option value="user">User (contractor)</option>
                <option value="owner">Owner</option>
              </select>
            </div>
            <PrimaryButton type="submit" loading={busy}>Add</PrimaryButton>
          </form>
          {err && <p className="text-sm text-destructive mt-3">{err}</p>}
          {toast && <p className="text-sm text-[color:var(--success)] mt-3">{toast}</p>}

          <div className="mt-6">
            <h3 className="text-sm font-medium mb-2 text-muted-foreground">Pending invitations</h3>
            {!allowed ? <div className="flex items-center gap-2 text-sm text-muted-foreground"><Spinner /> Loading…</div>
              : allowed.length === 0 ? <p className="text-sm text-muted-foreground">No pending invitations.</p>
              : (
                <ul className="divide-y divide-border border border-border rounded-md">
                  {allowed.map((a) => (
                    <li key={a.id} className="flex items-center justify-between px-4 py-2.5">
                      <div className="flex items-center gap-3 min-w-0">
                        <span className="truncate">{a.email}</span>
                        <RoleBadge role={a.role} />
                      </div>
                      <button onClick={() => removeAllowed(a.id)}
                        className="inline-flex items-center gap-1.5 text-sm text-destructive border border-destructive/30 rounded-md px-2.5 py-1 hover:bg-destructive/5">
                        <Trash2 size={14} /> Remove
                      </button>
                    </li>
                  ))}
                </ul>
              )}
          </div>
        </Card>

        <Card>
          <div className="flex items-center gap-2 mb-4">
            <UsersIcon size={18} className="text-primary" />
            <h2 className="font-display text-xl">Members</h2>
          </div>
          {!members ? <div className="flex items-center gap-2 text-sm text-muted-foreground"><Spinner /> Loading…</div>
            : members.length === 0 ? <p className="text-sm text-muted-foreground">No members yet.</p>
            : (
              <ul className="divide-y divide-border border border-border rounded-md">
                {members.map((m) => (
                  <li key={m.user_id} className="flex items-center justify-between px-4 py-2.5 gap-3">
                    <span className="font-mono text-xs text-muted-foreground truncate">{m.user_id}</span>
                    <select
                      value={m.role}
                      onChange={(e) => updateMemberRole(m.user_id, e.target.value as AppRole)}
                      className="text-sm border border-input rounded-md px-2 py-1 bg-background"
                    >
                      <option value="user">User</option>
                      <option value="owner">Owner</option>
                    </select>
                  </li>
                ))}
              </ul>
            )}
          <p className="text-xs text-muted-foreground mt-3">
            Member emails aren't shown here for privacy. Change roles using the dropdown.
          </p>
        </Card>
      </div>
    </PageShell>
  );
}

function RoleBadge({ role }: { role: AppRole }) {
  const isOwner = role === "owner";
  return (
    <span className={`inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full ${
      isOwner ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground"
    }`}>
      {isOwner ? <ShieldCheck size={12} /> : <Shield size={12} />}
      {role}
    </span>
  );
}
