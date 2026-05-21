"use client";

import { SessionProvider } from "next-auth/react";
import { useEffect } from "react";
import Toast from "./Toast";

export function Providers({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    const savedTheme = localStorage.getItem("clearspace-theme") || "dark";
    if (savedTheme === "system") {
      const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
      document.documentElement.setAttribute("data-theme", prefersDark ? "dark" : "light");
    } else {
      document.documentElement.setAttribute("data-theme", savedTheme);
    }
  }, []);

  return (
    <SessionProvider>
      {children}
      <Toast />
    </SessionProvider>
  );
}

