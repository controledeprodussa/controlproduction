import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  Outlet,
  createRootRouteWithContext,
  HeadContent,
  Scripts,
} from "@tanstack/react-router";
import type { ReactNode } from "react";

import appCss from "../styles.css?url";
import { Toaster } from "@/components/ui/sonner";

function NotFoundComponent() {
  return (
    <div className="flex min-h-[60vh] items-center justify-center">
      <div className="text-center">
        <h1 className="text-6xl font-bold">404</h1>
        <p className="mt-2 text-muted-foreground">Página não encontrada</p>
      </div>
    </div>
  );
}

function ErrorComponent({ error }: { error: Error }) {
  return (
    <div className="p-8">
      <h1 className="text-xl font-semibold">Erro</h1>
      <p className="text-sm text-muted-foreground mt-2">{error.message}</p>
    </div>
  );
}

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { title: "Controle de Produção" },
      { name: "description", content: "Gerenciamento de produção de máquinas industriais" },
      { property: "og:title", content: "Controle de Produção" },
      { name: "twitter:title", content: "Controle de Produção" },
      { property: "og:description", content: "Gerenciamento de produção de máquinas industriais" },
      { name: "twitter:description", content: "Gerenciamento de produção de máquinas industriais" },
      { property: "og:image", content: "https://pub-bb2e103a32db4e198524a2e9ed8f35b4.r2.dev/16442a5b-a025-46aa-b263-5a571beff9cf/id-preview-07e8eee5--fb126982-532f-4668-9d53-feafae3d5729.lovable.app-1782172412875.png" },
      { name: "twitter:image", content: "https://pub-bb2e103a32db4e198524a2e9ed8f35b4.r2.dev/16442a5b-a025-46aa-b263-5a571beff9cf/id-preview-07e8eee5--fb126982-532f-4668-9d53-feafae3d5729.lovable.app-1782172412875.png" },
      { name: "twitter:card", content: "summary_large_image" },
      { property: "og:type", content: "website" },
    ],
    links: [{ rel: "stylesheet", href: appCss }],
  }),
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
  errorComponent: ErrorComponent,
});

function RootShell({ children }: { children: ReactNode }) {
  return (
    <html lang="pt-BR">
      <head>
        <HeadContent />
      </head>
      <body>
        {children}
        <Scripts />
      </body>
    </html>
  );
}

function RootComponent() {
  const { queryClient } = Route.useRouteContext();
  return (
    <QueryClientProvider client={queryClient}>
      <Outlet />
      <Toaster richColors theme="dark" />
    </QueryClientProvider>
  );
}
