import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { showError } from '@/utils/toast';

interface CompanyData {
    id: string;
    cnpj: string;
    corporate_name: string;
    trade_name: string | null;
    phone: string | null;
    email: string | null;
    cep: string | null;
    street: string | null;
    number: string | null;
    neighborhood: string | null;
    city: string | null;
    state: string | null;
    complement: string | null;
    created_at: string;
    updated_at: string;
    user_id: string;
}

const fetchCompanies = async (userId: string, userTypeId: number | undefined): Promise<CompanyData | null> => {
    // Removendo a lógica de busca de empresa, pois o tipo PJ foi removido.
    return null;
};

export const useManagerCompany = (userId: string | undefined, userTypeId: number | undefined) => {
    const query = useQuery({
        queryKey: ['managerCompany', userId, userTypeId], 
        queryFn: () => fetchCompanies(userId!, userTypeId),
        enabled: !!userId, 
        staleTime: 1000 * 60 * 5, // 5 minutes
        onError: (error) => {
            console.error("Query Error: Failed to load company data.", error);
            showError("Erro ao carregar dados da empresa.");
        }
    });

    return {
        ...query,
        company: query.data, // Retorna null
        allCompanies: [], // Retorna um array vazio
    };
};

export type { CompanyData };