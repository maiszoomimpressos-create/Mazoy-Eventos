import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Loader2, ArrowRight, UserCheck, AlertTriangle } from 'lucide-react';
import MultiLineEditor from '@/components/MultiLineEditor';
import { supabase } from '@/integrations/supabase/client';
import { useProfile } from '@/hooks/use-profile';
import { showError, showSuccess, showLoading, dismissToast } from '@/utils/toast';
import { useQueryClient } from '@tanstack/react-query';
import UserTypeSelectionModal from '@/components/UserTypeSelectionModal'; // Importando o novo modal

const ADMIN_MASTER_USER_TYPE_ID = 1;
const MANAGER_PRO_USER_TYPE_ID = 2; // Pessoa Física
const CLIENT_USER_TYPE_ID = 3;
const MANAGER_LEGAL_ENTITY_USER_TYPE_ID = 4; // Novo: Pessoa Jurídica

const ManagerRegistrationPage: React.FC = () => {
    const navigate = useNavigate();
    const queryClient = useQueryClient();
    const [userId, setUserId] = useState<string | undefined>(undefined);
    const [loadingSession, setLoadingSession] = useState(true);
    const [agreedToTerms, setAgreedToTerms] = useState(false);
    const [isUpdatingProfile, setIsUpdatingProfile] = useState(false);
    const [showUserTypeModal, setShowUserTypeModal] = useState(false); // Estado para controlar o modal

    useEffect(() => {
        supabase.auth.getUser().then(({ data: { user } }) => {
            setUserId(user?.id);
            setLoadingSession(false);
        });
    }, []);

    const { profile, isLoading: isLoadingProfile } = useProfile(userId);

    const isLoadingCombined = loadingSession || isLoadingProfile;

    // Redireciona se o usuário já for um gestor ou admin
    useEffect(() => {
        if (!isLoadingCombined && profile) {
            if (profile.tipo_usuario_id === ADMIN_MASTER_USER_TYPE_ID || profile.tipo_usuario_id === MANAGER_PRO_USER_TYPE_ID || profile.tipo_usuario_id === MANAGER_LEGAL_ENTITY_USER_TYPE_ID) {
                showSuccess("Você já é um gestor. Redirecionando para a criação de eventos.");
                navigate('/manager/events/create', { replace: true });
            } else if (profile.tipo_usuario_id !== CLIENT_USER_TYPE_ID) {
                // Caso seja um tipo de usuário inesperado, redireciona para a home
                showError("Tipo de usuário não reconhecido para este fluxo. Redirecionando.");
                navigate('/', { replace: true });
            }
        }
    }, [isLoadingCombined, profile, navigate]);

    const handleAgreeToTerms = (agreed: boolean) => {
        setAgreedToTerms(agreed);
    };

    const handleContinueClick = () => {
        if (!userId || !profile || profile.tipo_usuario_id !== CLIENT_USER_TYPE_ID) {
            showError("Ação não permitida. Você não é um cliente logado.");
            return;
        }

        if (!agreedToTerms) {
            showError("Você deve concordar com os termos para continuar.");
            return;
        }
        setShowUserTypeModal(true); // Abre o modal de seleção de tipo de usuário
    };

    const handleUserTypeSelection = async (selectedType: 'individual' | 'legal_entity') => {
        if (!userId || !profile || profile.tipo_usuario_id !== CLIENT_USER_TYPE_ID) {
            showError("Ação não permitida. Você não é um cliente logado.");
            return;
        }

        setIsUpdatingProfile(true);
        setShowUserTypeModal(false); // Fecha o modal
        const toastId = showLoading("Atualizando seu perfil para Gestor PRO...");

        let newTipoUsuarioId: number;
        if (selectedType === 'individual') {
            newTipoUsuarioId = MANAGER_PRO_USER_TYPE_ID;
        } else {
            newTipoUsuarioId = MANAGER_LEGAL_ENTITY_USER_TYPE_ID;
        }

        try {
            const { error } = await supabase
                .from('profiles')
                .update({ tipo_usuario_id: newTipoUsuarioId })
                .eq('id', userId);

            if (error) {
                throw error;
            }

            dismissToast(toastId);
            showSuccess("Parabéns! Seu perfil foi atualizado para Gestor PRO. Agora você pode cadastrar eventos.");
            
            // Invalida a query do perfil para que o useProfile recarregue com o novo tipo de usuário
            queryClient.invalidateQueries({ queryKey: ['profile', userId] });
            
            navigate('/manager/events/create', { replace: true });

        } catch (e: any) {
            dismissToast(toastId);
            console.error("Erro ao atualizar tipo de usuário:", e);
            showError(`Falha ao atualizar perfil: ${e.message || 'Erro desconhecido'}`);
        } finally {
            setIsUpdatingProfile(false);
        }
    };

    if (isLoadingCombined) {
        return (
            <div className="min-h-screen bg-black text-white flex items-center justify-center pt-20">
                <Loader2 className="h-10 w-10 animate-spin text-yellow-500" />
                <p className="ml-4 text-gray-400">Carregando seu perfil...</p>
            </div>
        );
    }

    // Se o perfil já foi carregado e não é um cliente, o useEffect já redirecionou.
    // Este return é um fallback ou para o caso de um breve flash antes do redirecionamento.
    if (profile && (profile.tipo_usuario_id === ADMIN_MASTER_USER_TYPE_ID || profile.tipo_usuario_id === MANAGER_PRO_USER_TYPE_ID || profile.tipo_usuario_id === MANAGER_LEGAL_ENTITY_USER_TYPE_ID)) {
        return null; 
    }

    return (
        <div className="max-w-4xl mx-auto px-4 sm:px-0 py-12">
            <div className="mb-8 text-center">
                <h1 className="text-3xl sm:text-4xl font-serif text-yellow-500 mb-2 flex items-center justify-center">
                    <UserCheck className="h-8 w-8 mr-3" />
                    Torne-se um Gestor PRO
                </h1>
                <p className="text-gray-400 text-sm sm:text-base">
                    Leia e aceite os termos para começar a criar e gerenciar seus próprios eventos.
                </p>
            </div>

            <Card className="bg-black/80 backdrop-blur-sm border border-yellow-500/30 rounded-2xl shadow-2xl shadow-yellow-500/10 p-6 sm:p-8">
                <CardHeader className="p-0 mb-6">
                    <CardTitle className="text-white text-xl sm:text-2xl font-semibold">Termos de Registro de Gestor</CardTitle>
                    <CardDescription className="text-gray-400 text-sm">
                        Estes termos regem o uso da plataforma Mazoy para promotores de eventos.
                    </CardDescription>
                </CardHeader>
                <CardContent className="p-0 space-y-6">
                    <MultiLineEditor 
                        onAgree={handleAgreeToTerms} 
                        initialAgreedState={agreedToTerms}
                        showAgreementCheckbox={true} 
                        termsType="manager_registration" 
                    />

                    <Button
                        onClick={handleContinueClick}
                        disabled={!agreedToTerms || isUpdatingProfile}
                        className="w-full bg-yellow-500 text-black hover:bg-yellow-600 py-3 text-lg font-semibold transition-all duration-300 cursor-pointer disabled:opacity-50"
                    >
                        {isUpdatingProfile ? (
                            <div className="flex items-center justify-center">
                                <Loader2 className="w-5 h-5 animate-spin mr-2" />
                                Continuar...
                            </div>
                        ) : (
                            <>
                                <ArrowRight className="mr-2 h-5 w-5" />
                                Continuar para Cadastro de Evento
                            </>
                        )}
                    </Button>
                </CardContent>
            </Card>

            <UserTypeSelectionModal
                isOpen={showUserTypeModal}
                onClose={() => setShowUserTypeModal(false)}
                onSelectUserType={handleUserTypeSelection}
                isProcessing={isUpdatingProfile}
            />
        </div>
    );
};

export default ManagerRegistrationPage;