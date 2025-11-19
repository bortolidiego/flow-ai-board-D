// @ts-nocheck
import { z } from "https://deno.land/x/zod@v3.22.4/mod.ts";

export const ChatwootWebhookSchema = z.object({
  id: z.number().optional(),
  event: z.enum(["conversation_created", "message_created", "message_updated", "conversation_updated"]),
  conversation: z.object({
    id: z.number(),
    inbox_id: z.number().optional(),
    status: z.string().max(50).optional(),
    assignee: z.object({
      name: z.string().max(200).optional(),
    }).optional().nullable(),
    inbox: z.object({
      name: z.string().max(200).optional(),
    }).optional(),
    meta: z.object({
      sender: z.object({
        name: z.string().max(200).optional(),
        email: z.string().email().max(255).optional().nullable(),
      }).optional(),
    }).optional(),
  }).optional(),
  message_type: z.enum(["incoming", "outgoing"]).optional(),
  content: z.string().max(50000).nullable().optional(),
  sender: z.object({
    type: z.string().max(50).optional(),
    name: z.string().max(200).optional(),
    email: z.string().email().max(255).optional().nullable(),
  }).optional().nullable(),
  account: z.object({
    id: z.number(),
  }).optional(),
  private: z.boolean().optional(),
  message: z.object({
    id: z.number(),
    message_type: z.enum(["incoming","outgoing"]).optional(),
    content: z.string().max(50000).nullable().optional(),
    private: z.boolean().optional(),
    sender: z.object({
      type: z.string().max(50).optional(),
      name: z.string().max(200).optional(),
      email: z.string().email().max(255).optional().nullable(),
    }).optional().nullable(),
    attachments: z.array(z.object({
      id: z.number().optional(),
      message_id: z.number().optional(),
      file_type: z.string().optional(),
      account_id: z.number().optional(),
      extension: z.string().optional().nullable(),
      data_url: z.string().optional(),
      thumb_url: z.string().optional(),
      file_size: z.number().optional(),
    })).optional().nullable(),
  }).optional(),
});

export type ChatwootWebhookPayload = z.infer<typeof ChatwootWebhookSchema>;