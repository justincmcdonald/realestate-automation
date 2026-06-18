import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { ArrowDown, ArrowUp, CheckCircle2, Printer, RefreshCw, X } from "lucide-react";
import { WEBHOOKS, fmtDateShort, fmtMoney, isPastDue, todayISO } from "@/lib/webhooks";
import { Card, Label, PageShell, PrimaryButton, Spinner, inputCls } from "@/components/ui-kit";
import { OwnerOnly } from "@/components/OwnerOnly";

export const Route = createFileRoute("/_authenticated/pay-bills")({
  head: () => ({ meta: [{ title: "Pay bills — Reynolds Properties" }] }),
  component: () => <OwnerOnly><PayBillsPage /></OwnerOnly>,
});

type Bill = {
  id: string; vendor_name: string; vendor_id: string;
  amount: number; balance: number; bill_date: string; due_date: string;
  description: string; bill_number: string;
};
type Property = { address: string; bank: string };
type SortKey = "vendor_name" | "balance" | "due_date" | "description";

function PayBillsPage() {
  const [bills, setBills] = useState<Bill[] | null>(null);
  const [err, setErr] = useState("");
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [sortKey, setSortKey] = useState<SortKey>("due_date");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");
  const [activeBill, setActiveBill] = useState<Bill | null>(null);

  function load() {
    setLoading(true); setErr("");
    fetch(WEBHOOKS.GET_UNPAID_BILLS)
      .then((r) => r.json())
      .then((d) => setBills(d.bills ?? []))
      .catch(() => setErr("Unable to load bills. Please try again."))
      .finally(() => setLoading(false));
  }

  useEffect(() => { load(); }, []);

  const filtered = useMemo(() => {
    if (!bills) return [];
    const q = search.toLowerCase().trim();
    const list = q ? bills.filter((b) => b.vendor_name.toLowerCase().includes(q)) : bills.slice();
    list.sort((a, b) => {
      let av: any = a[sortKey]; let bv: any = b[sortKey];
      if (sortKey === "due_date") { av = av || ""; bv = bv || ""; }
      if (typeof av === "string") { av = av.toLowerCase(); bv = (bv ?? "").toString().toLowerCase(); }
      if (av < bv) return sortDir === "asc" ? -1 : 1;
      if (av > bv) return sortDir === "asc" ? 1 : -1;
      return 0;
    });
    return list;
  }, [bills, search, sortKey, sortDir]);

  function toggleSort(k: SortKey) {
    if (sortKey === k) setSortDir(sortDir === "asc" ? "desc" : "asc");
    else { setSortKey(k); setSortDir("asc"); }
  }

  const total = filtered.reduce((s, b) => s + (b.balance || 0), 0);

  return (
    <PageShell title="Unpaid bills" subtitle="Select a bill to record payment">
      <div className="flex flex-wrap items-end justify-between gap-3 mb-4">
        <div className="text-sm">
          <span className="font-medium">{filtered.length} unpaid bill{filtered.length === 1 ? "" : "s"}</span>
          <span className="text-muted-foreground"> · Total {fmtMoney(total)}</span>
        </div>
        <div className="flex items-center gap-2">
          <input
            className={inputCls + " w-56"}
            placeholder="Search vendor…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <button
            onClick={load}
            disabled={loading}
            className="inline-flex items-center gap-2 px-3 py-2 rounded-md border border-border bg-background hover:bg-accent text-sm disabled:opacity-50"
          >
            <RefreshCw size={14} className={loading ? "animate-spin" : ""} /> Refresh
          </button>
        </div>
      </div>

      <Card className="!p-0 overflow-hidden">
        {loading && !bills ? (
          <div className="flex items-center justify-center gap-2 py-16 text-muted-foreground"><Spinner /> Loading bills…</div>
        ) : err ? (
          <div className="text-center py-16">
            <p className="text-destructive mb-3">{err}</p>
            <PrimaryButton onClick={load}>Retry</PrimaryButton>
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-16 text-muted-foreground">No unpaid bills 🎉</div>
        ) : (
          <table className="w-full text-sm">
            <thead className="border-b border-border bg-muted/40 text-muted-foreground">
              <tr>
                <Th k="vendor_name" label="Vendor" sortKey={sortKey} dir={sortDir} onClick={toggleSort} />
                <Th k="balance" label="Amount" sortKey={sortKey} dir={sortDir} onClick={toggleSort} align="right" />
                <Th k="due_date" label="Due" sortKey={sortKey} dir={sortDir} onClick={toggleSort} />
                <Th k="description" label="Description" sortKey={sortKey} dir={sortDir} onClick={toggleSort} />
                <th className="text-right px-4 py-3 font-medium">Action</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((b) => {
                const past = isPastDue(b.due_date);
                return (
                  <tr key={b.id} className={`border-b border-border last:border-0 hover:bg-accent/30 ${past ? "bg-destructive/5" : ""}`}>
                    <td className="px-4 py-3">{b.vendor_name}</td>
                    <td className="px-4 py-3 text-right tabular-nums">{fmtMoney(b.balance)}</td>
                    <td className="px-4 py-3">
                      {fmtDateShort(b.due_date)}
                      {past && b.due_date && <span className="ml-2 text-destructive text-xs">· Past due</span>}
                    </td>
                    <td className="px-4 py-3 text-muted-foreground truncate max-w-[260px]">{b.description || "—"}</td>
                    <td className="px-4 py-3 text-right">
                      <PrimaryButton onClick={() => setActiveBill(b)} className="!py-1.5 !px-3">Pay</PrimaryButton>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </Card>

      {activeBill && (
        <PaymentModal bill={activeBill} onClose={() => setActiveBill(null)} onPaid={() => { setActiveBill(null); load(); }} />
      )}
    </PageShell>
  );
}

function Th({ k, label, sortKey, dir, onClick, align }: {
  k: SortKey; label: string; sortKey: SortKey; dir: "asc" | "desc"; onClick: (k: SortKey) => void; align?: "right";
}) {
  const active = sortKey === k;
  return (
    <th className={`px-4 py-3 font-medium ${align === "right" ? "text-right" : "text-left"}`}>
      <button onClick={() => onClick(k)} className="inline-flex items-center gap-1 hover:text-foreground transition">
        {label}
        {active ? (dir === "asc" ? <ArrowUp size={12} /> : <ArrowDown size={12} />) : <span className="opacity-30">↕</span>}
      </button>
    </th>
  );
}

function PaymentModal({ bill, onClose, onPaid }: { bill: Bill; onClose: () => void; onPaid: () => void }) {
  const [properties, setProperties] = useState<Property[] | null>(null);
  const [propErr, setPropErr] = useState("");
  const [property, setProperty] = useState<Property | null>(null);
  const [paymentDate, setPaymentDate] = useState(todayISO());
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState<{ printUrl?: string } | null>(null);
  const [submitErr, setSubmitErr] = useState("");

  useEffect(() => {
    fetch(WEBHOOKS.GET_PROPERTIES)
      .then((r) => r.json())
      .then((d) => setProperties(d.properties ?? []))
      .catch(() => setPropErr("Unable to load properties. Please try again."));
  }, []);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!property || !paymentDate) return;
    setSubmitting(true); setSubmitErr("");
    try {
      const res = await fetch(WEBHOOKS.PROCESS_PAYMENT, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          bill_id: bill.id,
          vendor_name: bill.vendor_name,
          vendor_id: bill.vendor_id,
          amount: bill.balance,
          bill_date: bill.bill_date,
          description: bill.description,
          property_address: property.address,
          bank_account: property.bank,
          payment_date: paymentDate,
        }),
      });
      let data: any = {};
      try { data = await res.json(); } catch {}
      setDone({ printUrl: data?.printUrl });
    } catch {
      setSubmitErr("Something went wrong. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4" onClick={onClose}>
      <div className="bg-card border border-border rounded-xl w-full max-w-lg shadow-xl" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between p-5 border-b border-border">
          <h3 className="font-display text-xl">{done ? "Payment recorded" : "Record payment"}</h3>
          <button onClick={done ? onPaid : onClose} className="text-muted-foreground hover:text-foreground"><X size={18} /></button>
        </div>

        {done ? (
          <div className="p-6 text-center">
            <CheckCircle2 size={44} className="mx-auto text-[color:var(--success)] mb-3" />
            <p className="font-medium">Payment recorded successfully</p>
            <div className="mt-5 flex flex-col gap-2">
              {done.printUrl && (
                <a href={done.printUrl} target="_blank" rel="noreferrer"
                  className="inline-flex items-center justify-center gap-2 border border-border rounded-md py-2.5 px-4 text-sm hover:bg-accent">
                  <Printer size={16} /> Print check in QuickBooks
                </a>
              )}
              <PrimaryButton onClick={onPaid}>Done</PrimaryButton>
            </div>
          </div>
        ) : (
          <form onSubmit={submit}>
            <div className="p-5 border-b border-border bg-muted/30 text-sm space-y-1">
              <div className="flex justify-between"><span className="text-muted-foreground">Vendor</span><span className="font-medium">{bill.vendor_name}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Amount</span><span className="font-medium tabular-nums">{fmtMoney(bill.balance)}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Bill date</span><span>{fmtDateShort(bill.bill_date)}</span></div>
              <div className="flex justify-between gap-3"><span className="text-muted-foreground">Description</span><span className="text-right">{bill.description || "—"}</span></div>
            </div>
            <div className="p-5 space-y-4">
              <div>
                <Label required>Property</Label>
                {propErr ? <p className="text-sm text-destructive">{propErr}</p>
                  : !properties ? <div className="flex items-center gap-2 text-sm text-muted-foreground"><Spinner /> Loading…</div>
                  : (
                    <select className={inputCls} value={property?.address ?? ""}
                      onChange={(e) => setProperty(properties.find((p) => p.address === e.target.value) ?? null)}>
                      <option value="">Select a property</option>
                      {properties.map((p) => <option key={p.address} value={p.address}>{p.address}</option>)}
                    </select>
                  )}
              </div>
              <div>
                <Label>Bank account</Label>
                <div className={inputCls + " bg-muted/40 text-muted-foreground"}>{property?.bank || "—"}</div>
              </div>
              <div>
                <Label required>Payment date</Label>
                <input type="date" className={inputCls} value={paymentDate} onChange={(e) => setPaymentDate(e.target.value)} />
              </div>
              {submitErr && <p className="text-sm text-destructive">{submitErr}</p>}
            </div>
            <div className="p-5 border-t border-border flex justify-end gap-2">
              <button type="button" onClick={onClose} className="px-4 py-2 rounded-md border border-border hover:bg-accent text-sm">Cancel</button>
              <PrimaryButton type="submit" disabled={!property} loading={submitting}>Record payment</PrimaryButton>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
