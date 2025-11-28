import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { showError } from '@/utils/toast';

interface CompanyData {
    id: string;
    cnpj: string;
    corporate_name: string;
}

// Modificado para buscar empresas associadas ao userId via user_companies
const fetchCompanies = async (userId: string): Promise<CompanyData[]> => {
    if (!userId) return [];

    // 1. Buscar todas as associações de empresa para este usuário
    const { data: userCompanies, error: ucError } = await supabase
        .from('user_companies')
        .select('company_id')
        .eq('user_id', userId);

    if (ucError) {
        console.error("Error fetching user company associations:", ucError);
        throw new Error(ucError.message);
    }
    
    const companyIds = userCompanies.map(uc => uc.company_id);
    
    if (companyIds.length === 0) {
        return [];
    }

    // 2. Buscar detalhes das empresas usando os IDs encontrados
    const { data, error } = await supabase
        .from('companies')
        .select('id, cnpj, corporate_name')
        .in('id', companyIds);

    if (error) {
        console.error("Error fetching companies details:", error);
        throw new Error(error.message);
    }

    return data as CompanyData[];
};

export const useManagerCompany = (userId: string | undefined) => {
    const query = useQuery({
        queryKey: ['managerCompany', userId],
        queryFn: () => fetchCompanies(userId!),
        enabled: !!userId,
        staleTime: 1000 * 60 * 5, // 5 minutes
        onError: (error) => {
            console.error("Query Error: Failed to load company data.", error);
            showError("Erro ao carregar dados da empresa. Verifique se o Perfil da Empresa está cadastrado.");
        }
    });

    return {
        ...query,
        // Retorna a primeira empresa encontrada (assumindo que o gestor PRO gerencia uma principal)
        company: query.data && query.data.length > 0 ? query.data[0] : null,
        // Também expõe todas as empresas, caso seja necessário no futuro
        allCompanies: query.data || [],
    };
};

export type { CompanyData };