import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "./AppSidebar";
import { Toaster } from "@/components/ui/toaster";
import { useIsMobile } from "@/hooks/use-mobile";

interface AppLayoutProps {
  children: React.ReactNode;
}

export function AppLayout({ children }: AppLayoutProps) {
  const isMobile = useIsMobile();

  return (
    <SidebarProvider>
      <div className="flex h-full w-full overflow-hidden bg-background">
        <AppSidebar />
        <div className="flex-1 flex flex-col h-full w-full overflow-hidden relative">
          {isMobile && (
            <div className="absolute top-4 left-4 z-50 md:hidden">
              <SidebarTrigger />
            </div>
          )}
          <main className="flex-1 w-full h-full overflow-hidden">
            {children}
          </main>
        </div>
      </div>
      <Toaster />
    </SidebarProvider>
  );
}