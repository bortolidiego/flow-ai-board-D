"use client";

import React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { MessageSquare, User, Calendar, TrendingUp } from "lucide-react";

interface KanbanCardProps {
  id: string;
  title: string;
  description?: string;
  priority?: string;
  assignee?: string;
  column_id: string;
  position: number;
  created_at: string;
  updated_at: string;
  funnel_score?: number;
  service_quality_score?: number;
  lifecycle_progress_percent?: number;
  value?: number;
  conversation_status?: string;
  subject?: string;
  product_item?: string;
  chatwoot_contact_name?: string;
  chatwoot_contact_email?: string;
  chatwoot_agent_name?: string;
  onClick?: () => void;
  onComplete?: () => void;
  onCardClick?: () => void;
  pipelineConfig?: any;
  selectionMode?: boolean;
  isSelected?: boolean;
  onSelectToggle?: () => void;
}

export const KanbanCard: React.FC<KanbanCardProps> = ({
  id,
  title,
  description,
  priority,
  assignee,
  column_id,
  position,
  created_at,
  updated_at,
  funnel_score,
  service_quality_score,
  lifecycle_progress_percent,
  value,
  conversation_status,
  subject,
  product_item,
  chatwoot_contact_name,
  chatwoot_agent_name,
  onClick,
  onComplete,
  onCardClick,
  pipelineConfig,
  selectionMode,
  isSelected,
  onSelectToggle,
}) => {
  const getPriorityColor = (priority?: string) => {
    switch (priority?.toLowerCase()) {
      case "alta":
        return "bg-red-100 text-red-800";
      case "media":
        return "bg-yellow-100 text-yellow-800";
      case "baixa":
        return "bg-green-100 text-green-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const getStatusColor = (status?: string) => {
    if (!status) return "bg-gray-100 text-gray-800";
    const lowerStatus = status.toLowerCase();
    if (lowerStatus.includes("won") || lowerStatus.includes("ganho")) {
      return "bg-green-100 text-green-800";
    }
    if (lowerStatus.includes("lost") || lowerStatus.includes("perdido")) {
      return "bg-red-100 text-red-800";
    }
    if (lowerStatus.includes("pending") || lowerStatus.includes("pendente")) {
      return "bg-yellow-100 text-yellow-800";
    }
    return "bg-blue-100 text-blue-800";
  };

  const handleClick = () => {
    if (onClick) onClick();
    if (onCardClick) onCardClick();
  };

  return (
    <Card 
      className={cn(
        "cursor-pointer transition-all hover:shadow-md",
        "border-l-4 border-l-primary",
        isSelected && "ring-2 ring-primary"
      )}
      onClick={handleClick}
    >
      <CardContent className="p-3">
        <div className="space-y-2">
          <div className="flex items-start justify-between">
            <h4 className="font-medium text-sm leading-tight line-clamp-2">
              {title}
            </h4>
            {priority && (
              <Badge 
                variant="outline" 
                className={cn("text-xs ml-2", getPriorityColor(priority))}
              >
                {priority}
              </Badge>
            )}
          </div>

          {description && (
            <p className="text-xs text-muted-foreground line-clamp-2">
              {description}
            </p>
          )}

          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            {chatwoot_contact_name && (
              <div className="flex items-center gap-1">
                <User className="w-3 h-3" />
                <span>{chatwoot_contact_name}</span>
              </div>
            )}
            {assignee && (
              <div className="flex items-center gap-1">
                <User className="w-3 h-3" />
                <span>{assignee}</span>
              </div>
            )}
          </div>

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1">
              {funnel_score && (
                <div className="flex items-center gap-1">
                  <TrendingUp className="w-3 h-3 text-primary" />
                  <span className="text-xs font-medium">{funnel_score}</span>
                </div>
              )}
              {service_quality_score && (
                <div className="flex items-center gap-1">
                  <MessageSquare className="w-3 h-3 text-blue-500" />
                  <span className="text-xs font-medium">{service_quality_score}</span>
                </div>
              )}
            </div>

            {value && (
              <span className="text-xs font-medium text-green-600">
                {new Intl.NumberFormat("pt-BR", {
                  style: "currency",
                  currency: "BRL",
                }).format(value)}
              </span>
            )}
          </div>

          {conversation_status && (
            <Badge 
              variant="outline" 
              className={cn("text-xs", getStatusColor(conversation_status))}
            >
              {conversation_status}
            </Badge>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default KanbanCard;