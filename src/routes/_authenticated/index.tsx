import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { CheckCircle2 } from "lucide-react";
import { WEBHOOKS, fmtMoney } from "@/lib/webhooks";
import { Card, Label, PageShell, PrimaryButton, Spinner, inputCls } from "@/components/ui-kit";

export const Route = createFileRoute("/_authenticated/")({
  head: () => ({
    meta: [
      { title: "Submit an invoice — Reynolds Properties" },
      { name: "description", content: "Contractors: submit an invoice to Reynolds Properties." },
    ],
  }),
  component: SubmitInvoicePage,
});

type Contractor = { name: string; vendor_id: string };
type Property = { address: string; bank: string };

function SubmitInvoicePage() {
  const [contractors, setContractors] = useState<Contractor[] | null>(null);
  const [contractorsErr, setContractorsErr] = useState("");
  const [properties, setProperties] = useState<Property[] | null>(null);
  const [propertiesErr, setPropertiesErr] = useState("");
  const [loadingProps, setLoadingProps] = useState(false);

  const [contractor, setContractor] = useState<Contractor | null>(null);
  const [property, setProperty] = useState<Property | null>(null);
  const [description, setDescription] = useState("");
  const [amount, setAmount] = useState("");
  const [paymentDate, setPaymentDate] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitErr, setSubmitErr] = useState("");
  const [success, setSuccess] = useState<{ name: string; property: string; amount: number } | null>(null);

  useEffect(() => {
    fetch(WEBHOOKS.GET_CONTRACTORS)
      .then((r) => r.json())
      .then((d) => setContractors(d.contractors ?? []))
      .catch(() => setContractorsErr("Unable to load contractors. Please refresh."));
  }, []);

  useEffect(() => {
    if (!contractor) return;
    if (properties) return;
    setLoadingProps(true);
    fetch(WEBHOOKS.GET_PROPERTIES)
      .then((r) => r.json())
      .then((d) => setProperties(d.properties ?? []))
      .catch(() => setPropertiesErr("Unable to load properties. Please try again."))
      .finally(() => setLoadingProps(false));
  }, [contractor, properties]);

  const canSubmit = contractor && property && description.trim() && amount && paymentDate;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!canSubmit) return;
    setSubmitting(true);
    setSubmitErr("");
    const payload = {
      contractor_name: contractor!.name,
      vendor_id: contractor!.vendor_id,
      property_address: property!.address,
      description: description.trim(),
      amount: parseFloat(amount),
      payment_date: paymentDate,
    };
    try {
      fetch(WEBHOOKS.SUBMIT_INVOICE, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      }).catch(() => {});
      setSuccess({ name: contractor!.name, property: property!.address, amount: parseFloat(amount) });
    } catch {
      setSubmitErr("Something went wrong. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  function reset() {
    setContractor(null);
    setProperty(null);
    setDescription("");
    setAmount("");
    setPaymentDate("");
    setSuccess(null);
  }

  if (success) {
    return (
      <PageShell title="Submit an invoice">
        <Card className="text-center">
          <CheckCircle2 size={48} className="mx-auto text-[color:var(--success)] mb-3" />
          <h2 className="font-display text-2xl mb-1">Invoice submitted successfully</h2>
          <p className="text-muted-foreground text-sm">
            Submitted by {success.name} for {success.property} — {fmtMoney(success.amount)}
          </p>
          <div className="mt-6">
            <PrimaryButton onClick={reset}>Submit another invoice</PrimaryButton>
          </div>
        </Card>
      </PageShell>
    );
  }

  return (
    <PageShell title="Submit an invoice" subtitle="Select your name, then the property you're billing for">
      <form onSubmit={handleSubmit}>
        <Card>
          <div className="space-y-5">
            <div>
              <Label required>Your name</Label>
              {contractorsErr ? (
                <p className="text-sm text-destructive">{contractorsErr}</p>
              ) : !contractors ? (
                <div className="flex items-center gap-2 text-sm text-muted-foreground"><Spinner /> Loading contractors…</div>
              ) : (
                <select
                  className={inputCls}
                  value={contractor?.name ?? ""}
                  onChange={(e) => {
                    const c = contractors.find((x) => x.name === e.target.value) ?? null;
                    setContractor(c);
                    setProperty(null);
                  }}
                >
                  <option value="">Select your name</option>
                  {contractors.map((c) => <option key={c.vendor_id + c.name} value={c.name}>{c.name}</option>)}
                </select>
              )}
            </div>

            {contractor && (
              <div>
                <Label required>Property</Label>
                {propertiesErr ? (
                  <p className="text-sm text-destructive">{propertiesErr}</p>
                ) : loadingProps || !properties ? (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground"><Spinner /> Loading properties…</div>
                ) : (
                  <select
                    className={inputCls}
                    value={property?.address ?? ""}
                    onChange={(e) => setProperty(properties.find((p) => p.address === e.target.value) ?? null)}
                  >
                    <option value="">Select a property</option>
                    {properties.map((p) => <option key={p.address} value={p.address}>{p.address}</option>)}
                  </select>
                )}
              </div>
            )}

            {property && (
              <>
                <div>
                  <Label required>Service / description</Label>
                  <textarea
                    rows={3}
                    className={inputCls}
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="What did you do?"
                  />
                </div>
                <div>
                  <Label required>Amount</Label>
                  <input
                    type="number" step="0.01" min="0" inputMode="decimal"
                    className={inputCls}
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    placeholder="0.00"
                  />
                </div>
                <div>
                  <Label required>Requested payment date</Label>
                  <input
                    type="date"
                    className={inputCls}
                    value={paymentDate}
                    onChange={(e) => setPaymentDate(e.target.value)}
                  />
                </div>
              </>
            )}

            {submitErr && <p className="text-sm text-destructive">{submitErr}</p>}

            <PrimaryButton type="submit" disabled={!canSubmit} loading={submitting} className="w-full">
              Submit invoice
            </PrimaryButton>
          </div>
        </Card>
      </form>
    </PageShell>
  );
}
