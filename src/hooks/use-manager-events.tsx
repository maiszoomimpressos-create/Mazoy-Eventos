import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { showError } from '@/utils/toast';

export interface ManagerEvent {
    id: string;
    title: string;
    date: string;
    price: number;
    // Adicione campos de métricas se necessário, mas por enquanto usaremos os dados brutos
    // Para simular as métricas (ingressos vendidos, valor total), precisaríamos de uma tabela de tickets.
    // Por enquanto, focaremos nos dados do evento.
}

const fetchManagerEvents = async (userId: string): Promise<ManagerEvent[]> => {
    if (!userId) {
        console.warn("Attempted to fetch manager events without a userId.");
        return [];
    }

    const { data, error } = await supabase
        .from('events')
        .select(`
            id,
            title,
            date,
            price
            -- Aqui você adicionaria joins para calcular ingressos vendidos e receita,
            -- mas como não temos a tabela de tickets ainda, retornamos os dados básicos.
        `)
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

    if (error) {
        console.error("Error fetching manager events from Supabase:", error);
        // O erro será tratado pelo useQuery, mas o log detalhado ajuda na depuração.
        throw new Error(error.message); 
    }
    
    // Convertendo a data para string para manter a compatibilidade com o tipo
    return data.map(event => ({
        ...event,
        date: event.date, // A data já vem como string (YYYY-MM-DD)
    })) as ManagerEvent[];
};

export const useManagerEvents = (userId: string | undefined) => {
    const queryClient = useQueryClient();

    const query = useQuery({
        queryKey: ['managerEvents', userId],
        queryFn: () => fetchManagerEvents(userId!),
        enabled: !!userId,
        staleTime: 1000 * 60 * 1, // 1 minute
        // Adicionando tratamento de erro para exibir o toast
        onError: (error) => {
            console.error("Query Error:", error);
            showError("Erro ao carregar seus eventos.");
        }
    });

    return {
        ...query,
        events: query.data || [],
        invalidateEvents: () => queryClient.invalidateQueries({ queryKey: ['managerEvents', userId] }),
    };
};