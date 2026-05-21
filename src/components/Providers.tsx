"use client";

import { SessionProvider } from "next-auth/react";
import Toast from "./Toast";

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <SessionProvider>
      {children}
      <Toast />
    </SessionProvider>
  );
}
