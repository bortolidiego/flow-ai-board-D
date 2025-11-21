import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { UserPlus, Trash2, Shield, User, Loader2, Copy, Check } from 'lucide-react';
import { useUserRole } from '@/hooks/useUserRole';

interface WorkspaceMember {
  id: string;
  user_id: string;
  workspace_id: string;
  joined_at: string;
  email?: string;
  role?: 'admin' | 'user';
}

interface WorkspaceMembersDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  workspaceId: string;
}

export function WorkspaceMembersDialog({
  open,
  onOpenChange,
  workspaceId,
}: WorkspaceMembersDialogProps) {
  const [members, setMembers] = useState<WorkspaceMember[]>([]);
  const [pendingInvites, setPendingInvites] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState<'admin' | 'user'>('user');
  const [inviting, setInviting] = useState(false);
  const [copiedInviteId, setCopiedInviteId] = useState<string | null>(null);
  const { toast } = useToast();
  const { userId: currentUserId, isAdmin } = useUserRole();

  useEffect(() => {
    if (open && workspaceId) {
      fetchMembers();
    }
  }, [open, workspaceId]);

  const fetchMembers = async () => {
    setLoading(true);
    try {
      // Buscar membros do workspace com suas roles
      const { data: membersData, error: membersError } = await supabase
        .from('workspace_members')
        .select('*')
        .eq('workspace_id', workspaceId);

      if (membersError) throw membersError;

      if (!membersData) {
        setMembers([]);
        return;
      }

      // Buscar roles dos usuários
      const userIds = membersData.map((m) => m.user_id);
      
      const { data: rolesData } = await supabase
        .from('user_roles')
        .select('user_id, role')
        .in('user_id', userIds);

      // Como não temos acesso ao auth.users no frontend, vamos buscar o email do usuário atual
      const { data: { user: currentUser } } = await supabase.auth.getUser();

      const membersWithDetails = membersData.map((member) => {
        const roleInfo = rolesData?.find((r) => r.user_id === member.user_id);
        
        return {
          ...member,
          email: member.user_id === currentUser?.id ? currentUser.email : member.user_id,
          role: roleInfo?.role as 'admin' | 'user' || 'user',
        };
      });

      setMembers(membersWithDetails);

      // Buscar convites pendentes
      const { data: invitesData } = await supabase
        .from('workspace_invites')
        .select('*')
        .eq('workspace_id', workspaceId)
        .eq('status', 'pending')
        .order('created_at', { ascending: false });

      setPendingInvites(invitesData || []);
    } catch (error: any) {
      console.error('Error fetching members:', error);
      toast({
        title: 'Erro ao carregar membros',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleInviteMember = async () => {
    if (!inviteEmail || !inviteEmail.includes('@')) {
      toast({
        title: 'Email inválido',
        description: 'Por favor, insira um email válido.',
        variant: 'destructive',
      });
      return;
    }

    setInviting(true);
    try {
      console.log('Starting invite process for:', inviteEmail);

      // Verificar autenticação
      const { data: { user: currentUser } } = await supabase.auth.getUser();
      
      if (!currentUser) {
        throw new Error('Você precisa estar autenticado para criar convites');
      }

      console.log('Current user:', currentUser.id);
      console.log('Workspace ID:', workspaceId);

      // Verificar se já existe convite pendente para este email
      const { data: existingInvite, error: checkError } = await supabase
        .from('workspace_invites')
        .select('id')
        .eq('workspace_id', workspaceId)
        .eq('email', inviteEmail.toLowerCase())
        .eq('status', 'pending')
        .maybeSingle();

      if (checkError) {
        console.error('Error checking existing invite:', checkError);
        throw new Error(`Erro ao verificar convites existentes: ${checkError.message}`);
      }

      if (existingInvite) {
        toast({
          title: 'Convite já enviado',
          description: 'Já existe um convite pendente para este email.',
          variant: 'destructive',
        });
        return;
      }

      // Criar convite
      console.log('Creating invite with data:', {
        workspace_id: workspaceId,
        email: inviteEmail.toLowerCase(),
        role: inviteRole,
        invited_by: currentUser.id,
      });

      const { data: invite, error: inviteError } = await supabase
        .from('workspace_invites')
        .insert({
          workspace_id: workspaceId,
          email: inviteEmail.toLowerCase(),
          role: inviteRole,
          invited_by: currentUser.id,
        })
        .select()
        .single();

      if (inviteError) {
        console.error('Error creating invite:', inviteError);
        throw new Error(`Erro ao criar convite: ${inviteError.message}`);
      }

      console.log('Invite created successfully:', invite);

      // Copiar link do convite para clipboard
      const inviteLink = `${window.location.origin}/#/accept-invite?token=${invite.token}`;
      
      try {
        await navigator.clipboard.writeText(inviteLink);
        toast({
          title: 'Convite criado!',
          description: 'Link do convite copiado para a área de transferência. Envie para o usuário.',
        });
      } catch (clipboardError) {
        console.warn('Clipboard write failed, showing link instead:', clipboardError);
        toast({
          title: 'Convite criado!',
          description: `Link: ${inviteLink}`,
          duration: 10000,
        });
      }

      setInviteEmail('');
      setInviteRole('user');
      fetchMembers();
    } catch (error: any) {
      console.error('Error inviting member:', error);
      toast({
        title: 'Erro ao criar convite',
        description: error.message || 'Erro desconhecido ao criar convite',
        variant: 'destructive',
      });
    } finally {
      setInviting(false);
    }
  };

  const handleRevokeInvite = async (inviteId: string) => {
    try {
      const { error } = await supabase
        .from('workspace_invites')
        .delete()
        .eq('id', inviteId);

      if (error) throw error;

      toast({
        title: 'Convite revogado',
        description: 'O convite foi cancelado.',
      });

      fetchMembers();
    } catch (error: any) {
      toast({
        title: 'Erro ao revogar convite',
        description: error.message,
        variant: 'destructive',
      });
    }
  };

  const handleCopyInviteLink = async (token: string) => {
    const inviteLink = `${window.location.origin}/#/accept-invite?token=${token}`;
    try {
      await navigator.clipboard.writeText(inviteLink);
      setCopiedInviteId(token);
      toast({
        title: 'Link copiado!',
        description: 'O link do convite foi copiado para a área de transferência.',
      });
      setTimeout(() => setCopiedInviteId(null), 2000);
    } catch (error) {
      toast({
        title: 'Erro ao copiar link',
        description: 'Não foi possível copiar o link. Tente novamente.',
        variant: 'destructive',
      });
    }
  };

  const handleRemoveMember = async (memberId: string, memberUserId: string) => {
    if (memberUserId === currentUserId) {
      toast({
        title: 'Não permitido',
        description: 'Você não pode remover a si mesmo.',
        variant: 'destructive',
      });
      return;
    }

    try {
      const { error } = await supabase
        .from('workspace_members')
        .delete()
        .eq('id', memberId);

      if (error) throw error;

      toast({
        title: 'Membro removido',
        description: 'O membro foi removido do workspace.',
      });

      fetchMembers();
    } catch (error: any) {
      console.error('Error removing member:', error);
      toast({
        title: 'Erro ao remover membro',
        description: error.message,
        variant: 'destructive',
      });
    }
  };

  const handleChangeRole = async (userId: string, newRole: 'admin' | 'user') => {
    if (userId === currentUserId) {
      toast({
        title: 'Não permitido',
        description: 'Você não pode alterar sua própria permissão.',
        variant: 'destructive',
      });
      return;
    }

    try {
      const { error } = await supabase
        .from('user_roles')
        .update({ role: newRole })
        .eq('user_id', userId);

      if (error) throw error;

      toast({
        title: 'Permissão alterada',
        description: `Permissão alterada para ${newRole}.`,
      });

      fetchMembers();
    } catch (error: any) {
      console.error('Error changing role:', error);
      toast({
        title: 'Erro ao alterar permissão',
        description: error.message,
        variant: 'destructive',
      });
    }
  };

  if (!isAdmin) {
    return null;
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Gerenciar Membros do Workspace</DialogTitle>
          <DialogDescription>
            Adicione, remova ou altere as permissões dos membros do workspace.
          </DialogDescription>
        </DialogHeader>

        {/* Formulário de convite */}
        <div className="space-y-4 border-b pb-4">
          <h3 className="text-sm font-medium flex items-center gap-2">
            <UserPlus className="w-4 h-4" />
            Convidar Novo Membro
          </h3>
          <p className="text-xs text-muted-foreground mb-2">
            Um link de convite será gerado e copiado automaticamente.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div className="md:col-span-2">
              <Label htmlFor="invite-email">Email</Label>
              <Input
                id="invite-email"
                type="email"
                placeholder="usuario@exemplo.com"
                value={inviteEmail}
                onChange={(e) => setInviteEmail(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleInviteMember();
                  }
                }}
              />
            </div>
            <div>
              <Label htmlFor="invite-role">Permissão</Label>
              <Select value={inviteRole} onValueChange={(val) => setInviteRole(val as 'admin' | 'user')}>
                <SelectTrigger id="invite-role">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="user">
                    <span className="flex items-center gap-2">
                      <User className="w-4 h-4" />
                      Usuário
                    </span>
                  </SelectItem>
                  <SelectItem value="admin">
                    <span className="flex items-center gap-2">
                      <Shield className="w-4 h-4" />
                      Admin
                    </span>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <Button onClick={handleInviteMember} disabled={inviting} className="w-full">
            {inviting ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Criando convite...
              </>
            ) : (
              <>
                <UserPlus className="w-4 h-4 mr-2" />
                Criar Convite
              </>
            )}
          </Button>
        </div>

        {/* Convites Pendentes */}
        {pendingInvites.length > 0 && (
          <div className="space-y-4 border-b pb-4">
            <h3 className="text-sm font-medium">Convites Pendentes</h3>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Email</TableHead>
                  <TableHead>Permissão</TableHead>
                  <TableHead>Convidado por</TableHead>
                  <TableHead>Expira em</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {pendingInvites.map((invite) => (
                  <TableRow key={invite.id}>
                    <TableCell>{invite.email}</TableCell>
                    <TableCell>
                      <Badge variant="outline">
                        {invite.role === 'admin' ? 'Admin' : 'Usuário'}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-muted-foreground text-sm">
                      Você
                    </TableCell>
                    <TableCell className="text-muted-foreground text-sm">
                      {new Date(invite.expires_at).toLocaleDateString('pt-BR')}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleCopyInviteLink(invite.token)}
                        >
                          {copiedInviteId === invite.token ? (
                            <Check className="w-4 h-4 text-green-500" />
                          ) : (
                            <Copy className="w-4 h-4" />
                          )}
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleRevokeInvite(invite.id)}
                        >
                          Revogar
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}

        {/* Lista de membros */}
        <div className="space-y-4">
          <h3 className="text-sm font-medium">Membros Atuais</h3>
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-6 h-6 animate-spin text-primary" />
            </div>
          ) : members.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">
              Nenhum membro encontrado.
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>User ID / Email</TableHead>
                  <TableHead>Permissão</TableHead>
                  <TableHead>Entrou em</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {members.map((member) => (
                  <TableRow key={member.id}>
                    <TableCell className="font-medium">
                      {member.email}
                      {member.user_id === currentUserId && (
                        <Badge variant="outline" className="ml-2">
                          Você
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      <Select
                        value={member.role}
                        onValueChange={(val) => handleChangeRole(member.user_id, val as 'admin' | 'user')}
                        disabled={member.user_id === currentUserId}
                      >
                        <SelectTrigger className="w-32">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="user">
                            <span className="flex items-center gap-2">
                              <User className="w-4 h-4" />
                              Usuário
                            </span>
                          </SelectItem>
                          <SelectItem value="admin">
                            <span className="flex items-center gap-2">
                              <Shield className="w-4 h-4" />
                              Admin
                            </span>
                          </SelectItem>
                        </SelectContent>
                      </Select>
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {new Date(member.joined_at).toLocaleDateString('pt-BR')}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleRemoveMember(member.id, member.user_id)}
                        disabled={member.user_id === currentUserId}
                      >
                        <Trash2 className="w-4 h-4 text-destructive" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}