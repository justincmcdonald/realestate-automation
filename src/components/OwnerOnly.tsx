import { Link } from "@tanstack/react-router";
import { Lock } from "lucide-react";
import { useAuth } from "@/lib/use-auth";
import { Spinner } from "./ui-kit";

export function OwnerOnly({ children }: { children: React.ReactNode }) {
  const auth = useAuth();

  if (auth.status === "loading") {
    return <div className="flex items-center justify-center min-h-[60vh] text-muted-foreground gap-2"><Spinner /> Loading…</div>;
  }
  if (auth.status === "signed_out") return null; // gate already redirects
  if (auth.role !== "owner") {
    return (
      <div className="max-w-md mx-auto px-6 py-20 text-center">
        <Lock size={36} className="mx-auto text-muted-foreground mb-3" />
        <h2 className="font-display text-2xl">Owners only</h2>
        <p className="text-muted-foreground text-sm mt-2">You don't have access to this page. Ask an owner to grant you owner access.</p>
        <Link to="/" className="inline-block mt-5 text-primary hover:underline text-sm">Back to submit invoice</Link>
      </div>
    );
  }
  return <>{children}</>;
}
