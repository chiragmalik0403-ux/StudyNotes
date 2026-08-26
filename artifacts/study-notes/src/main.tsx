import { createRoot } from "react-dom/client";
import type { ReactElement } from "react";
import { useEffect, useState } from "react";
import { ClerkProvider, SignIn, SignUp } from "@clerk/react";
import { publishableKeyFromHost } from "@clerk/react/internal";
import { shadcn } from "@clerk/themes";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import App from "./App";
import "./index.css";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 30,
      retry: (failureCount, error) => {
        if ((error as { status?: number })?.status === 401) return false;
        if ((error as { status?: number })?.status === 403) return false;
        return failureCount < 2;
      },
    },
  },
});

const basePath = import.meta.env.BASE_URL.replace(/\/$/, "");
const publishableKey = publishableKeyFromHost(
  window.location.hostname,
  import.meta.env.VITE_CLERK_PUBLISHABLE_KEY as string
);
const clerkProxyUrl = import.meta.env.VITE_CLERK_PROXY_URL as string | undefined;

const clerkAppearance = {
  theme: shadcn,
  variables: {
    colorPrimary: "#b56b35",
    colorForeground: "#183b36",
    colorMutedForeground: "#60766e",
    colorBackground: "#f7f4ee",
    colorInput: "#ffffff",
    colorInputForeground: "#183b36",
    colorNeutral: "#d9ded8",
    fontFamily: "DM Sans, Segoe UI, sans-serif",
    borderRadius: "0.75rem",
  },
};

function SignInPage(): ReactElement {
  return (
    <div className="auth-page">
      <button
        className="auth-back-button"
        type="button"
        onClick={() => window.location.assign(`${basePath}/`)}
      >
        ← Back to home
      </button>
      <SignIn
        routing="path"
        path={`${basePath}/sign-in`}
        signUpUrl={`${basePath}/sign-up`}
        forceRedirectUrl={`${window.location.origin}${basePath}/`}
      />
    </div>
  );
}

function SignUpPage(): ReactElement {
  return (
    <div className="auth-page">
      <button
        className="auth-back-button"
        type="button"
        onClick={() => window.location.assign(`${basePath}/`)}
      >
        ← Back to home
      </button>
      <SignUp
        routing="path"
        path={`${basePath}/sign-up`}
        signInUrl={`${basePath}/sign-in`}
        forceRedirectUrl={`${window.location.origin}${basePath}/`}
      />
    </div>
  );
}

function RoutedApp(): ReactElement {
  const [pathname, setPathname] = useState<string>(() => window.location.pathname);

  useEffect(() => {
    const handlePopState = (): void => setPathname(window.location.pathname);
    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, []);

  if (pathname.startsWith(`${basePath}/sign-in`)) return <SignInPage />;
  if (pathname.startsWith(`${basePath}/sign-up`)) return <SignUpPage />;
  return <App />;
}

createRoot(document.getElementById("root")!).render(
  <ClerkProvider
    publishableKey={publishableKey}
    proxyUrl={clerkProxyUrl}
    appearance={clerkAppearance}
    signInUrl={`${basePath}/sign-in`}
    signUpUrl={`${basePath}/sign-up`}
  >
    <QueryClientProvider client={queryClient}>
      <RoutedApp />
    </QueryClientProvider>
  </ClerkProvider>
);
