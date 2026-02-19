import { Header } from "@/components/layout/Header";
import { Sidebar } from "@/components/layout/Sidebar";
import { TabBar } from "@/components/layout/TabBar";
import { ModuleContainer } from "@/components/layout/ModuleContainer";
import { KeyboardShortcutsProvider } from "@/components/layout/KeyboardShortcutsProvider";

export default function Home() {
  return (
    <KeyboardShortcutsProvider>
      <div className="h-screen flex flex-col overflow-hidden">
        <Header />
        <div className="flex flex-1 overflow-hidden">
          <Sidebar />
          <div className="flex-1 flex flex-col overflow-hidden">
            <TabBar />
            <main className="relative flex-1 overflow-y-auto p-4 md:p-6">
              <ModuleContainer />
            </main>
          </div>
        </div>
      </div>
    </KeyboardShortcutsProvider>
  );
}
