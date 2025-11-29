import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { showError } from '@/utils/toast';

export interface ManagerEvent {
    id: string;
    title: string;
    // Removendo campos não essenciais para a listagem inicial
}

const fetchManagerEvents = async (companyId: string): Promise<ManagerEvent[]> => {
    if (!companyId) {
        console.warn("Attempted to fetch manager events without a companyId.");
        return [];
    }

    // Filtra explicitamente os eventos onde o company_id é igual ao companyId logado.
    const { data, error } = await supabase
        .from('events')
        .select(`
            id,
            title
        `)
        .eq('company_id', companyId) // FILTRO ATUALIZADO AQUI
        .order('created_at', { ascending: false });

    if (error) {
        console.error("Error fetching manager events from Supabase:", error);
        // Lançamos o erro para que o useQuery o capture e dispare o onError
        throw new Error(error.message); 
    }
    
    return data as ManagerEvent[];
};

export const useManagerEvents = (companyId: string | undefined) => {
    const queryClient = useQueryClient();

    const query = useQuery({
        queryKey: ['managerEvents', companyId],
        queryFn: () => fetchManagerEvents(companyId!),
        enabled: !!companyId, // Só executa se tiver o companyId
        staleTime: 1000 * 60 * 1, // 1 minute
        // Adicionando tratamento de erro para exibir o toast
        onError: (error) => {
            console.error("Query Error:", error);
            showError("Erro ao carregar eventos. Tente recarregar a página.");
        }
    });

    return {
        ...query,
        events: query.data || [],
        invalidateEvents: () => queryClient.invalidateQueries({ queryKey: ['managerEvents', companyId] }),
    };
};