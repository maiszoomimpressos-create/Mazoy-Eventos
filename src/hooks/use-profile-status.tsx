import { useState, useEffect } from 'react';
import { ProfileData } from './use-profile'; // Importando o tipo de dado
import { supabase } from '@/integrations/supabase/client';

interface ProfileStatus {
    isComplete: boolean;
    hasPendingNotifications: boolean;
    loading: boolean;
}

// Campos considerados essenciais para o perfil (Nome, CPF, Data de Nascimento)
const ESSENTIAL_FIELDS = [
    'first_name', 
    'cpf', 
    'birth_date',
];

// Todos os campos que, se vazios, tornam o perfil 'incompleto' para o cliente (Tipo 3)
const ALL_CLIENT_FIELDS_TO_CHECK = [
    ...ESSENTIAL_FIELDS,
    'rg', 
    'gender', 
    'cep', 
    'rua', 
    'bairro', 
    'cidade', 
    'estado', 
    'numero', 
    'complemento',
];

// Função auxiliar para verificar se um valor é considerado vazio
const isValueEmpty = (value: any): boolean => {
    if (value === null || value === undefined) return true;
    if (typeof value === 'string') {
        const trimmedValue = value.trim();
        if (trimmedValue === '') return true;
        // Verifica placeholders comuns de data/documentos que podem ter sido salvos
        if (trimmedValue === '0000-00-00' || trimmedValue === '00.000.000-0' || trimmedValue === '00000-000') return true;
    }
    return false;
};

// Simulação de verificação de notificações de sistema para Gestores
const checkManagerSystemNotifications = async (userId: string, settings: any): Promise<boolean> => {
    if (!settings) return false;

    // Exemplo 1: Alerta de Baixo Estoque (se a configuração estiver ativa)
    if (settings.low_stock_system) {
        // Simulação: Se o gestor tiver mais de 2 eventos cadastrados, simulamos um alerta de baixo estoque.
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
            // Se não há perfil (usuário logado, mas perfil não carregado), consideramos incompleto/pendente
            setStatus({ isComplete: false, hasPendingNotifications: true, loading: false });
            return;
        }

        const checkStatus = async () => {
            let hasPendingNotifications = false;
            let isComplete = true;

            // --- Lógica de Cliente (Tipo 3) ---
            if (profile.tipo_usuario_id === 3) {
                let missingField = false;

                // 1. Verificar TODOS os campos listados
                for (const field of ALL_CLIENT_FIELDS_TO_CHECK) {
                    const value = profile[field as keyof ProfileData];
                    if (isValueEmpty(value)) {
                        missingField = true;
                        console.log(`[ProfileStatus] Missing field: ${field}`);
                        break;
                    }
                }

                // 2. Se qualquer campo estiver faltando, o perfil é incompleto
                isComplete = !missingField;
                hasPendingNotifications = !isComplete;
                
            } 
            // --- Lógica de Gestor (Tipo 1 ou 2) ---
            else if (profile.tipo_usuario_id === 1 || profile.tipo_usuario_id === 2) {
                // Para gestores, a notificação pendente é baseada em alertas de sistema (ex: baixo estoque)
                
                // 1. Buscar configurações do gestor
                const { data: settingsData } = await supabase
                    .from('manager_settings')
                    .select('low_stock_system')
                    .eq('user_id', profile.id)
                    .single();

                // 2. Verificar alertas de sistema (simulação)
                const settings = settingsData || {};
                hasPendingNotifications = await checkManagerSystemNotifications(profile.id, settings);
                
                // Para gestores, o perfil é considerado 'completo' se o perfil base estiver ok, mas focamos nas notificações de sistema
                isComplete = true; 
            }

            console.log(`[ProfileStatus] Profile Complete: ${isComplete}. Notifications Active: ${hasPendingNotifications}`);

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