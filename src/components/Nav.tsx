import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { Check, ChevronDown, LogOut } from "lucide-react";
import { signOut, useAuth } from "@/lib/use-auth";
import logo from "@/assets/reynolds-logo.png.asset.json";

type PageDef = { to: string; label: string; ownerOnly?: boolean };

const ALL_PAGES: PageDef[] = [
  { to: "/admin", label: "Admin dashboard", ownerOnly: true },
  { to: "/contractor-management", label: "Contractor management", ownerOnly: true },
  { to: "/pay-bills", label: "Pay bills", ownerOnly: true },
  { to: "/personal-invoice", label: "Personal invoice", ownerOnly: true },
  { to: "/property-management", label: "Property management", ownerOnly: true },
  { to: "/", label: "Submit invoice" },
].sort((a, b) => a.label.localeCompare(b.label));

export function Nav() {
  const auth = useAuth();
  const navigate = useNavigate();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  if (pathname === "/auth") return null;

  const isOwner = auth.status === "signed_in" && auth.role === "owner";
  const pages = ALL_PAGES.filter((p) => !p.ownerOnly || isOwner);
  const current = pages.find((p) => p.to === pathname) ?? pages[0];

  async function handleSignOut() {
    await signOut();
    navigate({ to: "/auth", replace: true });
  }

  return (
    <header className="border-b border-border bg-card/70 backdrop-blur sticky top-0 z-40">
      <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between gap-3">
        <Link to="/" className="flex items-center gap-3 leading-tight">
          <img src={logo.url} alt="Reynolds Properties" className="h-10 w-10 object-contain" />
          <span className="flex flex-col">
            <span className="font-display text-lg">Reynolds Properties</span>
            <span className="text-xs text-muted-foreground tracking-wide">Est. 2021</span>
          </span>
        </Link>

        <div className="flex items-center gap-2">
          {auth.status === "signed_in" && (
            <div ref={ref} className="relative">
              <button
                onClick={() => setOpen((o) => !o)}
                className="flex items-center gap-2 px-4 py-2 rounded-md border border-border bg-background hover:bg-accent transition text-sm"
              >
                {current?.label ?? "Menu"}
                <ChevronDown size={16} className={open ? "rotate-180 transition" : "transition"} />
              </button>
              {open && (
                <div className="absolute right-0 mt-2 w-64 bg-popover border border-border rounded-lg shadow-lg overflow-hidden z-50">
                  {pages.map((p) => {
                    const active = p.to === pathname;
                    return (
                      <Link key={p.to} to={p.to} onClick={() => setOpen(false)}
                        className="flex items-center justify-between px-4 py-2.5 text-sm hover:bg-accent transition">
                        <span className={active ? "font-medium" : ""}>{p.label}</span>
                        {active && <Check size={16} className="text-primary" />}
                      </Link>
                    );
                  })}
                  <div className="border-t border-border">
                    <div className="px-4 py-2 text-xs text-muted-foreground truncate">
                      {auth.email} <span className="opacity-60">· {auth.role ?? "no role"}</span>
                    </div>
                    <button onClick={handleSignOut}
                      className="w-full text-left flex items-center gap-2 px-4 py-2.5 text-sm hover:bg-accent transition">
                      <LogOut size={14} /> Sign out
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
