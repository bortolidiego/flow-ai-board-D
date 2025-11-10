import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Loader2, ShoppingCart, Briefcase, Home, HeadphonesIcon, Check } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

interface BehaviorTemplate {
  id: string;
  name: string;
  business_type: string;
  description: string;
  config: any;
}

interface BehaviorTemplateSelectorProps {
  onSelect: (template: BehaviorTemplate) => void;
  selectedTemplateId?: string;
}

const templateIcons: Record<string, any> = {
  ecommerce: ShoppingCart,
  services: Briefcase,
  realestate: Home,
  support: HeadphonesIcon,
};

export function BehaviorTemplateSelector({ onSelect, selectedTemplateId }: BehaviorTemplateSelectorProps) {
  const [templates, setTemplates] = useState<BehaviorTemplate[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchTemplates();
  }, []);

  const fetchTemplates = async () => {
    try {
      const { data, error } = await supabase
        .from('behavior_templates')
        .select('*')
        .eq('is_system', true)
        .order('name');

      if (error) throw error;
      setTemplates(data || []);
    } catch (error) {
      console.error('Error fetching templates:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      {templates.map((template) => {
        const Icon = templateIcons[template.business_type] || Briefcase;
        const isSelected = selectedTemplateId === template.id;
        const config = template.config;
        
        return (
          <Card
            key={template.id}
            className={`cursor-pointer transition-all hover:shadow-lg ${
              isSelected ? 'ring-2 ring-primary' : ''
            }`}
            onClick={() => onSelect(template)}
          >
            <CardHeader>
              <div className="flex items-start justify-between">
                <Icon className="w-8 h-8 text-primary mb-2" />
                {isSelected && (
                  <Badge className="bg-primary">
                    <Check className="w-3 h-3 mr-1" />
                    Selecionado
                  </Badge>
                )}
              </div>
              <CardTitle className="text-lg">{template.name}</CardTitle>
              <CardDescription className="text-sm">{template.description}</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2 text-sm text-muted-foreground">
                <div className="flex items-center justify-between">
                  <span>Etapas:</span>
                  <Badge variant="outline">{config.stages?.length || 0}</Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span>Campos:</span>
                  <Badge variant="outline">{config.custom_fields?.length || 0}</Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span>Funis:</span>
                  <Badge variant="outline">{config.funnel_types?.length || 0}</Badge>
                </div>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
