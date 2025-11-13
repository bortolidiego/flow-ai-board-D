import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Loader2, Zap } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { EvolutionIntegrationList } from './evolution/EvolutionIntegrationList';
import { EvolutionIntegrationForm, type NewIntegrationData } from './evolution/EvolutionIntegrationForm';
import { useEvolutionIntegrations } from './evolution/useEvolutionIntegrations';