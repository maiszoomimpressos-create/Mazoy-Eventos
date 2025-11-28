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

const MANAGER_LEGAL_ENTITY_USER_TYPE_ID = 4; // Definindo o ID para Gestor Pessoa Jurídica

const fetchCompanies = async (userId: string, userTypeId: number | undefined): Promise<CompanyData | null> => {
    if (!userId || userTypeId !== MANAGER_LEGAL_ENTITY_USER_TYPE_ID) {
        // Se não for um Gestor Pessoa Jurídica, não há empresa para buscar neste contexto
        return null;
    }

    const { data, error } = await supabase
        .from('companies')
        .select('*')
        .eq('user_id', userId)
        .single();

    if (error) {
        if (error.code === 'PGRST116') { // No rows found
            console.warn(`[useManagerCompany] Nenhuma empresa encontrada para o usuário ${userId}.`);
            return null;
        }
        console.error("Error fetching company:", error);
        throw new Error(error.message);
    }
    
    return data as CompanyData;
};

export const useManagerCompany = (userId: string | undefined, userTypeId: number | undefined) => {
    const query = useQuery({
        queryKey: ['managerCompany', userId, userTypeId], // Inclui userTypeId na chave de cache
        queryFn: () => fetchCompanies(userId!, userTypeId),
        enabled: !!userId && userTypeId === MANAGER_LEGAL_ENTITY_USER_TYPE_ID, // Habilita a query apenas para Gestor Pessoa Jurídica
        staleTime: 1000 * 60 * 5, // 5 minutes
        onError: (error) => {
            console.error("Query Error: Failed to load company data.", error);
            showError("Erro ao carregar dados da empresa.");
        }
    });

    return {
        ...query,
        company: query.data, // Retorna os dados reais da empresa ou null
        allCompanies: query.data ? [query.data] : [], // Retorna um array com a empresa ou vazio
    };
};

export type { CompanyData };