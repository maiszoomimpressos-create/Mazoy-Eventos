import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { showError } from '@/utils/toast';

export interface WristbandData {
    id: string;
    code: string;
    access_type: string;
    status: 'active' | 'used' | 'lost' | 'cancelled';
    created_at: string;
    event_id: string;
    
    // Dados do evento associado (join)
    events: {
        title: string;
    } | null;
}

const fetchManagerWristbands = async (companyId: string): Promise<WristbandData[]> => {
    if (!companyId) {
        console.warn("Attempted to fetch wristbands without a companyId.");
        return [];
    }

    // A RLS garante que apenas as pulseiras da empresa do gestor logado serão retornadas.
    // Adicionamos um filtro explícito por company_id para maior segurança e clareza.
    const { data, error } = await supabase
        .from('wristbands')
        .select(`
            id,
            code,
            access_type,
            status,
            created_at,
            event_id,
            events (title)
        `)
        .eq('company_id', companyId) // FILTRO ADICIONADO AQUI
        .order('created_at', { ascending: false });

    if (error) {
        console.error("Error fetching manager wristbands from Supabase:", error);
        throw new Error(error.message); 
    }
    
    return data as WristbandData[];
};

export const useManagerWristbands = (companyId: string | undefined) => {
    const queryClient = useQueryClient();

    const query = useQuery({
        queryKey: ['managerWristbands', companyId],
        queryFn: () => fetchManagerWristbands(companyId!),
        enabled: !!companyId, // Só executa se tiver o companyId
        staleTime: 1000 * 30, // 30 seconds
        onError: (error) => {
            console.error("Query Error:", error);
            showError("Erro ao carregar lista de pulseiras. Verifique se o Perfil da Empresa está cadastrado.");
        }
    });

    return {
        ...query,
        wristbands: query.data || [],
        invalidateWristbands: () => queryClient.invalidateQueries({ queryKey: ['managerWristbands', companyId] }),
    };
};