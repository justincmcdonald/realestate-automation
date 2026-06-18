export const WEBHOOKS = {
  GET_CONTRACTORS: "https://jumcdo.app.n8n.cloud/webhook/f649218b-8f4d-45cc-937f-82e073cd7fe0",
  GET_PROPERTIES: "https://jumcdo.app.n8n.cloud/webhook/63f1f7d1-676f-474c-96e9-49325d89c753",
  GET_UNPAID_BILLS: "https://jumcdo.app.n8n.cloud/webhook/661cb61f-c7f2-4f51-ad5d-6cdaa11b3d41",
  SUBMIT_INVOICE: "https://jumcdo.app.n8n.cloud/webhook/00fdec1a-192b-4b75-a3d6-4a4a537ad4d7",
  PROPERTY_MANAGEMENT: "https://jumcdo.app.n8n.cloud/webhook/4df4d408-8054-410a-904f-3d962a28db1e",
  PROCESS_PAYMENT: "https://jumcdo.app.n8n.cloud/webhook/4e76ec18-55af-4c08-a50b-d0bc90ae08e4",
  PERSONAL_INVOICE: "https://jumcdo.app.n8n.cloud/webhook/62c4d2d8-d407-4b1d-8ebd-3b27b21fdb16",
  ADD_CONTRACTOR: "https://jumcdo.app.n8n.cloud/webhook/5214eb53-5c0e-48dc-9d98-d952147d0350",
  REMOVE_CONTRACTOR: "https://jumcdo.app.n8n.cloud/webhook/03553788-fd12-468d-b2b0-25f27a4612a6",
};

export const BANK_ACCOUNTS = ["Bank 1", "Bank 2", "Bank 3", "Bank 4", "Bank 5"];

export function fmtMoney(n: number): string {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(n);
}

export function fmtDateShort(iso: string): string {
  if (!iso) return "—";
  const d = new Date(iso + (iso.length === 10 ? "T00:00:00" : ""));
  if (isNaN(d.getTime())) return "—";
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

export function todayISO(): string {
  const d = new Date();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${d.getFullYear()}-${m}-${day}`;
}

export function isPastDue(iso: string): boolean {
  if (!iso) return false;
  const d = new Date(iso + (iso.length === 10 ? "T00:00:00" : ""));
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return d.getTime() < today.getTime();
}
