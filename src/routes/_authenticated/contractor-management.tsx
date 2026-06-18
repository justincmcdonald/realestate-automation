import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Plus, Trash2, X } from "lucide-react";
import { WEBHOOKS } from "@/lib/webhooks";
import { Card, Label, PageShell, PrimaryButton, Spinner, inputCls } from "@/components/ui-kit";

import { OwnerOnly } from "@/components/OwnerOnly";

export const Route = createFileRoute("/_authenticated/contractor-management")({
  head: () => ({ meta: [{ title: "Contractor management — Reynolds Properties" }] }),
  component: () => <OwnerOnly><ContractorMgmtPage /></OwnerOnly>,
});

type Contractor = { name: string; vendor_id: string };

function ContractorMgmtPage() {
  const [list, setList] = useState<Contractor[] | null>(null);
  const [err, setErr] = useState("");
  const [showAdd, setShowAdd] = useState(false);
  const [newName, setNewName] = useState("");
  const [adding, setAdding] = useState(false);
  const [removing, setRemoving] = useState<string | null>(null);
  const [confirmRemove, setConfirmRemove] = useState<Contractor | null>(null);
  const [toast, setToast] = useState("");


  function load() {
    setErr("");
    fetch(WEBHOOKS.GET_CONTRACTORS)
      .then((r) => r.json())
      .then((d) => setList(d.contractors ?? []))
      .catch(() => setErr("Unable to load contractors. Please try again."));
  }

  useEffect(() => { load(); }, []);

  function flash(msg: string) {
    setToast(msg);
    setTimeout(() => setToast(""), 2500);
  }

  async function add(e: React.FormEvent) {
    e.preventDefault();
    if (!newName.trim()) return;
    const name = newName.trim();
    setAdding(true);
    try {
      fetch(WEBHOOKS.ADD_CONTRACTOR, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ contractor_name: name }),
      }).catch(() => {});
      setList((prev) => prev ? [...prev, { name, vendor_id: "pending" }] : prev);
      setNewName(""); setShowAdd(false); flash("Contractor added successfully");
    } finally {
      setAdding(false);
    }
  }

  async function doRemove() {
    if (!confirmRemove) return;
    const name = confirmRemove.name;
    setRemoving(name);
    try {
      fetch(WEBHOOKS.REMOVE_CONTRACTOR, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ contractor_name: name }),
      }).catch(() => {});
      setList((prev) => prev ? prev.filter((c) => c.name !== name) : prev);
      setConfirmRemove(null);
      flash("Contractor removed");
    } finally {
      setRemoving(null);
    }
  }


  return (
    <PageShell title="Contractor management" subtitle="View and manage active contractors">
      <Card>
        <div className="flex items-center justify-between mb-4">
          <PrimaryButton onClick={() => setShowAdd(true)}>
            <Plus size={16} /> New contractor
          </PrimaryButton>
          {toast && <span className="text-sm text-[color:var(--success)]">{toast}</span>}
        </div>

        {err ? (
          <div className="text-center py-10">
            <p className="text-destructive mb-3">{err}</p>
            <PrimaryButton onClick={load}>Retry</PrimaryButton>
          </div>
        ) : !list ? (
          <div className="flex items-center justify-center gap-2 py-12 text-muted-foreground"><Spinner /> Loading…</div>
        ) : list.length === 0 ? (
          <p className="text-center py-10 text-muted-foreground">No contractors yet.</p>
        ) : (
          <ul className="divide-y divide-border">
            {list.map((c) => (
              <li key={c.name + c.vendor_id} className="flex items-center justify-between py-3">
                <span className="font-medium">{c.name}</span>
                <button
                  onClick={() => setConfirmRemove(c)}
                  disabled={removing === c.name}
                  className="inline-flex items-center gap-1.5 text-sm text-destructive border border-destructive/30 rounded-md px-3 py-1.5 hover:bg-destructive/5 disabled:opacity-50"
                >
                  <Trash2 size={14} /> Remove
                </button>

              </li>
            ))}
          </ul>
        )}
      </Card>

      {showAdd && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4" onClick={() => setShowAdd(false)}>
          <form onSubmit={add} className="bg-card border border-border rounded-xl w-full max-w-sm shadow-xl" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between p-5 border-b border-border">
              <h3 className="font-display text-lg">New contractor</h3>
              <button type="button" onClick={() => setShowAdd(false)} className="text-muted-foreground hover:text-foreground"><X size={18} /></button>
            </div>
            <div className="p-5">
              <Label required>Contractor name</Label>
              <input autoFocus className={inputCls} value={newName} onChange={(e) => setNewName(e.target.value)} placeholder="e.g., Acme Roofing" />
            </div>
            <div className="p-5 border-t border-border flex justify-end gap-2">
              <button type="button" onClick={() => setShowAdd(false)} className="px-4 py-2 rounded-md border border-border hover:bg-accent text-sm">Cancel</button>
              <PrimaryButton type="submit" disabled={!newName.trim()} loading={adding}>Add contractor</PrimaryButton>
            </div>
          </form>
        </div>
      )}

      {confirmRemove && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4" onClick={() => removing !== confirmRemove.name && setConfirmRemove(null)}>
          <div className="bg-card border border-border rounded-xl w-full max-w-sm shadow-xl" onClick={(e) => e.stopPropagation()}>
            <div className="p-6">
              <h3 className="font-display text-xl mb-2">Remove contractor?</h3>
              <p className="text-sm text-muted-foreground">
                Are you sure you want to remove <span className="font-medium text-foreground">{confirmRemove.name}</span>? This cannot be undone.
              </p>
            </div>
            <div className="p-5 border-t border-border flex justify-end gap-2">
              <button type="button" disabled={removing === confirmRemove.name} onClick={() => setConfirmRemove(null)} className="px-4 py-2 rounded-md border border-border hover:bg-accent text-sm">No, cancel</button>
              <button
                type="button"
                disabled={removing === confirmRemove.name}
                onClick={doRemove}
                className="inline-flex items-center gap-2 bg-destructive text-destructive-foreground rounded-md px-4 py-2 text-sm font-medium hover:opacity-90 disabled:opacity-50"
              >
                {removing === confirmRemove.name && <Spinner size={14} />} Yes, remove
              </button>
            </div>
          </div>
        </div>
      )}

    </PageShell>
  );
}
