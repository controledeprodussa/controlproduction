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
        {/* Polyfills para Smart TVs antigas (LG webOS, Philco, etc.) — precisa rodar antes do bundle */}
        <script src="/polyfills.js" />
        <HeadContent />
        {/*
          noModule: só é executado em browsers que NÃO suportam <script type="module">.
          Isso inclui LG WebOS 3/4 e outros browsers de TV com Chromium < 61.
          Nesses casos exibimos uma tela de erro clara em vez de tela branca.
        */}
        <script
          noModule
          dangerouslySetInnerHTML={{
            __html: `
              (function() {
                var s = document.createElement('style');
                s.textContent = 'body{margin:0;background:#0f0f0f;display:flex;align-items:center;justify-content:center;min-height:100vh;font-family:sans-serif;}';
                document.head.appendChild(s);
                document.body.innerHTML = '<div style="text-align:center;padding:40px;color:#fff;max-width:480px">'
                  + '<div style="font-size:64px;margin-bottom:24px">📺</div>'
                  + '<h1 style="font-size:22px;font-weight:700;margin:0 0 16px">Navegador desatualizado</h1>'
                  + '<p style="color:#aaa;font-size:15px;line-height:1.6;margin:0">'
                  + 'O aplicativo <strong style="color:#fff">Controle de Produ\u00e7\u00e3o</strong> requer um navegador moderno.<br><br>'
                  + 'Acesse pelo <strong style="color:#fff">celular</strong>, <strong style="color:#fff">computador</strong> ou uma <strong style="color:#fff">Android TV</strong> para utiliz\u00e1-lo.'
                  + '</p>'
                  + '</div>';
              })();
            `,
          }}
        />
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
