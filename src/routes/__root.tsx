import { TanStackDevtools } from "@tanstack/react-devtools";
import { type QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { HeadContent, Outlet, Scripts, createRootRouteWithContext } from "@tanstack/react-router";
import { TanStackRouterDevtoolsPanel } from "@tanstack/react-router-devtools";

import { ThemeProvider } from "@/providers/theme";

import DefaultNotFoundComponent from "@/components/shared/default-not-found";
import { TooltipProvider } from "@/components/ui/tooltip";

import "../styles.css";

export const Route = createRootRouteWithContext<{
  queryClient: QueryClient;
}>()({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { title: "Weather Trends" },
      {
        name: "description",
        content: "A data visualization project exploring weather patterns over time.",
      },
      { name: "theme-color", content: "#973c00" },
      { property: "og:type", content: "website" },
      { property: "og:title", content: "Weather Trends" },
      {
        property: "og:description",
        content: "A data visualization project exploring weather patterns over time.",
      },
      { property: "og:image", content: "/assets/pwa-512x512.png" },
      { name: "twitter:card", content: "summary" },
      { name: "twitter:title", content: "Weather Trends" },
      {
        name: "twitter:description",
        content: "A data visualization project exploring weather patterns over time.",
      },
      { name: "twitter:image", content: "/assets/pwa-512x512.png" },
    ],
    links: [
      { rel: "manifest", href: "/manifest.json" },
      { rel: "icon", href: "/favicon.svg", sizes: "any", type: "image/svg+xml" },
      { rel: "icon", href: "/assets/pwa-64x64.png", type: "image/png", sizes: "64x64" },
      { rel: "apple-touch-icon", href: "/assets/apple-touch-icon-180x180.png", sizes: "180x180" },
    ],
  }),
  component: RootComponent,
  notFoundComponent: () => <DefaultNotFoundComponent />,
  shellComponent: RootDocument,
});

function RootComponent() {
  const { queryClient } = Route.useRouteContext();

  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider defaultTheme="system" storageKey="theme">
        <TooltipProvider>
          <Outlet />
        </TooltipProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}

function RootDocument({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <HeadContent />
      </head>
      <body>
        {children}
        <TanStackDevtools
          config={{
            position: "bottom-right",
          }}
          plugins={[
            {
              name: "Tanstack Router",
              render: <TanStackRouterDevtoolsPanel />,
            },
          ]}
        />
        <Scripts />
      </body>
    </html>
  );
}
