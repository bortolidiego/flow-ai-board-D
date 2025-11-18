import { LayoutDashboard, Brain, Bot, Sparkles, LogOut, LogIn, FileText } from "lucide-react";
import { NavLink, useNavigate } from "react-router-dom";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
  SidebarFooter,
} from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useUserRole } from "@/hooks/useUserRole";
import { useToast } from "@/hooks/use-toast";

const menuItems = [
  {
    title: "Kanban Board",
    url: "/",
    icon: LayoutDashboard,
    requireAdmin: false,
  },
  {
    title: "Brain",
    url: "/brain",
    icon: Brain,
    requireAdmin: true,
  },
  {
    title: "Changelog",
    url: "/changelog",
    icon: FileText,
    requireAdmin: false,
  },
];

export function AppSidebar() {
  const { state } = useSidebar();
  const collapsed = state === 'collapsed';
  const { isAdmin, userId } = useUserRole();
  const navigate = useNavigate();
  const { toast } = useToast();

  const getNavCls = ({ isActive }: { isActive: boolean }) =>
    isActive 
      ? "bg-primary/20 text-primary font-medium border-l-2 border-primary" 
      : "hover:bg-muted/50";

  const handleLogout = async () => {
    try {
      await supabase.auth.signOut();
      toast({
        title: 'Logout realizado',
        description: 'Até logo!',
      });
      navigate('/auth');
    } catch (error) {
      console.error('Error logging out:', error);
    }
  };

  const filteredMenuItems = menuItems.filter(item => 
    !item.requireAdmin || (item.requireAdmin && isAdmin)
  );

  return (
    <Sidebar collapsible="icon">
      <SidebarContent>
        {/* Logo/Brand */}
        <div className="p-4 border-b border-border/50">
          <div className="flex items-center gap-2">
            <div className="relative">
              <Bot className="w-6 h-6 text-primary" />
              <Sparkles className="w-3 h-3 text-secondary absolute -top-1 -right-1 animate-pulse" />
            </div>
            {!collapsed && (
              <div>
                <h2 className="text-sm font-bold bg-gradient-to-r from-primary via-secondary to-accent bg-clip-text text-transparent">
                  Smart Kanban
                </h2>
                <p className="text-xs text-muted-foreground">AI Powered</p>
              </div>
            )}
          </div>
        </div>

        <SidebarGroup>
          <SidebarGroupLabel>Menu</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {filteredMenuItems.length === 0 && (
                <div className="px-4 py-2 text-xs text-muted-foreground">
                  Faça login para ver o menu
                </div>
              )}
              {filteredMenuItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild>
                    <NavLink to={item.url} end className={getNavCls}>
                      <item.icon className="mr-2 h-4 w-4" />
                      {!collapsed && <span>{item.title}</span>}
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="p-4">
        {userId ? (
          <Button 
            onClick={handleLogout} 
            variant="ghost" 
            className="w-full justify-start"
          >
            <LogOut className="mr-2 h-4 w-4" />
            {!collapsed && <span>Sair</span>}
          </Button>
        ) : (
          <Button 
            onClick={() => navigate('/auth')} 
            variant="ghost"
            className="w-full justify-start"
          >
            <LogIn className="mr-2 h-4 w-4" />
            {!collapsed && <span>Entrar</span>}
          </Button>
        )}
      </SidebarFooter>
    </Sidebar>
  );
}