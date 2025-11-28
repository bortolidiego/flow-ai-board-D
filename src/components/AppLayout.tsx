import { ReactNode, useState } from 'react';
import { Link } from 'react-router-dom';
import { SidebarProvider, SidebarTrigger, SidebarInset } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/AppSidebar";
import { useIsMobile } from '@/hooks/use-mobile';
import { cn } from '@/lib/utils';
import {
  Breadcrumb,
  BreadcrumbList,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbSeparator,
  BreadcrumbPage
} from "@/components/ui/breadcrumb";
import { Button } from "@/components/ui/button";
import { useBreadcrumbs } from "@/hooks/useBreadcrumbs";
import { useWorkspace } from "@/hooks/useWorkspace";
import { useUserRole } from "@/hooks/useUserRole";
import { WorkspaceMembersDialog } from "@/components/WorkspaceMembersDialog";
import { Users } from "lucide-react";

interface AppLayoutProps {
  children: ReactNode;
}

export function AppLayout({ children }: AppLayoutProps) {
  const breadcrumbs = useBreadcrumbs();
  const isMobile = useIsMobile();
  const { workspace } = useWorkspace();
  const { isAdmin } = useUserRole();
  const [membersDialogOpen, setMembersDialogOpen] = useState(false);
  const location = window.location;
  const isChatwootSidebar = location.pathname === '/chatwoot-sidebar' || window.self !== window.top;

  return (
    <SidebarProvider defaultOpen={!isMobile && !isChatwootSidebar}>
      {!isChatwootSidebar && <AppSidebar />}

      {/* SidebarInset é crucial para o funcionamento correto da sidebar expansível */}
      <SidebarInset className="flex flex-col h-screen overflow-hidden">
        {!isChatwootSidebar && (
          <header className={cn("border-b border-border/50 bg-card/30 backdrop-blur-xl flex items-center justify-between shrink-0", isMobile ? "h-12 px-3" : "h-14 px-4")}>
            <div className="flex items-center flex-1">
              <SidebarTrigger className={cn(isMobile ? "mr-2" : "mr-4")} />
              {!isMobile && (
                <Breadcrumb>
                  <BreadcrumbList>
                    {breadcrumbs.map((item, index) =>
                      index < breadcrumbs.length - 1
                        ? [
                          <BreadcrumbItem key={index}>
                            <BreadcrumbLink asChild>
                              <Link to={item.href || '#'}>{item.label}</Link>
                            </BreadcrumbLink>
                          </BreadcrumbItem>,
                          <BreadcrumbSeparator key={`sep-${index}`} />
                        ]
                        : (
                          <BreadcrumbItem key={index}>
                            <BreadcrumbPage>{item.label}</BreadcrumbPage>
                          </BreadcrumbItem>
                        )
                    )}
                  </BreadcrumbList>
                </Breadcrumb>
              )}
            </div>
            {isAdmin && workspace && (
              <Button
                variant="ghost"
                size={isMobile ? "sm" : "default"}
                onClick={() => setMembersDialogOpen(true)}
                className="ml-2"
              >
                <Users className="w-4 h-4 mr-2" />
                {!isMobile && "Membros"}
              </Button>
            )}
          </header>
        )}

        <main className="flex-1 overflow-hidden flex flex-col relative">
          {children}
        </main>
      </SidebarInset>

      {workspace && (
        <WorkspaceMembersDialog
          open={membersDialogOpen}
          onOpenChange={setMembersDialogOpen}
          workspaceId={workspace.id}
        />
      )}
    </SidebarProvider>
  );
}