import { ReactNode, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
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
  children?: ReactNode;
}

export function AppLayout({ children }: AppLayoutProps) {
  const breadcrumbs = useBreadcrumbs();
  const isMobile = useIsMobile();
  const { workspace } = useWorkspace();
  const { isAdmin } = useUserRole();
  const [membersDialogOpen, setMembersDialogOpen] = useState(false);
  const location = useLocation();

  // Don't show layout for auth routes
  if (location.pathname === '/auth') {
    return <>{children}</>;
  }

  return (
    <SidebarProvider defaultOpen={!isMobile}>
      <div className="flex min-h-screen w-full">
        <AppSidebar />
        <div className="flex-1 flex flex-col">
          <header className={cn("border-b border-border/50 bg-card/30 backdrop-blur-xl flex items-center justify-between", isMobile ? "h-12 px-3" : "h-14 px-4")}>
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
          <main className="flex-1">
            {children}
          </main>
        </div>
      </div>
      
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