import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { Loader2 } from "lucide-react";

export default function Provision() {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);

  const email = "bortolidiego@gmail.com";
  const password = "Kb46837874#";
  const workspaceName = "KB Tech";

  const ensureSession = async () => {
    // Tenta criar; se já existir, faz login
    const signup = await supabase.auth.signUp({ email, password });
    if (signup.error && signup.error.message.toLowerCase().includes("already")) {
      // Usuário já existe: tentar login
      const signin = await supabase.auth.signInWithPassword({ email, password });
      if (signin.error) throw signin.error;
    } else if (signup.error) {
      // Se outro erro, ainda tentar login (ex.: email confirmado anteriormente)
      const signin = await supabase.auth.signInWithPassword({ email, password });
      if (signin.error) throw signin.error;
    }
    // Garantir sessão
    const { data: sessionData, error } = await supabase.auth.getSession();
    if (error || !sessionData?.session?.access_token) {
      throw new Error("Não foi possível obter sessão do usuário.");
    }
    return sessionData.session.access_token;
  };

  const handleProvision = async () => {
    setLoading(true);
    setResult(null);

    try {
      const token = await ensureSession();

      const { data, error } = await supabase.functions.invoke("provision-current-user-workspace", {
        body: { workspaceName },
        headers: { Authorization: `Bearer ${token}` },
      });

      if (error) {
        const serverMsg = (error as any)?.message || (data as any)?.error || "Falha na função";
        throw new Error(serverMsg);
      }

      setResult(data);
      toast({
        title: "Provisionamento concluído",
        description: `Workspace "${workspaceName}" criado/vinculado ao usuário "${email}".`,
      });
    } catch (err: any) {
      console.error("Provision error:", err);
      toast({
        title: "Erro ao provisionar",
        description: err?.message || "Tente novamente.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5 flex items-center justify-center p-6">
      <Card className="w-full max-w-lg">
        <CardHeader>
          <CardTitle>Provisionamento Manual</CardTitle>
          <CardDescription>
            Cria/vincula o workspace ao usuário autenticado (idempotente).
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="text-sm">
            <p><span className="font-medium">Email:</span> {email}</p>
            <p><span className="font-medium">Senha:</span> {password}</p>
            <p><span className="font-medium">Workspace:</span> {workspaceName}</p>
          </div>

          <Button onClick={handleProvision} disabled={loading} className="w-full">
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Provisionando...
              </>
            ) : (
              "Provisionar KB Tech"
            )}
          </Button>

          {result && (
            <div className="text-xs text-muted-foreground">
              <div>userId: {result.userId}</div>
              <div>workspaceId: {result.workspace?.id}</div>
              <div>workspaceName: {result.workspace?.name}</div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}