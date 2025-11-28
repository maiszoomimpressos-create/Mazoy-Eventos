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
    // user_id foi removido
}

interface UserCompanyAssociation {
    user_id: string;
    company_id: string;
    role: string;
    is_primary: boolean;
    companies: CompanyData;
}

const ADMIN_MASTER_USER_TYPE_ID = 1;
const MANAGER_PRO_USER_TYPE_ID = 2;

/**
 * Busca a empresa principal associada ao usuário logado.
 * Retorna a CompanyData da empresa principal.
 */
const fetchPrimaryCompany = async (userId: string, userTypeId: number | undefined): Promise<CompanyData | null> => {
    if (!userId || (userTypeId !== ADMIN_MASTER_USER_TYPE_ID && userTypeId !== MANAGER_PRO_USER_TYPE_ID)) {
        return null;
    }
    
    // 1. Buscar a associação principal do usuário
    const { data: associationData, error: associationError } = await supabase
        .from('user_companies')
        .select(`
            company_id,
            companies (*)
        `)
        .eq('user_id', userId)
        .eq('is_primary', true)
        .limit(1);

    if (associationError && associationError.code !== 'PGRST116') {
        console.error("Error fetching primary company association:", associationError);
        throw new Error(associationError.message);
    }
    
    if (associationData && associationData.length > 0 && associationData[0].companies) {
        return associationData[0].companies as CompanyData;
    }
    
    return null;
};

/**
 * Busca todas as empresas associadas ao usuário.
 */
const fetchAllCompanies = async (userId: string, userTypeId: number | undefined): Promise<CompanyData[]> => {
    if (!userId || (userTypeId !== ADMIN_MASTER_USER_TYPE_ID && userTypeId !== MANAGER_PRO_USER_TYPE_ID)) {
        return [];
    }
    
    // 1. Buscar todas as associações do usuário
    const { data: associationData, error: associationError } = await supabase
        .from('user_companies')
        .select(`
            companies (*)
        `)
        .eq('user_id', userId);

    if (associationError) {
        console.error("Error fetching all company associations:", associationError);
        throw new Error(associationError.message);
    }
    
    return associationData?.map(assoc => assoc.companies).filter(c => c !== null) as CompanyData[] || [];
};


export const useManagerCompany = (userId: string | undefined, userTypeId: number | undefined) => {
    const queryClient = useQueryClient();
    
    // Query para a empresa principal (usada na maioria dos fluxos de gestão)
    const primaryCompanyQuery = useQuery({
        queryKey: ['managerPrimaryCompany', userId, userTypeId], 
        queryFn: () => fetchPrimaryCompany(userId!, userTypeId),
        enabled: !!userId && (userTypeId === ADMIN_MASTER_USER_TYPE_ID || userTypeId === MANAGER_PRO_USER_TYPE_ID), 
        staleTime: 1000 * 60 * 5, // 5 minutes
        onError: (error) => {
            console.error("Query Error: Failed to load primary company data.", error);
            showError("Erro ao carregar dados da empresa principal.");
        }
    });
    
    // Query para todas as empresas (usada para a lista de sócios/empresas)
    const allCompaniesQuery = useQuery({
        queryKey: ['managerAllCompanies', userId, userTypeId], 
        queryFn: () => fetchAllCompanies(userId!, userTypeId),
        enabled: !!userId && (userTypeId === ADMIN_MASTER_USER_TYPE_ID || userTypeId === MANAGER_PRO_USER_TYPE_ID), 
        staleTime: 1000 * 60 * 5, // 5 minutes
    });

    return {
        ...primaryCompanyQuery,
        company: primaryCompanyQuery.data, // Empresa principal
        allCompanies: allCompaniesQuery.data || [], // Todas as empresas
        isLoadingAllCompanies: allCompaniesQuery.isLoading,
        invalidateCompany: () => {
            queryClient.invalidateQueries({ queryKey: ['managerPrimaryCompany', userId, userTypeId] });
            queryClient.invalidateQueries({ queryKey: ['managerAllCompanies', userId, userTypeId] });
        },
    };
};

export type { CompanyData, UserCompanyAssociation };