import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { CheckCircle2 } from "lucide-react";
import { WEBHOOKS, todayISO } from "@/lib/webhooks";
import { Card, Label, PageShell, PrimaryButton, Spinner, inputCls } from "@/components/ui-kit";
import { OwnerOnly } from "@/components/OwnerOnly";

export const Route = createFileRoute("/_authenticated/personal-invoice")({
  head: () => ({ meta: [{ title: "Personal invoice — Reynolds Properties" }] }),
  component: () => <OwnerOnly><PersonalInvoicePage /></OwnerOnly>,
});

type Property = { address: string; bank: string };

function PersonalInvoicePage() {
  const [properties, setProperties] = useState<Property[] | null>(null);
  const [propErr, setPropErr] = useState("");
  const [property, setProperty] = useState("");
  const [item, setItem] = useState("");
  const [store, setStore] = useState("");
  const [price, setPrice] = useState("");
  const [date, setDate] = useState(todayISO());
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [err, setErr] = useState("");

  useEffect(() => {
    fetch(WEBHOOKS.GET_PROPERTIES)
      .then((r) => r.json())
      .then((d) => setProperties(d.properties ?? []))
      .catch(() => setPropErr("Unable to load properties. Please try again."));
  }, []);

  function clear() {
    setProperty(""); setItem(""); setStore(""); setPrice(""); setDate(todayISO()); setSuccess(false);
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!property || !item.trim() || !store.trim() || !price || !date) return;
    setSubmitting(true); setErr("");
    try {
      fetch(WEBHOOKS.PERSONAL_INVOICE, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          property_address: property,
          item: item.trim(),
          store_name: store.trim(),
          price: parseFloat(price),
          date,
        }),
      }).catch(() => {});
      setSuccess(true);
      setTimeout(clear, 1500);
    } catch {
      setErr("Something went wrong. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <PageShell title="Personal invoice" subtitle="Log an out-of-pocket expense directly to a property">
      <Card>
        {success ? (
          <div className="text-center py-6">
            <CheckCircle2 size={44} className="mx-auto text-[color:var(--success)] mb-3" />
            <h2 className="font-display text-xl">Expense added successfully</h2>
          </div>
        ) : (
          <form onSubmit={onSubmit} className="space-y-5">
            <div>
              <Label required>Property</Label>
              {propErr ? <p className="text-sm text-destructive">{propErr}</p>
                : !properties ? <div className="flex items-center gap-2 text-sm text-muted-foreground"><Spinner /> Loading…</div>
                : (
                  <select className={inputCls} value={property} onChange={(e) => setProperty(e.target.value)}>
                    <option value="">Select a property</option>
                    {properties.map((p) => <option key={p.address} value={p.address}>{p.address}</option>)}
                  </select>
                )}
            </div>
            <div>
              <Label required>Item</Label>
              <input className={inputCls} placeholder="e.g., Water hose, lumber, hardware" value={item} onChange={(e) => setItem(e.target.value)} />
            </div>
            <div>
              <Label required>Store / vendor</Label>
              <input className={inputCls} placeholder="Where you bought it (e.g., Home Depot, Lowe's)" value={store} onChange={(e) => setStore(e.target.value)} />
            </div>
            <div>
              <Label required>Price</Label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">$</span>
                <input type="number" step="0.01" min="0" inputMode="decimal"
                  className={inputCls + " pl-7"} placeholder="0.00"
                  value={price} onChange={(e) => setPrice(e.target.value)} />
              </div>
            </div>
            <div>
              <Label required>Date</Label>
              <input type="date" className={inputCls} value={date} onChange={(e) => setDate(e.target.value)} />
            </div>
            {err && <p className="text-sm text-destructive">{err}</p>}
            <PrimaryButton type="submit" loading={submitting}
              disabled={!property || !item.trim() || !store.trim() || !price || !date} className="w-full">
              Add expense
            </PrimaryButton>
          </form>
        )}
      </Card>
    </PageShell>
  );
}
