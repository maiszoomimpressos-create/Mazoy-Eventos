import { useState, useEffect } from 'react';
import { ProfileData } from './use-profile';
import { supabase } from '@/integrations/supabase/client';

interface ProfileStatus {
    isComplete: boolean;
    hasPendingNotifications: boolean;
    loading: boolean;
}

// Export this function so Profile.tsx can use it for consistency
export const isValueEmpty = (value: any): boolean => {
    if (value === null || value === undefined) return true;
    if (typeof value === 'string') {
        const trimmedValue = value.trim();
        if (trimmedValue === '') return true;
        // Verifica placeholders comuns de data/documentos que podem ter sido salvos
        if (trimmedValue === '0000-00-00' || trimmedValue === '00.000.000-0' || trimmedValue === '00000-000') return true;
    }
    return false;
};

// Todos os campos que, se vazios, tornam o perfil 'incompleto' para qualquer tipo de usuário
export const ALL_PROFILE_FIELDS_TO_CHECK = [ 
    'first_name',
    'last_name', 
    'cpf',
    'rg',
    'birth_date',
    'gender',
    'cep',
    'rua',
    'bairro',
    'cidade',
    'estado',
    'numero',
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
        const { count, error } = await supabase
            .from('events')
            .select('id', { count: 'exact', head: true })
            .eq('user_id', userId);
        
        if (error) {
            console.error("Error checking manager events for low stock simulation:", error);
            return false;
        }

        if (count && count > 2) {
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
    });

    useEffect(() => {
        setStatus(prev => ({ ...prev, loading: isLoading }));

        if (isLoading) return;

        if (!profile) {
            setStatus({ isComplete: false, hasPendingNotifications: true, loading: false });
            return;
        }

        const checkStatus = async () => {
            let hasPendingNotifications = false;
            let isComplete = true; 
            const currentMissingFields: string[] = []; 

            // Lógica para Clientes (tipo_usuario_id = 3)
            if (profile.tipo_usuario_id === 3) {
                // Para clientes, o perfil é considerado completo para fins de navegação e notificações
                // mesmo que alguns campos pessoais estejam vazios.
                isComplete = true; 
                hasPendingNotifications = false; // Clientes não terão notificações por perfil incompleto
            } 
            // Lógica para Gestores (tipo_usuario_id = 1 ou 2)
            else if (profile.tipo_usuario_id === 1 || profile.tipo_usuario_id === 2) {
                // 1. Verificar campos pessoais essenciais para Gestores
                for (const field of ALL_PROFILE_FIELDS_TO_CHECK) {
                    const value = profile[field as keyof ProfileData];
                    if (isValueEmpty(value)) {
                        isComplete = false;
                        currentMissingFields.push(field); 
                    }
                }

                // 2. Lógica adicional para Gestores PRO (tipo_usuario_id = 2)
                // Se o usuário é um Gestor PRO (tipo 2), ele também precisa ter um perfil de empresa cadastrado.
                if (profile.tipo_usuario_id === 2) {
                    if (profile.id) { 
                        const { data: companyData, error: companyError } = await supabase
                            .from('companies')
                            .select('id')
                            .eq('user_id', profile.id) 
                            .limit(1); // Usando limit(1) para evitar 406

                        if (companyError && companyError.code !== 'PGRST116' && companyError.code !== '406') { 
                            console.error("[ProfileStatus] Error checking company profile for manager:", companyError);
                            isComplete = false; 
                            currentMissingFields.push('company_profile_error');
                        } else if (!companyData || companyData.length === 0) { // Verifica se o array está vazio
                            isComplete = false; 
                            currentMissingFields.push('company_profile');
                        }
                    } else {
                        isComplete = false;
                        currentMissingFields.push('company_profile_id_missing');
                    }
                }
                
                // Notificações pendentes para gestores: se o perfil estiver incompleto OU se houver notificações de sistema
                hasPendingNotifications = !isComplete || await checkManagerSystemNotifications(profile.id);
            }

            if (!isComplete) {
                console.warn(`[ProfileStatus] Profile is INCOMPLETE. Missing fields: ${currentMissingFields.join(', ')}`);
            }

            console.log(`[ProfileStatus] Final State - Profile Complete: ${isComplete}. Notifications Active: ${hasPendingNotifications}`);

            setStatus({
                isComplete: isComplete,
                hasPendingNotifications: hasPendingNotifications,
                loading: false,
            });
        };

        checkStatus();
    }, [profile, isLoading]);

    return status;
}