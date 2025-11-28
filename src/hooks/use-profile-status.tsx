import { useState, useEffect } from 'react';
import { ProfileData } from './use-profile';
import { supabase } from '@/integrations/supabase/client';

interface ProfileStatus {
    isComplete: boolean;
    hasPendingNotifications: boolean;
    loading: boolean;
    needsCompanyProfile: boolean; // Indica se um gestor PJ precisa criar um perfil de empresa
    needsPersonalProfileCompletion: boolean; // Indica se um gestor (PF ou PJ) precisa completar o perfil pessoal
}

// Export this function so Profile.tsx can use it for consistency
export const isValueEmpty = (value: any): boolean => {
    if (value === null || value === undefined) return true;
    if (typeof value === 'string') {
        const trimmedValue = value.trim();
        if (trimmedValue === '') return true;
        // Check common date/document placeholders that might have been saved
        if (trimmedValue === '0000-00-00' || trimmedValue === '00.000.000-0' || trimmedValue === '00.000.000' || trimmedValue === '000.000.000-00' || trimmedValue === '00000-000') return true;
    }
    // For numbers, 0 is a valid value, so it's not empty.
    if (typeof value === 'number' && value === 0) return false;
    return false;
};

// Essential fields for ANY user's personal profile (client or manager)
export const ESSENTIAL_PERSONAL_PROFILE_FIELDS = [
    'first_name', 'last_name', 'cpf', 'birth_date', 'gender',
    'cep', 'rua', 'bairro', 'cidade', 'estado', 'numero', 'complemento' // RG é opcional
];

// Essential fields for a company profile (for Manager PRO - PJ)
const ESSENTIAL_COMPANY_PROFILE_FIELDS = [
    'cnpj', 'corporate_name', 'phone', 'email',
    'cep', 'street', 'neighborhood', 'city', 'state', 'number', 'complement'
];

// Simulação de verificação de notificações de sistema para Gestores
const checkManagerSystemNotifications = async (userId: string): Promise<boolean> => {
    // Fetch manager settings for system notifications
    const { data: settingsArray, error: settingsError } = await supabase
        .from('manager_settings')
        .select('low_stock_system')
        .eq('user_id', userId) 
        .limit(1);

    let settings = {};
    if (settingsError) {
        console.error(`[ProfileStatus] Error fetching manager settings for user ${userId}:`, settingsError);
        if (settingsError.code !== 'PGRST116' && settingsError.code !== '406') { 
            console.warn(`[ProfileStatus] Unexpected error code ${settingsError.code} for manager settings. Treating as no settings configured.`);
        }
    } else if (settingsArray && settingsArray.length > 0) {
        settings = settingsArray[0];
        console.log(`[ProfileStatus] Manager settings fetched for user ${userId}:`, settings);
    } else {
        console.log(`[ProfileStatus] No manager settings found for user ${userId}.`);
    }

    // Exemplo 1: Alerta de Baixo Estoque (se a configuração estiver ativa)
    if ((settings as any).low_stock_system) {
        // Esta é uma simulação. Na vida real, você buscaria eventos reais e calcularia o estoque.
        // Para fins de demonstração, se o gestor tiver mais de 2 eventos, ativamos o alerta.
        const { count, error } = await supabase
            .from('events')
            .select('id', { count: 'exact', head: true })
            .eq('user_id', userId);
        
        if (error) {
            console.error("Error checking manager events for low stock simulation:", error);
            return false;
        }

        if (count && count > 2) { // Arbitrary condition for "low stock" notification
            console.log("[ProfileStatus] Manager has active low stock system notification.");
            return true;
        }
    }

    return false;
};

export function useProfileStatus(profile: ProfileData | null | undefined, isLoading: boolean): ProfileStatus {
    const [status, setStatus] = useState<ProfileStatus>({
        isComplete: true,
        hasPendingNotifications: false,
        loading: isLoading,
        needsCompanyProfile: false,
        needsPersonalProfileCompletion: false,
    });

    useEffect(() => {
        setStatus(prev => ({ ...prev, loading: isLoading }));

        if (isLoading) return;

        // Se o perfil é nulo, mas há um userId (usuário logado), significa que o perfil está faltando no DB
        // ou ainda não foi carregado. Para um gestor, isso significa que o perfil está incompleto.
        if (!profile) {
            // Verifica se há um usuário logado (userId) e se não estamos mais carregando
            if (supabase.auth.getUser() && !isLoading) { 
                console.log("[ProfileStatus] Usuário logado, mas dados de perfil nulos. Marcando como incompleto.");
                setStatus({ 
                    isComplete: false, 
                    hasPendingNotifications: true, // Precisa de atenção
                    loading: false, 
                    needsCompanyProfile: false, // Não podemos determinar o tipo de usuário sem o perfil
                    needsPersonalProfileCompletion: true, // Definitivamente precisa do perfil pessoal
                });
            } else {
                // Se não há userId ou ainda está carregando, assume-se completo para acesso público
                console.log("[ProfileStatus] Sem sessão de usuário ativa ou dados de perfil. Assumindo completo para acesso público.");
                setStatus({ isComplete: true, hasPendingNotifications: false, loading: false, needsCompanyProfile: false, needsPersonalProfileCompletion: false });
            }
            return;
        }

        const checkStatus = async () => {
            let hasPendingNotifications = false;
            let isComplete = true;
            let needsCompanyProfile = false;
            let needsPersonalProfileCompletion = false;

            console.log(`[ProfileStatus] Verificando perfil para o usuário ${profile.id}, tipo: ${profile.tipo_usuario_id}`);

            // Verifica a completude do perfil pessoal para TODOS os usuários (clientes e gestores)
            for (const field of ESSENTIAL_PERSONAL_PROFILE_FIELDS) {
                const value = profile[field as keyof ProfileData];
                if (isValueEmpty(value)) {
                    isComplete = false;
                    needsPersonalProfileCompletion = true;
                    console.log(`[ProfileStatus] Perfil pessoal incompleto: Campo '${field}' faltando (Valor: '${value}')`);
                    break;
                }
            }

            // Se for um Gestor PRO (tipo_usuario_id = 2), também verifica o perfil da empresa
            if (profile.tipo_usuario_id === 2) {
                console.log("[ProfileStatus] Usuário é Gestor PRO. Verificando perfil da empresa...");
                const { data: companyData, error: companyError } = await supabase
                    .from('companies')
                    .select('*')
                    .eq('user_id', profile.id)
                    .limit(1);

                if (companyError && companyError.code !== 'PGRST116') {
                    console.error("[ProfileStatus] Erro ao buscar dados da empresa:", companyError);
                    isComplete = false; // Considera incompleto se houver erro ao buscar dados da empresa
                    needsCompanyProfile = true; // Assume que o perfil da empresa é necessário devido ao erro
                } else if (!companyData || companyData.length === 0) {
                    needsCompanyProfile = true;
                    isComplete = false;
                    console.log("[ProfileStatus] Gestor PRO precisa criar perfil da empresa (nenhuma empresa encontrada).");
                } else {
                    // Verifica os campos do perfil da empresa se a empresa existir
                    const companyProfile = companyData[0];
                    for (const field of ESSENTIAL_COMPANY_PROFILE_FIELDS) {
                        const value = companyProfile[field as keyof typeof companyProfile];
                        if (isValueEmpty(value)) {
                            isComplete = false;
                            needsCompanyProfile = true; // Marca como precisando completar o perfil da empresa
                            console.log(`[ProfileStatus] Perfil da empresa do gestor incompleto: Campo '${field}' faltando (Valor: '${value}')`);
                            break;
                        }
                    }
                    if (!needsCompanyProfile) {
                        console.log("[ProfileStatus] Perfil da empresa do gestor está completo.");
                    }
                }
            }
            // Para Admin Master (tipo_usuario_id = 1), o perfil pessoal é verificado acima.
            // O perfil da empresa é opcional para Admin Master, então não há verificação adicional aqui.
            else if (profile.tipo_usuario_id === 1) {
                console.log("[ProfileStatus] Usuário é Admin Master. Perfil da empresa é opcional.");
            }


            // Verifica notificações de sistema para gestores (independente da completude do perfil)
            if (profile.tipo_usuario_id === 1 || profile.tipo_usuario_id === 2) {
                hasPendingNotifications = await checkManagerSystemNotifications(profile.id);
                if (hasPendingNotifications) {
                    console.log("[ProfileStatus] Gestor tem notificações de sistema.");
                }
            }
            
            // Se o perfil pessoal ou da empresa estiver incompleto, sempre define hasPendingNotifications como true
            // Isso garante que o ícone de sino apareça e solicite ao usuário que complete o perfil
            if (needsPersonalProfileCompletion || needsCompanyProfile) {
                hasPendingNotifications = true;
                console.log("[ProfileStatus] Definindo hasPendingNotifications como TRUE devido ao perfil incompleto.");
            }

            console.log(`[ProfileStatus] Estado Final - User ID: ${profile.id}, Tipo: ${profile.tipo_usuario_id}`);
            console.log(`[ProfileStatus]   isComplete: ${isComplete}`);
            console.log(`[ProfileStatus]   needsPersonalProfileCompletion: ${needsPersonalProfileCompletion}`);
            console.log(`[ProfileStatus]   needsCompanyProfile: ${needsCompanyProfile}`);
            console.log(`[ProfileStatus]   hasPendingNotifications: ${hasPendingNotifications}`);

            setStatus({
                isComplete: isComplete,
                hasPendingNotifications: hasPendingNotifications,
                loading: false,
                needsCompanyProfile: needsCompanyProfile,
                needsPersonalProfileCompletion: needsPersonalProfileCompletion,
            });
        };

        checkStatus();
    }, [profile, isLoading]);

    return status;
}