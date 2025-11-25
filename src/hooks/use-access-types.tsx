import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { showError, showSuccess } from '@/utils/toast';

export interface AccessTypeData {
    id: string;
    event_id: string;
    name: string;
    description: string | null;
    created_at: string;
    updated_at: string;
}

// Fetch function for access types
const fetchAccessTypes = async (eventId: string): Promise<AccessTypeData[]> => {
    if (!eventId) return [];

    const { data, error } = await supabase
        .from('access_types')
        .select('*')
        .eq('event_id', eventId)
        .order('name', { ascending: true });

    if (error) {
        console.error("Error fetching access types:", error);
        throw new Error(error.message);
    }
    return data as AccessTypeData[];
};

export const useAccessTypes = (eventId: string | undefined) => {
    const queryClient = useQueryClient();

    const query = useQuery({
        queryKey: ['accessTypes', eventId],
        queryFn: () => fetchAccessTypes(eventId!),
        enabled: !!eventId,
        staleTime: 1000 * 60 * 1, // 1 minute
        onError: (error) => {
            console.error("Query Error: Failed to load access types.", error);
            showError("Erro ao carregar tipos de acesso. Tente recarregar a página.");
        }
    });

    const createMutation = useMutation({
        mutationFn: async (newAccessType: Omit<AccessTypeData, 'id' | 'created_at' | 'updated_at'>) => {
            const { data, error } = await supabase
                .from('access_types')
                .insert([newAccessType])
                .select()
                .single();
            if (error) throw error;
            return data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['accessTypes', eventId] });
            showSuccess("Tipo de acesso criado com sucesso!");
        },
        onError: (error: any) => {
            console.error("Error creating access type:", error);
            showError(`Falha ao criar tipo de acesso: ${error.message || 'Erro desconhecido'}`);
        },
    });

    const updateMutation = useMutation({
        mutationFn: async (updatedAccessType: Partial<AccessTypeData> & { id: string }) => {
            const { data, error } = await supabase
                .from('access_types')
                .update(updatedAccessType)
                .eq('id', updatedAccessType.id)
                .select()
                .single();
            if (error) throw error;
            return data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['accessTypes', eventId] });
            showSuccess("Tipo de acesso atualizado com sucesso!");
        },
        onError: (error: any) => {
            console.error("Error updating access type:", error);
            showError(`Falha ao atualizar tipo de acesso: ${error.message || 'Erro desconhecido'}`);
        },
    });

    const deleteMutation = useMutation({
        mutationFn: async (id: string) => {
            const { error } = await supabase
                .from('access_types')
                .delete()
                .eq('id', id);
            if (error) throw error;
            return id;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['accessTypes', eventId] });
            showSuccess("Tipo de acesso excluído com sucesso!");
        },
        onError: (error: any) => {
            console.error("Error deleting access type:", error);
            showError(`Falha ao excluir tipo de acesso: ${error.message || 'Erro desconhecido'}`);
        },
    });

    return {
        ...query,
        accessTypes: query.data || [],
        createAccessType: createMutation.mutateAsync,
        updateAccessType: updateMutation.mutateAsync,
        deleteAccessType: deleteMutation.mutateAsync,
        isCreating: createMutation.isPending,
        isUpdating: updateMutation.isPending,
        isDeleting: deleteMutation.isPending,
    };
};