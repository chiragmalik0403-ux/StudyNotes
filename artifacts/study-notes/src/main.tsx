import { createRoot } from "react-dom/client";
import { ClerkProvider } from "@clerk/react";
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

const publishableKey = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY as string;

// In dev this env var is empty; Replit sets it automatically in production
const clerkProxyUrl = import.meta.env.VITE_CLERK_PROXY_URL as string | undefined;

createRoot(document.getElementById("root")!).render(
  <ClerkProvider publishableKey={publishableKey} proxyUrl={clerkProxyUrl}>
    <QueryClientProvider client={queryClient}>
      <App />
    </QueryClientProvider>
  </ClerkProvider>
);
