import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { showError } from '@/utils/toast';

interface CompanyData {
    id: string;
    cnpj: string;
    corporate_name: string;
}

// Modificado para sempre retornar um array vazio, já que o cadastro de empresa foi removido
const fetchCompanies = async (userId: string): Promise<CompanyData[]> => {
    // console.warn("Aviso: A funcionalidade de perfil de empresa foi removida. Retornando dados vazios.");
    return [];
};

export const useManagerCompany = (userId: string | undefined) => {
    const query = useQuery({
        queryKey: ['managerCompany', userId],
        queryFn: () => fetchCompanies(userId!),
        enabled: !!userId,
        staleTime: Infinity, // Não há dados para ficarem 'stale'
        onError: (error) => {
            console.error("Query Error: Failed to load company data (funcionalidade removida).", error);
            // Não exibe um toast de erro, pois é um comportamento esperado após a remoção da funcionalidade
        }
    });

    return {
        ...query,
        company: null, // Sempre retorna null
        allCompanies: [], // Sempre retorna array vazio
    };
};

export type { CompanyData };