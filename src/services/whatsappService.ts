import { supabase } from "@/integrations/supabase/client";

export interface WhatsAppInstance {
    id: string;
    instance_name: string;
    status: 'disconnected' | 'connecting' | 'connected' | 'error';
    phone_number?: string;
    qr_code?: string;
    pipeline_id: string;
    created_at: string;
}

export interface CreateInstanceData {
    instanceName: string;
    uazapiBaseUrl: string;
    uazapiAdminToken?: string;
    pipelineId: string;
}

export const whatsappService = {
    async createInstance(data: CreateInstanceData) {
        const { data: result, error } = await supabase.functions.invoke('uazapi-manage-instance', {
            body: { action: 'create', ...data }
        });
        return { data: result, error };
    },

    async getQRCode(instanceId: string) {
        const { data, error } = await supabase.functions.invoke('uazapi-manage-instance', {
            body: { action: 'connect', instanceId }
        });
        return { data, error };
    },

    async disconnectInstance(instanceId: string) {
        const { data, error } = await supabase.functions.invoke('uazapi-manage-instance', {
            body: { action: 'disconnect', instanceId }
        });
        return { data, error };
    },

    async deleteInstance(instanceId: string) {
        const { data, error } = await supabase.functions.invoke('uazapi-manage-instance', {
            body: { action: 'delete', instanceId }
        });
        return { data, error };
    },

    async sendMessage(instanceId: string, chatId: string, message: string) {
        const { data, error } = await supabase.functions.invoke('uazapi-send-message', {
            body: { instanceId, chatId, message }
        });
        return { data, error };
    },

    async listInstances(pipelineId: string) {
        const { data, error } = await supabase
            .from('whatsapp_instances')
            .select('*')
            .eq('pipeline_id', pipelineId)
            .order('created_at', { ascending: false });
        return { data, error };
    }
};
