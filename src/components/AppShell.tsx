import { Link, useRouterState } from "@tanstack/react-router";
import { LayoutDashboard, PlusCircle, Cog, Menu, X, Factory } from "lucide-react";
import { useState, type ReactNode } from "react";
import { cn } from "@/lib/utils";

const nav = [
  { to: "/", label: "Dashboard", icon: LayoutDashboard, exact: true },
  { to: "/criar", label: "Criar", icon: PlusCircle, exact: false },
  { to: "/maquinas", label: "Máquinas", icon: Cog, exact: false },
];

export function AppShell({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false);
  const pathname = useRouterState({ select: (r) => r.location.pathname });

  const isActive = (to: string, exact: boolean) =>
    exact ? pathname === to : pathname === to || pathname.startsWith(to + "/");

  const SidebarContent = (
    <div className="flex h-full flex-col p-4 gap-2">
      <div className="flex items-center gap-2 px-2 py-3 mb-2">
        <div className="size-9 rounded-xl bg-primary/15 ring-1 ring-primary/30 flex items-center justify-center">
          <Factory className="size-5 text-primary" />
        </div>
        <div>
          <div className="font-semibold tracking-tight">Controle</div>
          <div className="text-xs text-muted-foreground">de Produção</div>
        </div>
      </div>
      <nav className="flex flex-col gap-1">
        {nav.map((n) => {
          const active = isActive(n.to, n.exact);
          return (
            <Link
              key={n.to}
              to={n.to}
              onClick={() => setOpen(false)}
              className={cn(
                "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors",
                active ? "bg-accent text-accent-foreground" : "text-muted-foreground hover:bg-accent/50 hover:text-foreground",
              )}
            >
              <n.icon className="size-4" />
              {n.label}
            </Link>
          );
        })}
      </nav>
      <div className="mt-auto rounded-xl bg-secondary/60 p-3 text-xs text-muted-foreground">
        Sistema interno · v1.0
      </div>
    </div>
  );

  return (
    <div className="min-h-screen flex w-full bg-background">
      {/* Desktop sidebar */}
      <aside className="hidden md:flex w-64 shrink-0 border-r border-border bg-card/40">
        {SidebarContent}
      </aside>

      {/* Mobile drawer */}
      {open && (
        <div className="md:hidden fixed inset-0 z-50">
          <div className="absolute inset-0 bg-black/60" onClick={() => setOpen(false)} />
          <aside className="absolute left-0 top-0 h-full w-72 bg-card border-r border-border animate-in slide-in-from-left">
            <div className="flex justify-end p-2">
              <button onClick={() => setOpen(false)} className="p-2 rounded-lg hover:bg-accent">
                <X className="size-5" />
              </button>
            </div>
            {SidebarContent}
          </aside>
        </div>
      )}

      <div className="flex-1 flex flex-col min-w-0">
        <header className="md:hidden h-14 flex items-center gap-2 border-b border-border px-3 bg-card/40 backdrop-blur sticky top-0 z-30">
          <button onClick={() => setOpen(true)} className="p-2 rounded-lg hover:bg-accent">
            <Menu className="size-5" />
          </button>
          <div className="font-semibold">Controle</div>
        </header>
        <main className="flex-1 p-4 md:p-8 max-w-[1400px] w-full mx-auto">
          {children}
        </main>
      </div>
    </div>
  );
}
