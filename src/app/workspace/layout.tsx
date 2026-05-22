import Sidebar from "@/components/Sidebar";
import AIChatPanel from "@/components/AIChatPanel";
import MobileNav from "@/components/MobileNav";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

export default async function WorkspaceLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  return (
    <div className="app-container">
      <Sidebar />
      <AIChatPanel />
      <main className="main-content">
        {children}
      </main>
      <MobileNav />
    </div>
  );
}
