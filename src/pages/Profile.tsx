import { ProfileForm } from "@/components/ProfileForm";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { User, Settings } from "lucide-react";

export default function Profile() {
  return (
    <div className="h-full overflow-y-auto bg-gradient-to-br from-background via-background to-primary/5">
      <div className="container mx-auto px-6 py-8 max-w-3xl">
        <div className="mb-8">
          <div className="flex items-center gap-3">
            <Settings className="w-10 h-10 text-primary" />
            <div>
              <h1 className="text-3xl font-bold bg-gradient-to-r from-primary via-secondary to-accent bg-clip-text text-transparent">
                Configurações de Perfil
              </h1>
              <p className="text-sm text-muted-foreground">
                Gerencie suas informações pessoais e credenciais de acesso.
              </p>
            </div>
          </div>
        </div>
        
        <ProfileForm />
      </div>
    </div>
  );
}