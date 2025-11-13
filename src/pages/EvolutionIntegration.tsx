"use client";

import { useState, from } from 'react';
import { useParams } from 'react-router-dom';
import { EvolutionSettings } from '@/components/EvolutionSettings';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ArrowLeft, Zap, MessageSquare, Bot, Settings } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Link } from 'react-router-dom';

export default function EvolutionIntegration() {
  const { pipelineId } = useParams<{ pipelineId: string }>();

  if (!pipelineId) {
    return (
      <div className="container mx-auto py-8">
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-muted-foreground">Pipeline ID não fornecido</p>
            <Link to="/brain">
              <Button className="mt-4">
                <ArrowLeft className="w-4 h-4 mr-2" />
                Voltar ao Brain
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <Link to="/brain">
            <Button variant="ghost" className="mb-2">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Voltar ao Brain
            </Button>
          </Link>
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-3">
            <Zap className="w-8 h-8 text-primary" />
            Evolution API Integration
          </h1>
          <p className="text-muted-foreground mt-2">
            Conecte suas instâncias WhatsApp para receber mensagens automaticamente
          </p>
        </div>
      </div>

      {/* Info Cards */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-3">
              <MessageSquare className="w-8 h-8 text-blue-500" />
              <div>
                <h3 className="font-semibold">Mensagens em Tempo Real</h3>
                <p className="text-sm text-muted-foreground">
                  Receba mensagens do WhatsApp instantaneamente
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-3">
              <Bot className="w-8 h-8 text-green-500" />
              <div>
                <h3 className="font-semibold">Análise Automática</h3>
                <p className="text-sm text-muted-foreground">
                  IA extrai dados e identifica intenções automaticamente
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-3">
              <Settings className="w-8 h-8 text-purple-500" />
              <div>
                <h3 className="font-semibold">Configuração Simples</h3>
                <p className="text-sm text-muted-foreground">
                  Configure em minutos, sem QR codes
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Evolution Settings */}
      <EvolutionSettings pipelineId={pipelineId} />
    </div>
  );
}