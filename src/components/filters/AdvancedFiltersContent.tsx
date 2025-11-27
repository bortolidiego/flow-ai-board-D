import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Slider } from '@/components/ui/slider';
import { Switch } from '@/components/ui/switch';
import { Checkbox } from '@/components/ui/checkbox';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Check, ChevronsUpDown, Trash2, Plus, User, Lock } from "lucide-react";
import { cn } from "@/lib/utils";
import { KanbanFilters } from '@/types/kanbanFilters';
import { useUserRole } from '@/hooks/useUserRole';
import { supabase } from '@/integrations/supabase/client';

interface AdvancedFiltersContentProps {
  filters: KanbanFilters;
  updateFilter: (key: keyof KanbanFilters, value: any) => void;
  updateCustomFieldFilter: (field: string, value: any) => void;
  resetFilters: () => void;
  uniqueValues: {
    assignees: string[];
    funnelTypes: string[];
    lifecycleStages: string[];
    products: string[];
    lostReasons: string[];
    customFields: string[];
  };
  availableLifecycleStages: string[];
}

export function AdvancedFiltersContent({
  filters,
  updateFilter,
  updateCustomFieldFilter,
  resetFilters,
  uniqueValues,
  availableLifecycleStages,
}: AdvancedFiltersContentProps) {
  const { isAdmin } = useUserRole();
  const [currentUserEmail, setCurrentUserEmail] = useState<string | null>(null);
  const [currentUserName, setCurrentUserName] = useState<string | null>(null);

  // Buscar dados do usuário atual para filtrar
  useEffect(() => {
    const getUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        setCurrentUserEmail(user.email);
        setCurrentUserName(user.user_metadata?.full_name);
      }
    };
    getUser();
  }, []);

  // Se não é admin, força o filtro de assignee para o usuário atual
  useEffect(() => {
    if (!isAdmin && (currentUserEmail || currentUserName)) {
      // Tenta encontrar o nome do agente na lista de assignees que bate com email ou nome
      // A lógica aqui é simples: se não é admin, injeta o filtro
      // Nota: Isso é uma trava de UI. Para segurança real, RLS no banco é ideal.

      // Se o filtro de assignee estiver vazio, preencha com o usuário atual
      // Para evitar loop, verifica se já contém
      const myIdentifiers = [currentUserName, currentUserEmail].filter(Boolean) as string[];

      // Encontra qual identifier está sendo usado nos cards (geralmente é o nome vindo do chatwoot)
      const myAgentName = uniqueValues.assignees.find(
        a => myIdentifiers.some(id => a.toLowerCase().includes(id.toLowerCase()))
      );

      if (myAgentName && !filters.assignee.includes(myAgentName)) {
        updateFilter('assignee', [myAgentName]);
      }
    }
  }, [isAdmin, currentUserEmail, currentUserName, uniqueValues.assignees]);

  const toggleArrayFilter = (key: keyof KanbanFilters, value: string) => {
    const current = (filters[key] as string[]) || [];
    const next = current.includes(value)
      ? current.filter(i => i !== value)
      : [...current, value];
    updateFilter(key, next);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between px-1">
        <h4 className="font-medium text-sm text-muted-foreground">Filtros Ativos</h4>
        {isAdmin && (
          <Button variant="ghost" size="sm" onClick={resetFilters} className="h-6 text-xs text-destructive hover:text-destructive">
            Limpar tudo
          </Button>
        )}
      </div>

      <ScrollArea className="h-[60vh] pr-4">
        <Accordion type="multiple" defaultValue={['people', 'funnel']} className="w-full">

          {/* 1. PESSOAS (Agentes) - Só mostra se for Admin */}
          <AccordionItem value="people">
            <AccordionTrigger className="text-sm">👤 Pessoas & Atendimento</AccordionTrigger>
            <AccordionContent className="space-y-4 pt-2">
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label className="text-xs">Agentes</Label>
                  <Badge variant="outline" className="text-[10px] font-normal">
                    {filters.assignee.length} selecionados
                  </Badge>
                </div>

                {isAdmin ? (
                  <div className="flex flex-wrap gap-2">
                    {uniqueValues.assignees.map(agent => (
                      <Badge
                        key={agent}
                        variant={filters.assignee.includes(agent) ? "default" : "outline"}
                        className="cursor-pointer"
                        onClick={() => toggleArrayFilter('assignee', agent)}
                      >
                        {agent}
                      </Badge>
                    ))}
                  </div>
                ) : (
                  <div className="p-2 bg-muted/50 rounded border border-muted text-xs text-muted-foreground flex items-center gap-2">
                    <Lock className="w-3 h-3" />
                    Você só pode ver seus próprios chamados.
                  </div>
                )}

                {isAdmin && (
                  <div className="flex items-center space-x-2 pt-2">
                    <Checkbox
                      id="unassigned"
                      checked={filters.isUnassigned || false}
                      onCheckedChange={(c) => updateFilter('isUnassigned', c)}
                    />
                    <label htmlFor="unassigned" className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                      Apenas sem responsável
                    </label>
                  </div>
                )}
              </div>
            </AccordionContent>
          </AccordionItem>

          {/* REST OF THE COMPONENTS (Same as before) */}
          {/* 2. FUNIL & ETAPAS */}
          <AccordionItem value="funnel">
            <AccordionTrigger className="text-sm">🎯 Funil & Etapas</AccordionTrigger>
            <AccordionContent className="space-y-4 pt-2">
              <div className="space-y-2">
                <Label className="text-xs">Tipo de Funil</Label>
                <div className="grid grid-cols-2 gap-2">
                  {uniqueValues.funnelTypes.map(type => (
                    <div
                      key={type}
                      onClick={() => toggleArrayFilter('funnelType', type)}
                      className={cn(
                        "flex items-center justify-center px-3 py-2 rounded-md border text-xs font-medium cursor-pointer transition-colors",
                        filters.funnelType.includes(type)
                          ? "bg-primary/10 border-primary text-primary"
                          : "bg-background hover:bg-accent"
                      )}
                    >
                      {type}
                    </div>
                  ))}
                </div>
              </div>

              {availableLifecycleStages.length > 0 && (
                <div className="space-y-2">
                  <Label className="text-xs">
                    Etapas do Ciclo
                    {filters.funnelType.length > 0 && <span className="text-muted-foreground ml-1">(Filtrado por funil)</span>}
                  </Label>
                  <MultiSelectCombobox
                    title="Selecionar Etapas"
                    options={availableLifecycleStages}
                    selected={filters.lifecycleStages}
                    onChange={(val) => updateFilter('lifecycleStages', val)}
                  />
                </div>
              )}
            </AccordionContent>
          </AccordionItem>

          <AccordionItem value="metrics">
            <AccordionTrigger className="text-sm">📊 Métricas & Qualidade</AccordionTrigger>
            <AccordionContent className="space-y-6 pt-4 px-1">
              <div className="space-y-3">
                <Label className="text-xs">Status do SLA</Label>
                <div className="flex flex-wrap gap-2">
                  {[
                    { value: 'ok', label: 'No Prazo', color: 'bg-green-500 hover:bg-green-600' },
                    { value: 'warning', label: 'Atenção', color: 'bg-amber-500 hover:bg-amber-600' },
                    { value: 'overdue', label: 'Atrasado', color: 'bg-red-500 hover:bg-red-600' }
                  ].map(option => {
                    const isSelected = filters.slaStatus?.includes(option.value);
                    return (
                      <Badge
                        key={option.value}
                        variant={isSelected ? "default" : "outline"}
                        className={cn(
                          "cursor-pointer",
                          isSelected ? option.color : "hover:bg-accent"
                        )}
                        onClick={() => toggleArrayFilter('slaStatus', option.value)}
                      >
                        {option.label}
                      </Badge>
                    );
                  })}
                </div>
              </div>

              <div className="space-y-3">
                <div className="flex justify-between text-xs">
                  <Label>Chance de Negócio</Label>
                  <span className="text-muted-foreground">
                    {filters.funnelScoreRange ? `${filters.funnelScoreRange.min}% - ${filters.funnelScoreRange.max}%` : 'Qualquer'}
                  </span>
                </div>
                <Slider
                  defaultValue={[0, 100]}
                  value={filters.funnelScoreRange ? [filters.funnelScoreRange.min, filters.funnelScoreRange.max] : [0, 100]}
                  max={100}
                  step={5}
                  minStepsBetweenThumbs={10}
                  onValueChange={(val) => updateFilter('funnelScoreRange', { min: val[0], max: val[1] })}
                  className="[&>.span]:bg-primary"
                />
              </div>

              <div className="space-y-3">
                <div className="flex justify-between text-xs">
                  <Label>Qualidade Atendimento</Label>
                  <span className="text-muted-foreground">
                    {filters.qualityScoreRange ? `${filters.qualityScoreRange.min}% - ${filters.qualityScoreRange.max}%` : 'Qualquer'}
                  </span>
                </div>
                <Slider
                  defaultValue={[0, 100]}
                  value={filters.qualityScoreRange ? [filters.qualityScoreRange.min, filters.qualityScoreRange.max] : [0, 100]}
                  max={100}
                  step={5}
                  className="[&>.span]:bg-blue-500"
                  onValueChange={(val) => updateFilter('qualityScoreRange', { min: val[0], max: val[1] })}
                />
              </div>
            </AccordionContent>
          </AccordionItem>

          <AccordionItem value="business">
            <AccordionTrigger className="text-sm">📦 Produtos & Perdas</AccordionTrigger>
            <AccordionContent className="space-y-4 pt-2">
              <div className="space-y-2">
                <Label className="text-xs">Produtos de Interesse</Label>
                <MultiSelectCombobox
                  title="Buscar Produto..."
                  options={uniqueValues.products}
                  selected={filters.productItem}
                  onChange={(val) => updateFilter('productItem', val)}
                />
              </div>

              <Separator />

              <div className="space-y-2">
                <Label className="text-xs text-red-500">Motivos de Perda</Label>
                <MultiSelectCombobox
                  title="Selecionar Motivos..."
                  options={uniqueValues.lostReasons}
                  selected={filters.lostReasons}
                  onChange={(val) => updateFilter('lostReasons', val)}
                />
              </div>

              <div className="flex items-center space-x-2 pt-2">
                <Switch
                  id="monetary-lock"
                  checked={filters.isMonetaryLocked || false}
                  onCheckedChange={(c) => updateFilter('isMonetaryLocked', c)}
                />
                <Label htmlFor="monetary-lock" className="text-xs">Apenas travados (mudança monetária)</Label>
              </div>

            </AccordionContent>
          </AccordionItem>

          {uniqueValues.customFields.length > 0 && (
            <AccordionItem value="custom">
              <AccordionTrigger className="text-sm">✨ Campos Personalizados</AccordionTrigger>
              <AccordionContent className="space-y-3 pt-2">
                {uniqueValues.customFields.map(field => (
                  <div key={field} className="space-y-1">
                    <Label className="text-xs capitalize">{field.replace(/_/g, ' ')}</Label>
                    <Input
                      placeholder="Contém..."
                      className="h-8 text-xs"
                      value={filters.customFields[field] || ''}
                      onChange={(e) => updateCustomFieldFilter(field, e.target.value)}
                    />
                  </div>
                ))}
              </AccordionContent>
            </AccordionItem>
          )}

        </Accordion>
      </ScrollArea>
    </div>
  );
}

function MultiSelectCombobox({
  options,
  selected,
  onChange,
  title
}: {
  options: string[],
  selected: string[],
  onChange: (val: string[]) => void,
  title: string
}) {
  const [open, setOpen] = useState(false);

  const handleSelect = (value: string) => {
    const next = selected.includes(value)
      ? selected.filter(i => i !== value)
      : [...selected, value];
    onChange(next);
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="w-full justify-between h-9 text-xs"
        >
          {selected.length > 0
            ? `${selected.length} selecionado(s)`
            : title}
          <ChevronsUpDown className="ml-2 h-3 w-3 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[300px] p-0">
        <Command>
          <CommandInput placeholder={`Buscar ${title.toLowerCase()}...`} />
          <CommandList>
            <CommandEmpty>Nenhum item encontrado.</CommandEmpty>
            <CommandGroup>
              {options.map((option) => (
                <CommandItem
                  key={option}
                  value={option}
                  onSelect={() => handleSelect(option)}
                  className="text-xs"
                >
                  <Check
                    className={cn(
                      "mr-2 h-3 w-3",
                      selected.includes(option) ? "opacity-100" : "opacity-0"
                    )}
                  />
                  {option}
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}