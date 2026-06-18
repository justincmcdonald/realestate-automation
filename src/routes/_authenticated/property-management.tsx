import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Building2, CheckCircle2, Plus, Trash2, X } from "lucide-react";
import { WEBHOOKS, BANK_ACCOUNTS, todayISO } from "@/lib/webhooks";
import { Card, Label, PageShell, PrimaryButton, Spinner, inputCls } from "@/components/ui-kit";
import { OwnerOnly } from "@/components/OwnerOnly";

export const Route = createFileRoute("/_authenticated/property-management")({
  head: () => ({ meta: [{ title: "Property management — Reynolds Properties" }] }),
  component: () => <OwnerOnly><PropertyMgmtPage /></OwnerOnly>,
});

type Property = { address: string; bank: string };

function PropertyMgmtPage() {
  const [list, setList] = useState<Property[] | null>(null);
  const [err, setErr] = useState("");
  const [showAdd, setShowAdd] = useState(false);
  const [address, setAddress] = useState("");
  const [bank, setBank] = useState("");
  const [adding, setAdding] = useState(false);
  const [confirmRemove, setConfirmRemove] = useState<Property | null>(null);
  const [removing, setRemoving] = useState(false);
  const [toast, setToast] = useState("");

  function load() {
    setErr("");
    fetch(WEBHOOKS.GET_PROPERTIES)
      .then((r) => r.json())
      .then((d) => setList(d.properties ?? []))
      .catch(() => setErr("Unable to load properties. Please try again."));
  }

  useEffect(() => { load(); }, []);

  function flash(msg: string) {
    setToast(msg);
    setTimeout(() => setToast(""), 2500);
  }

  async function add(e: React.FormEvent) {
    e.preventDefault();
    if (!address.trim() || !bank) return;
    const newProp = { address: address.trim(), bank };
    setAdding(true);
    try {
      fetch(WEBHOOKS.PROPERTY_MANAGEMENT, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          property_address: newProp.address,
          bank_account: newProp.bank,
          date_added: todayISO(),
          submission_type: "property",
        }),
      }).catch(() => {});
      setList((prev) => prev ? [...prev, newProp] : prev);
      setAddress(""); setBank(""); setShowAdd(false);
      flash("Property added successfully");
    } finally {
      setAdding(false);
    }
  }

  async function doRemove() {
    if (!confirmRemove) return;
    const target = confirmRemove;
    setRemoving(true);
    try {
      fetch(WEBHOOKS.PROPERTY_MANAGEMENT, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          property_address: target.address,
          submission_type: "remove_property",
        }),
      }).catch(() => {});
      setList((prev) => prev ? prev.filter((p) => p.address !== target.address) : prev);
      setConfirmRemove(null);
      flash("Property removed");
    } finally {
      setRemoving(false);
    }
  }

  return (
    <PageShell title="Property management" subtitle="View and manage active properties">
      <Card>
        <div className="flex items-center justify-between mb-4">
          <PrimaryButton onClick={() => setShowAdd(true)}>
            <Plus size={16} /> New property
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
          <p className="text-center py-10 text-muted-foreground">No properties yet.</p>
        ) : (
          <ul className="divide-y divide-border">
            {list.map((p) => (
              <li key={p.address} className="flex items-center justify-between py-3">
                <div>
                  <div className="font-medium">{p.address}</div>
                  {p.bank && <div className="text-xs text-muted-foreground">{p.bank}</div>}
                </div>
                <button
                  onClick={() => setConfirmRemove(p)}
                  className="inline-flex items-center gap-1.5 text-sm text-destructive border border-destructive/30 rounded-md px-3 py-1.5 hover:bg-destructive/5"
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
              <h3 className="font-display text-lg flex items-center gap-2"><Building2 size={18} /> New property</h3>
              <button type="button" onClick={() => setShowAdd(false)} className="text-muted-foreground hover:text-foreground"><X size={18} /></button>
            </div>
            <div className="p-5 space-y-4">
              <div>
                <Label required>Property address</Label>
                <input autoFocus className={inputCls} value={address} onChange={(e) => setAddress(e.target.value)} placeholder="e.g., 130 Emerald" />
              </div>
              <div>
                <Label required>Bank account</Label>
                <select className={inputCls} value={bank} onChange={(e) => setBank(e.target.value)}>
                  <option value="">Select a bank account…</option>
                  {BANK_ACCOUNTS.map((b) => <option key={b} value={b}>{b}</option>)}
                </select>
              </div>
            </div>
            <div className="p-5 border-t border-border flex justify-end gap-2">
              <button type="button" onClick={() => setShowAdd(false)} className="px-4 py-2 rounded-md border border-border hover:bg-accent text-sm">Cancel</button>
              <PrimaryButton type="submit" disabled={!address.trim() || !bank} loading={adding}>Add property</PrimaryButton>
            </div>
          </form>
        </div>
      )}

      {confirmRemove && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4" onClick={() => !removing && setConfirmRemove(null)}>
          <div className="bg-card border border-border rounded-xl w-full max-w-sm shadow-xl" onClick={(e) => e.stopPropagation()}>
            <div className="p-6">
              <h3 className="font-display text-xl mb-2">Remove property?</h3>
              <p className="text-sm text-muted-foreground">
                Are you sure you want to remove <span className="font-medium text-foreground">{confirmRemove.address}</span>? This cannot be undone.
              </p>
            </div>
            <div className="p-5 border-t border-border flex justify-end gap-2">
              <button type="button" disabled={removing} onClick={() => setConfirmRemove(null)} className="px-4 py-2 rounded-md border border-border hover:bg-accent text-sm">No, cancel</button>
              <button
                type="button"
                disabled={removing}
                onClick={doRemove}
                className="inline-flex items-center gap-2 bg-destructive text-destructive-foreground rounded-md px-4 py-2 text-sm font-medium hover:opacity-90 disabled:opacity-50"
              >
                {removing && <Spinner size={14} />} Yes, remove
              </button>
            </div>
          </div>
        </div>
      )}
    </PageShell>
  );
}
