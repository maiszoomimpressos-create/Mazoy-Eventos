import { useQuery, useQueryClient } from '@tanstack/react-query';
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

const ADMIN_MASTER_USER_TYPE_ID = 1;
const MANAGER_PRO_USER_TYPE_ID = 2;

const fetchCompanies = async (userId: string, userTypeId: number | undefined): Promise<CompanyData | null> => {
    if (!userId || (userTypeId !== ADMIN_MASTER_USER_TYPE_ID && userTypeId !== MANAGER_PRO_USER_TYPE_ID)) {
        return null;
    }
    
    // Busca o perfil da empresa associado ao user_id
    const { data, error } = await supabase
        .from('companies')
        .select('*')
        .eq('user_id', userId)
        .single();

    if (error && error.code !== 'PGRST116') { // PGRST116 = No rows found
        console.error("Error fetching company profile:", error);
        throw new Error(error.message);
    }
    
    return data as CompanyData || null;
};

export const useManagerCompany = (userId: string | undefined, userTypeId: number | undefined) => {
    const queryClient = useQueryClient();
    
    const query = useQuery({
        queryKey: ['managerCompany', userId, userTypeId], 
        queryFn: () => fetchCompanies(userId!, userTypeId),
        enabled: !!userId && (userTypeId === ADMIN_MASTER_USER_TYPE_ID || userTypeId === MANAGER_PRO_USER_TYPE_ID), 
        staleTime: 1000 * 60 * 5, // 5 minutes
        onError: (error) => {
            console.error("Query Error: Failed to load company data.", error);
            showError("Erro ao carregar dados da empresa.");
        }
    });

    return {
        ...query,
        company: query.data,
        allCompanies: [], // Mantido vazio para simplificar
        invalidateCompany: () => queryClient.invalidateQueries({ queryKey: ['managerCompany', userId, userTypeId] }),
    };
};

export type { CompanyData };