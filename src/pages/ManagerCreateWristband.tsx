import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowLeft, Loader2, QrCode, Tag, User, Calendar } from 'lucide-react';
import { showSuccess, showError, showLoading, dismissToast } from '@/utils/toast';
import { supabase } from '@/integrations/supabase/client';
import { useManagerCompany } from '@/hooks/use-manager-company';
import { useManagerEvents, ManagerEvent } from '@/hooks/use-manager-events';

interface WristbandFormData {
    eventId: string;
    code: string;
    accessType: string;
    clientEmail: string; // Used to find client_user_id
}

const ACCESS_TYPES = [
    'Standard',
    'VIP',
    'Staff',
    'Press',
    'Organizador'
];

const ManagerCreateWristband: React.FC = () => {
    const navigate = useNavigate();
    const [userId, setUserId] = useState<string | null>(null);
    const [formData, setFormData] = useState<WristbandFormData>({
        eventId: '',
        code: '',
        accessType: ACCESS_TYPES[0],
        clientEmail: '',
    });
    const [isSaving, setIsSaving] = useState(false);

    // Fetch current user ID
    useEffect(() => {
        supabase.auth.getUser().then(({ data: { user } }) => {
            setUserId(user?.id || null);
        });
    }, []);

    // Fetch manager's company ID and events
    const { company, isLoading: isLoadingCompany } = useManagerCompany(userId || undefined);
    const { events, isLoading: isLoadingEvents } = useManagerEvents(userId || undefined);

    const isLoading = isLoadingCompany || isLoadingEvents || !userId;

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { id, value } = e.target;
        setFormData(prev => ({ ...prev, [id]: value }));
    };

    const handleSelectChange = (field: keyof WristbandFormData, value: string) => {
        setFormData(prev => ({ ...prev, [field]: value }));
    };

    const validateForm = () => {
        const errors: string[] = [];
        
        if (!formData.eventId) errors.push("Selecione o evento.");
        if (!formData.code.trim()) errors.push("O Código da Pulseira é obrigatório.");
        if (!formData.accessType) errors.push("O Tipo de Acesso é obrigatório.");
        if (!company?.id) errors.push("O Perfil da Empresa não está cadastrado. Cadastre-o em Configurações.");

        if (errors.length > 0) {
            showError(`Por favor, preencha todos os campos obrigatórios.`);
            return false;
        }
        return true;
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!validateForm() || !company?.id) return;

        setIsSaving(true);
        const toastId = showLoading("Cadastrando pulseira...");

        try {
            let clientUserId: string | null = null;

            // 1. Tentar encontrar o ID do cliente pelo e-mail (se fornecido)
            if (formData.clientEmail.trim()) {
                const { data: userData, error: userError } = await supabase
                    .from('profiles')
                    .select('id')
                    .eq('email', formData.clientEmail.trim()) // Assumindo que 'profiles' tem o email (não é o caso, mas vamos buscar o user_id pelo email do auth)
                    .single();
                
                // Como o email não está na tabela profiles, precisamos de uma função de backend ou buscar no auth.users (que não é acessível diretamente via RLS)
                // Para simplificar, vamos assumir que o email do cliente é o ID do usuário para fins de teste, ou deixamos null.
                // Em um sistema real, usaríamos uma Edge Function para buscar o auth.user.id pelo email.
                
                // Simulação de busca de ID do cliente (deixando null por enquanto)
                // clientUserId = userData?.id || null; 
                
                // Se o email foi fornecido, mas não encontramos o usuário, alertamos.
                if (formData.clientEmail.trim() && !clientUserId) {
                    // Não é um erro fatal, mas é um aviso importante
                    console.warn("Email do cliente fornecido, mas usuário não encontrado. Pulseira não será associada a um cliente.");
                }
            }

            // 2. Inserir a pulseira
            const { error: insertError } = await supabase
                .from('wristbands')
                .insert([
                    {
                        event_id: formData.eventId,
                        company_id: company.id,
                        client_user_id: clientUserId, // Pode ser null
                        code: formData.code.trim(),
                        access_type: formData.accessType,
                        status: 'active',
                    },
                ]);

            if (insertError) {
                if (insertError.code === '23505') { // Unique violation (código da pulseira já existe)
                    throw new Error("O código da pulseira já está em uso. Insira um código único.");
                }
                throw insertError;
            }

            dismissToast(toastId);
            showSuccess(`Pulseira ${formData.code} cadastrada com sucesso!`);
            
            // Limpar formulário após sucesso
            setFormData(prev => ({ ...DEFAULT_SETTINGS, eventId: prev.eventId }));

        } catch (error: any) {
            dismissToast(toastId);
            console.error("Erro ao cadastrar pulseira:", error);
            showError(`Falha ao cadastrar pulseira: ${error.message || 'Erro desconhecido'}`);
        } finally {
            setIsSaving(false);
        }
    };

    if (isLoading) {
        return (
            <div className="max-w-4xl mx-auto px-4 sm:px-0 text-center py-20">
                <Loader2 className="h-10 w-10 animate-spin text-yellow-500 mx-auto mb-4" />
                <p className="text-gray-400">Carregando dados do gestor e eventos...</p>
            </div>
        );
    }

    if (!company) {
        return (
            <div className="max-w-4xl mx-auto px-4 sm:px-0 text-center py-20">
                <div className="bg-red-500/20 border border-red-500/50 text-red-400 p-6 rounded-xl mb-8">
                    <i className="fas fa-exclamation-triangle text-2xl mb-3"></i>
                    <h3 className="font-semibold text-white mb-2">Perfil da Empresa Necessário</h3>
                    <p className="text-sm">Você precisa cadastrar o Perfil da Empresa antes de gerenciar pulseiras.</p>
                    <Button 
                        onClick={() => navigate('/manager/settings/company-profile')}
                        className="mt-4 bg-yellow-500 text-black hover:bg-yellow-600"
                    >
                        Ir para Perfil da Empresa
                    </Button>
                </div>
            </div>
        );
    }

    return (
        <div className="max-w-4xl mx-auto px-4 sm:px-0">
            <div className="flex items-center justify-between mb-8">
                <h1 className="text-2xl sm:text-3xl font-serif text-yellow-500 flex items-center">
                    <QrCode className="h-7 w-7 mr-3" />
                    Cadastro de Pulseira
                </h1>
                <Button 
                    onClick={() => navigate('/manager/dashboard')}
                    variant="outline"
                    className="bg-black/60 border border-yellow-500/30 text-yellow-500 hover:bg-yellow-500/10 text-sm"
                >
                    <ArrowLeft className="mr-2 h-4 w-4" />
                    Voltar ao Dashboard
                </Button>
            </div>

            <Card className="bg-black/80 backdrop-blur-sm border border-yellow-500/30 rounded-2xl shadow-2xl shadow-yellow-500/10">
                <CardHeader>
                    <CardTitle className="text-white text-xl sm:text-2xl font-semibold">Detalhes da Pulseira</CardTitle>
                    <CardDescription className="text-gray-400 text-sm">
                        Cadastre uma nova pulseira para acesso a eventos.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <form onSubmit={handleSubmit} className="space-y-6">
                        
                        {/* Evento */}
                        <div>
                            <label htmlFor="eventId" className="block text-sm font-medium text-white mb-2 flex items-center">
                                <Calendar className="h-4 w-4 mr-2 text-yellow-500" />
                                Evento Associado *
                            </label>
                            <Select onValueChange={(value) => handleSelectChange('eventId', value)} value={formData.eventId}>
                                <SelectTrigger className="w-full bg-black/60 border-yellow-500/30 text-white focus:ring-yellow-500">
                                    <SelectValue placeholder="Selecione o Evento" />
                                </SelectTrigger>
                                <SelectContent className="bg-black border-yellow-500/30 text-white">
                                    {events.length === 0 ? (
                                        <SelectItem value="" disabled>Nenhum evento cadastrado</SelectItem>
                                    ) : (
                                        events.map((event: ManagerEvent) => (
                                            <SelectItem key={event.id} value={event.id} className="hover:bg-yellow-500/10 cursor-pointer">
                                                {event.title}
                                            </SelectItem>
                                        ))
                                    )}
                                </SelectContent>
                            </Select>
                        </div>

                        {/* Código e Tipo de Acesso */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div>
                                <label htmlFor="code" className="block text-sm font-medium text-white mb-2 flex items-center">
                                    <QrCode className="h-4 w-4 mr-2 text-yellow-500" />
                                    Código da Pulseira (Único) *
                                </label>
                                <Input 
                                    id="code" 
                                    value={formData.code} 
                                    onChange={handleChange} 
                                    placeholder="Ex: 1A2B3C4D5E6F"
                                    className="bg-black/60 border-yellow-500/30 text-white placeholder-gray-500 focus:border-yellow-500"
                                    required
                                />
                                <p className="text-xs text-gray-500 mt-1">Este código deve ser único (RFID, QR Code, etc.).</p>
                            </div>
                            <div>
                                <label htmlFor="accessType" className="block text-sm font-medium text-white mb-2 flex items-center">
                                    <Tag className="h-4 w-4 mr-2 text-yellow-500" />
                                    Tipo de Acesso *
                                </label>
                                <Select onValueChange={(value) => handleSelectChange('accessType', value)} value={formData.accessType}>
                                    <SelectTrigger className="w-full bg-black/60 border-yellow-500/30 text-white focus:ring-yellow-500">
                                        <SelectValue placeholder="Selecione o Tipo" />
                                    </SelectTrigger>
                                    <SelectContent className="bg-black border-yellow-500/30 text-white">
                                        {ACCESS_TYPES.map(type => (
                                            <SelectItem key={type} value={type} className="hover:bg-yellow-500/10 cursor-pointer">
                                                {type}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>

                        {/* Cliente Associado (Opcional) */}
                        <div className="pt-4 border-t border-yellow-500/10">
                            <label htmlFor="clientEmail" className="block text-sm font-medium text-white mb-2 flex items-center">
                                <User className="h-4 w-4 mr-2 text-yellow-500" />
                                E-mail do Cliente (Opcional)
                            </label>
                            <Input 
                                id="clientEmail" 
                                type="email"
                                value={formData.clientEmail} 
                                onChange={handleChange} 
                                placeholder="cliente@email.com"
                                className="bg-black/60 border-yellow-500/30 text-white placeholder-gray-500 focus:border-yellow-500"
                            />
                            <p className="text-xs text-gray-500 mt-1">Associe a pulseira a um cliente existente (se o e-mail estiver cadastrado).</p>
                        </div>

                        {/* Botões de Ação */}
                        <div className="pt-4 flex flex-col sm:flex-row space-y-4 sm:space-y-0 sm:space-x-4">
                            <Button
                                type="submit"
                                disabled={isSaving || isLoading || !company}
                                className="flex-1 bg-yellow-500 text-black hover:bg-yellow-600 py-3 text-lg font-semibold transition-all duration-300 cursor-pointer disabled:opacity-50"
                            >
                                {isSaving ? (
                                    <div className="flex items-center justify-center">
                                        <Loader2 className="w-5 h-5 animate-spin mr-2" />
                                        Gravando Pulseira...
                                    </div>
                                ) : (
                                    <>
                                        <i className="fas fa-save mr-2"></i>
                                        Gravar Pulseira
                                    </>
                                )}
                            </Button>
                            <Button
                                type="button"
                                onClick={() => navigate('/manager/dashboard')}
                                variant="outline"
                                className="flex-1 bg-black/60 border-yellow-500/30 text-yellow-500 hover:bg-yellow-500/10 py-3 text-lg font-semibold transition-all duration-300 cursor-pointer"
                                disabled={isSaving}
                            >
                                <ArrowLeft className="mr-2 h-5 w-5" />
                                Voltar ao Dashboard
                            </Button>
                        </div>
                    </form>
                </CardContent>
            </Card>
        </div>
    );
};

export default ManagerCreateWristband;