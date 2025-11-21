import { useState, useEffect } from 'react';
import { ProfileData } from './use-profile'; // Importando o tipo de dado

interface ProfileStatus {
    isComplete: boolean;
    hasPendingNotifications: boolean;
    loading: boolean;
}

// Agora, todos estes campos são necessários para que a notificação desapareça.
// O campo 'complemento' é o único considerado verdadeiramente opcional.
const ALL_REQUIRED_FIELDS: (keyof ProfileData)[] = [
    'first_name',
    'cpf',
    'birth_date',
    'rg',
    'gender',
    'cep',
    'rua',
    'bairro',
    'cidade',
    'estado',
    'numero',
];

// Função auxiliar para verificar se um valor é considerado vazio
const isValueEmpty = (value: any): boolean => {
    if (value === null || value === undefined) return true;
    if (typeof value === 'string') return value.trim() === '';
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

        let isProfileConsideredComplete = true;

        if (!profile) {
            // Se não há perfil, ele está definitivamente incompleto.
            isProfileConsideredComplete = false;
        } else {
            // Itera sobre a lista de TODOS os campos obrigatórios.
            for (const field of ALL_REQUIRED_FIELDS) {
                const value = profile[field];
                if (isValueEmpty(value)) {
                    // Se qualquer um dos campos estiver vazio, o perfil é considerado incompleto.
                    console.log(`[ProfileStatus] Profile incomplete. Missing field: ${field}`);
                    isProfileConsideredComplete = false;
                    break; // Encontrou um campo vazio, já pode parar a verificação.
                }
            }
        }
        
        console.log(`[ProfileStatus] Final check - Profile Complete: ${isProfileConsideredComplete}`);

        setStatus({
            isComplete: isProfileConsideredComplete,
            hasPendingNotifications: !isProfileConsideredComplete,
            loading: false,
        });
    }, [profile, isLoading]);

    return status;
}