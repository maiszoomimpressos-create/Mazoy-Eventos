import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Settings, User, CreditCard, Bell, Loader2, Building } from 'lucide-react';
import { useProfile } from '@/hooks/use-profile';
import { supabase } from '@/integrations/supabase/client';
import { useManagerCompany } from '@/hooks/use-manager-company';
import ManagerProfileEditDialog from '@/components/ManagerProfileEditDialog'; // Importando o novo modal

const ADMIN_MASTER_USER_TYPE_ID = 1;
const MANAGER_PRO_USER_TYPE_ID = 2;

const ManagerSettings: React.FC = () => {
    const navigate = useNavigate();
    const [userId, setUserId] = useState<string | undefined>(undefined);
    const [loadingSession, setLoadingSession] = useState(true);
    const [isProfileModalOpen, setIsProfileModalOpen] = useState(false); // Novo estado para o modal PF

    useEffect(() => {
        supabase.auth.getUser().then(({ data: { user } }) => {
            setUserId(user?.id);
            setLoadingSession(false); // Define como falso após tentar obter o usuário
        });
    }, []);

    const { profile, isLoading: isLoadingProfile } = useProfile(userId);
    const { company, isLoading: isLoadingCompany } = useManagerCompany(userId);

    // Combinando todos os estados de carregamento
    const isLoadingCombined = loadingSession || isLoadingProfile || isLoadingCompany;

    const isAdminMaster = profile?.tipo_usuario_id === ADMIN_MASTER_USER_TYPE_ID;
    const isManagerPro = profile?.tipo_usuario_id === MANAGER_PRO_USER_TYPE_ID;
    
    // Determina se o gestor PRO é PF (Tipo 2 e sem empresa associada)
    const isManagerPF = isManagerPro && !company;

    let profileSettingsOption = null;
    if (isManagerPF) {
        profileSettingsOption = { 
            icon: <User className="h-6 w-6 text-yellow-500" />, 
            title: "Perfil do Gestor (PF)", 
            description: "Atualize seus dados pessoais como gestor individual.", 
            action: () => setIsProfileModalOpen(true) // Abre o modal
        };
    } else if (isManagerPro && company) {
        profileSettingsOption = { 
            icon: <Building className="h-6 w-6 text-yellow-500" />, 
            title: "Perfil da Empresa", 
            description: "Atualize informações de contato e dados corporativos.", 
            path: "/manager/settings/company-profile" 
        };
    } else if (isAdminMaster) {
        // Admin Master pode ter uma empresa, mas o foco principal é o perfil da empresa se existir
        if (company) {
            profileSettingsOption = { 
                icon: <Building className="h-6 w-6 text-yellow-500" />, 
                title: "Perfil da Empresa", 
                description: "Atualize informações de contato e dados corporativos.", 
                path: "/manager/settings/company-profile" 
            };
        } else {
            // Se Admin Master não tiver empresa, ele pode editar o perfil pessoal
            profileSettingsOption = { 
                icon: <User className="h-6 w-6 text-yellow-500" />, 
                title: "Perfil Pessoal (Admin)", 
                description: "Atualize seus dados pessoais.", 
                action: () => navigate('/profile') // Redireciona para a tela de perfil padrão
            };
        }
    }

    const settingsOptions = [];
    if (profileSettingsOption) {
        settingsOptions.push(profileSettingsOption);
    }
    
    settingsOptions.push(
        { icon: <Bell className="h-6 w-6 text-yellow-500" />, title: "Notificações e Alertas", description: "Defina preferências de notificação por e-mail e sistema.", path: "/manager/settings/notifications" },
        { icon: <CreditCard className="h-6 w-6 text-yellow-500" />, title: "Configurações de Pagamento", description: "Gerencie contas bancárias e gateways de pagamento.", path: "/manager/settings/payment" },
    );
    
    if (isAdminMaster) {
        settingsOptions.push({ icon: <Settings className="h-6 w-6 text-yellow-500" />, title: "Configurações Avançadas", description: "Ajustes de sistema, segurança e integrações.", path: "/manager/settings/advanced" });
    }

    if (isLoadingCombined) { // Usando a variável combinada
        return (
            <div className="max-w-7xl mx-auto text-center py-20">
                <Loader2 className="h-10 w-10 animate-spin text-yellow-500 mx-auto mb-4" />
                <p className="text-gray-400">Carregando configurações...</p>
            </div>
        );
    }
    
    const handleCardClick = (option: typeof settingsOptions[0]) => {
        if (option.path) {
            navigate(option.path);
        } else if (option.action) {
            option.action();
        }
    };

    return (
        <div className="max-w-7xl mx-auto pt-8">
            <div className="mb-8">
                <h1 className="text-2xl sm:text-3xl font-serif text-yellow-500 mb-2">Configurações do Gestor</h1>
                <p className="text-gray-400 text-sm sm:text-base">Gerencie as configurações da sua conta PRO e do sistema.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {settingsOptions.map((option, index) => (
                    <Card 
                        key={index}
                        className="bg-black/80 backdrop-blur-sm border border-yellow-500/30 rounded-2xl p-6 hover:border-yellow-500/60 hover:shadow-2xl hover:shadow-yellow-500/20 transition-all duration-300 cursor-pointer"
                        onClick={() => handleCardClick(option)}
                    >
                        <CardHeader className="p-0 mb-4">
                            <div className="flex items-center space-x-4">
                                <div className="w-12 h-12 bg-yellow-500/20 rounded-xl flex items-center justify-center flex-shrink-0">
                                    {option.icon}
                                </div>
                                <CardTitle className="text-white text-xl">{option.title}</CardTitle>
                            </div>
                        </CardHeader>
                        <CardContent className="p-0">
                            <CardDescription className="text-gray-400 text-sm">
                                {option.description}
                            </CardDescription>
                        </CardContent>
                    </Card>
                ))}
            </div>

            <div className="mt-10 pt-6 border-t border-yellow-500/20">
                <h2 className="text-xl font-semibold text-white mb-4">Ações de Conta</h2>
                <div className="flex flex-col sm:flex-row space-y-4 sm:space-y-0 sm:space-x-4">
                    <Button 
                        variant="outline"
                        className="bg-black/60 border-red-500/30 text-red-400 hover:bg-red-500/10"
                        onClick={() => alert("Funcionalidade de exclusão de conta em desenvolvimento.")}
                    >
                        <i className="fas fa-trash-alt mr-2"></i>
                        Excluir Conta PRO
                    </Button>
                    <Button 
                        onClick={() => navigate('/manager/dashboard')}
                        className="bg-yellow-500 text-black hover:bg-yellow-600"
                    >
                        <i className="fas fa-arrow-left mr-2"></i>
                        Voltar ao Dashboard
                    </Button>
                </div>
            </div>
            
            {/* Modal de Edição de Perfil PF */}
            {isManagerPF && (
                <ManagerProfileEditDialog
                    isOpen={isProfileModalOpen}
                    onClose={() => setIsProfileModalOpen(false)}
                    profile={profile}
                    userId={userId}
                />
            )}
        </div>
    );
};

export default ManagerSettings;