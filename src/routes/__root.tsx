import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  Outlet,
  Link,
  createRootRouteWithContext,
  useRouter,
  HeadContent,
  Scripts,
  type ErrorComponentProps,
} from "@tanstack/react-router";
import { useEffect, useState, type ReactNode } from "react";

import appCss from "../styles.css?url";
import { AuthProvider, useAuth } from "../lib/auth-context";
import { I18nContext, translations, type Lang } from "../lib/i18n";
import { Toaster } from "../components/ui/sonner";
import { supabase } from "../integrations/supabase/client";

function NotFoundComponent() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-7xl font-bold text-foreground">404</h1>
        <h2 className="mt-4 text-xl font-semibold text-foreground">Page not found</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          The page you're looking for doesn't exist or has been moved.
        </p>
        <div className="mt-6">
          <Link
            to="/"
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Go home
          </Link>
        </div>
      </div>
    </div>
  );
}

function ErrorComponent({ error, reset }: ErrorComponentProps) {
  console.error(error);
  const router = useRouter();

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-xl font-semibold tracking-tight text-foreground">
          This page didn't load
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Something went wrong on our end. You can try refreshing or head back home.
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-2">
          <button
            onClick={() => {
              router.invalidate();
              reset();
            }}
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Try again
          </button>
          <a
            href="/"
            className="inline-flex items-center justify-center rounded-md border border-input bg-background px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-accent"
          >
            Go home
          </a>
        </div>
      </div>
    </div>
  );
}

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1, viewport-fit=cover" },
      { title: "EnergyTracker — Tracker zużycia prądu" },
      {
        name: "description",
        content: "Śledź odczyty licznika, analizuj zużycie i koszty energii elektrycznej.",
      },
      { name: "theme-color", content: "#1a1d2e" },
      { property: "og:title", content: "EnergyTracker — Tracker zużycia prądu" },
      {
        property: "og:description",
        content: "Śledź odczyty licznika, analizuj zużycie i koszty energii elektrycznej.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "twitter:title", content: "EnergyTracker — Tracker zużycia prądu" },
      {
        name: "twitter:description",
        content: "Śledź odczyty licznika, analizuj zużycie i koszty energii elektrycznej.",
      },
      {
        property: "og:image",
        content: "https://home-power-log.vercel.app/icon-512.png",
      },
      {
        name: "twitter:image",
        content: "https://home-power-log.vercel.app/icon-512.png",
      },
    ],
    links: [
      {
        rel: "stylesheet",
        href: appCss,
      },
      { rel: "manifest", href: "/manifest.webmanifest" },
      { rel: "icon", href: "/icon-192.png", type: "image/png" },
      { rel: "apple-touch-icon", href: "/icon-192.png" },
    ],
  }),
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
  errorComponent: ErrorComponent,
});

function RootShell({ children }: { children: ReactNode }) {
  return (
    <html lang="pl" className="dark">
      <head>
        <HeadContent />
      </head>
      <body className="bg-background text-foreground antialiased">
        {children}
        <Scripts />
      </body>
    </html>
  );
}

function RootComponent() {
  const { queryClient } = Route.useRouteContext();
  const [lang, setLangState] = useState<Lang>("pl");

  useEffect(() => {
    const stored = window.localStorage.getItem("energy-tracker-language");
    if (stored === "pl" || stored === "en") setLangState(stored);
  }, []);

  const setLang = (l: Lang) => {
    setLangState(l);
    window.localStorage.setItem("energy-tracker-language", l);
    supabase.auth.getUser().then(({ data }) => {
      if (data.user) {
        supabase.from("profiles").update({ language: l }).eq("id", data.user.id).then();
      }
    });
  };

  return (
    <QueryClientProvider client={queryClient}>
      <I18nContext.Provider value={{ lang, t: translations[lang], setLang }}>
        <AuthProvider>
          <LanguageProfileSync onLanguage={setLangState} />
          <Outlet />
          <Toaster theme="dark" position="top-center" />
        </AuthProvider>
      </I18nContext.Provider>
    </QueryClientProvider>
  );
}

function LanguageProfileSync({ onLanguage }: { onLanguage: (language: Lang) => void }) {
  const { user } = useAuth();

  useEffect(() => {
    if (!user) return;

    let cancelled = false;
    supabase
      .from("profiles")
      .select("language")
      .eq("id", user.id)
      .maybeSingle()
      .then(({ data }) => {
        if (!cancelled && data && (data.language === "pl" || data.language === "en")) {
          window.localStorage.setItem("energy-tracker-language", data.language);
          onLanguage(data.language);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [user, onLanguage]);

  return null;
}
