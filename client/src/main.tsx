import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { QueryClientProvider } from "@tanstack/react-query";
import { queryClient } from "./lib/queryClient";
import { Toaster } from "@/components/ui/toaster";
import App from './App';
import "./index.css";

const AppWrapper = process.env.NODE_ENV === 'development' 
  ? ({ children }: { children: React.ReactNode }) => children
  : StrictMode;

createRoot(document.getElementById("root")!).render(
  <AppWrapper>
    <QueryClientProvider client={queryClient}>
      <App />
      <Toaster />
    </QueryClientProvider>
  </AppWrapper>,
);
