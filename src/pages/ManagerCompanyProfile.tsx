import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Building2, ArrowLeft, Loader2, Save, MapPin, Phone, Mail } from 'lucide-react';
import { showSuccess, showError, showLoading, dismissToast } from '@/utils/toast';
import { supabase } from '@/integrations/supabase/client';
import { useManagerCompany, CompanyData } from '@/hooks/use-manager-company';
import { useProfile } from '@/hooks/use-profile';
import { useQueryClient } from '@tanstack/react-query';
import { isValueEmpty } from '@/hooks/use-profile-status'; // Reutilizando a função

// Função de validação de CNPJ (simplificada para o frontend)
const validateCNPJ = (cnpj: string) => {
    const cleanCNPJ = cnpj.replace(/\D/g, '');
    return cleanCNPJ.length === 14;
};

// Função de validação de CEP (apenas formato)
const validateCEP = (cep: string) => {
    const cleanCEP = cep.replace(/\D/g, '');
    return cleanCEP.length === 8;
};

const companyProfileSchema = z.object({
    cnpj: z.string().refine(validateCNPJ, { message: "CNPJ inválido (14 dígitos)." }),
    corporate_name: z.string().min(3, { message: "Razão Social é obrigatória." }),
    trade_name: z.string().optional().nullable(),
    phone: z.string().optional().nullable(),
    email: z.string().email({ message: "E-mail inválido." }).optional().nullable(),
    
    // Endereço
    cep: z.string().refine(validateCEP, { message: "CEP inválido (8 dígitos)." }),
    street: z.string().min(3, { message: "Rua é obrigatória." }),
    number: z.string().min(1, { message: "Número é obrigatório." }),
    neighborhood: z.string().min(3, { message: "Bairro é obrigatória." }),
    city: z.string().min(3, { message: "Cidade é obrigatória." }),
    state: z.string().length(2, { message: "Estado deve ter 2 letras." }),
    complement: z.string().optional().nullable(),
});

const ManagerCompanyProfile: React.FC = () => {
    const navigate = useNavigate();
    const queryClient = useQueryClient();
    const [userId, setUserId] = useState<string | undefined>(undefined);
    const [loadingSession, setLoadingSession] = useState(true);
    const [isEditing, setIsEditing] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [isCepLoading, setIsCepLoading] = useState(false);

    useEffect(() => {
        supabase.auth.getUser().then(({ data: { user } }) => {
            setUserId(user?.id);
            setLoadingSession(false);
        });
    }, []);

    const { profile, isLoading: isLoadingProfile } = useProfile(userId);
    const { company, isLoading: isLoadingCompany, refetch: refetchCompany } = useManagerCompany(userId, profile?.tipo_usuario_id);

    const isLoadingCombined = loadingSession || isLoadingProfile || isLoadingCompany;

    const form = useForm<z.infer<typeof companyProfileSchema>>({
        resolver: zodResolver(companyProfileSchema),
        defaultValues: {
            cnpj: '',
            corporate_name: '',
            trade_name: '',
            phone: '',
            email: '',
            cep: '',
            street: '',
            number: '',
            neighborhood: '',
            city: '',
            state: '',
            complement: '',
        },
        values: {
            cnpj: company?.cnpj ? formatCNPJ(company.cnpj) : '',
            corporate_name: company?.corporate_name || '',
            trade_name: company?.trade_name || '',
            phone: company?.phone || '',
            email: company?.email || '',
            cep: company?.cep ? formatCEP(company.cep) : '',
            street: company?.street || '',
            number: company?.number || '',
            neighborhood: company?.neighborhood || '',
            city: company?.city || '',
            state: company?.state || '',
            complement: company?.complement || '',
        },
    });

    useEffect(() => {
        if (company) {
            form.reset({
                cnpj: company.cnpj ? formatCNPJ(company.cnpj) : '',
                corporate_name: company.corporate_name || '',
                trade_name: company.trade_name || '',
                phone: company.phone || '',
                email: company.email || '',
                cep: company.cep ? formatCEP(company.cep) : '',
                street: company.street || '',
                number: company.number || '',
                neighborhood: company.neighborhood || '',
                city: company.city || '',
                state: company.state || '',
                complement: company.complement || '',
            });
        }
    }, [company, form]);

    // Ativa o modo de edição automaticamente se o perfil da empresa estiver incompleto
    useEffect(() => {
        if (!isLoadingCombined && profile && profile.tipo_usuario_id === 4) { // Apenas para Gestor Pessoa Jurídica
            if (!company) { // Se não há perfil de empresa, entra em modo de edição
                setIsEditing(true);
                showError("Por favor, complete o perfil da sua empresa para liberar todas as funcionalidades.");
            } else {
                // Verifica se algum campo essencial está vazio
                const isCompanyProfileIncomplete = ESSENTIAL_COMPANY_PROFILE_FIELDS.some(field => {
                    const value = company[field as keyof CompanyData];
                    return isValueEmpty(value);
                });

                if (isCompanyProfileIncomplete && !isEditing) {
                    setIsEditing(true);
                    showError("Seu perfil de empresa está incompleto. Por favor, preencha os dados essenciais.");
                } else if (!isCompanyProfileIncomplete && isEditing) {
                    setIsEditing(false); // Se completo, sai do modo de edição
                }
            }
        }
    }, [isLoadingCombined, profile, company, isEditing]);


    // Funções de formatação
    const formatCNPJ = (value: string) => {
        if (!value) return '';
        const cleanValue = value.replace(/\D/g, '');
        return cleanValue
            .replace(/^(\d{2})(\d)/, '$1.$2')
            .replace(/^(\d{2})\.(\d{3})(\d)/, '$1.$2.$3')
            .replace(/\.(\d{3})(\d)/, '.$1/$2')
            .replace(/(\d{4})(\d)/, '$1-$2')
            .replace(/(-\d{2})\d+?$/, '$1');
    };

    const formatCEP = (value: string) => {
        if (!value) return '';
        const cleanValue = value.replace(/\D/g, '');
        return cleanValue
            .replace(/(\d{5})(\d)/, '$1-$2')
            .replace(/(-\d{3})\d+?$/, '$1');
    };

    const handleCnpjChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const formattedCnpj = formatCNPJ(e.target.value);
        form.setValue('cnpj', formattedCnpj, { shouldValidate: true });
    };

    const handleCepChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const rawValue = e.target.value;
        const formattedCep = formatCEP(rawValue);
        form.setValue('cep', formattedCep, { shouldValidate: true });

        if (formattedCep.replace(/\D/g, '').length === 8) {
            fetchAddressByCep(formattedCep);
        }
    };

    // Função para buscar endereço via ViaCEP
    const fetchAddressByCep = async (cep: string) => {
        const cleanCep = cep.replace(/\D/g, '');
        if (cleanCep.length !== 8) return;

        setIsCepLoading(true);
        try {
            const response = await fetch(`https://viacep.com.br/ws/${cleanCep}/json/`);
            const data = await response.json();

            if (data.erro) {
                showError("CEP não encontrado.");
                form.setError('cep', { message: "CEP não encontrado." });
                form.setValue('street', '');
                form.setValue('neighborhood', '');
                form.setValue('city', '');
                form.setValue('state', '');
            } else {
                form.clearErrors('cep');
                form.setValue('street', data.logradouro || '');
                form.setValue('neighborhood', data.bairro || '');
                form.setValue('city', data.localidade || '');
                form.setValue('state', data.uf || '');
                document.getElementById('number')?.focus();
            }
        } catch (error) {
            console.error("Erro ao buscar CEP:", error);
            showError("Erro na comunicação com o serviço de CEP.");
        } finally {
            setIsCepLoading(false);
        }
    };

    const onSubmit = async (values: z.infer<typeof companyProfileSchema>) => {
        if (!userId) return;
        setIsSaving(true);
        const toastId = showLoading("Salvando perfil da empresa...");

        const cleanCNPJ = values.cnpj.replace(/\D/g, '');
        const cleanCEP = values.cep.replace(/\D/g, '');

        try {
            const { error } = await supabase
                .from('companies')
                .upsert(
                    {
                        id: company?.id, // Se já existe, atualiza
                        user_id: userId,
                        cnpj: cleanCNPJ,
                        corporate_name: values.corporate_name,
                        trade_name: values.trade_name || null,
                        phone: values.phone || null,
                        email: values.email || null,
                        cep: cleanCEP,
                        street: values.street,
                        number: values.number,
                        neighborhood: values.neighborhood,
                        city: values.city,
                        state: values.state,
                        complement: values.complement || null,
                    },
                    { onConflict: 'user_id' } // Conflito no user_id para garantir 1 empresa por gestor
                );

            if (error) {
                throw error;
            }

            dismissToast(toastId);
            showSuccess("Perfil da empresa atualizado com sucesso!");
            queryClient.invalidateQueries({ queryKey: ['managerCompany', userId, profile?.tipo_usuario_id] });
            queryClient.invalidateQueries({ queryKey: ['profile', userId] }); // Invalida o perfil para reavaliar o status de completude
            setIsEditing(false);
            refetchCompany(); // Rebusca os dados da empresa
        } catch (e: any) {
            dismissToast(toastId);
            console.error("Erro ao salvar perfil da empresa:", e);
            showError(`Falha ao salvar perfil: ${e.message || 'Erro desconhecido'}`);
        } finally {
            setIsSaving(false);
        }
    };

    const onInvalid = (errors: any) => {
        console.error("Form Validation Errors:", errors);
        showError("Por favor, corrija os erros no formulário antes de salvar.");
        setIsSaving(false);
    };

    const handleCancelEdit = () => {
        form.reset(); // Reseta para os valores originais do `company`
        setIsEditing(false);
    };

    if (isLoadingCombined) {
        return (
            <div className="max-w-4xl mx-auto px-4 sm:px-0 text-center py-20">
                <Loader2 className="h-10 w-10 animate-spin text-yellow-500 mx-auto mb-4" />
                <p className="text-gray-400">Carregando perfil da empresa...</p>
            </div>
        );
    }

    // Se o usuário não for um Gestor Pessoa Jurídica, redireciona ou mostra erro
    if (profile?.tipo_usuario_id !== MANAGER_LEGAL_ENTITY_USER_TYPE_ID) {
        showError("Acesso negado. Esta página é apenas para Gestores Pessoa Jurídica.");
        navigate('/manager/dashboard', { replace: true });
        return null;
    }

    return (
        <div className="max-w-4xl mx-auto px-4 sm:px-0">
            <div className="flex items-center justify-between mb-8">
                <h1 className="text-2xl sm:text-3xl font-serif text-yellow-500 mb-4 sm:mb-0 flex items-center">
                    <Building2 className="h-7 w-7 mr-3" />
                    Perfil da Empresa
                </h1>
                <Button 
                    onClick={() => navigate('/manager/settings')}
                    variant="outline"
                    className="bg-black/60 border border-yellow-500/30 text-yellow-500 hover:bg-yellow-500/10 text-sm"
                >
                    <ArrowLeft className="mr-2 h-4 w-4" />
                    Voltar para Configurações
                </Button>
            </div>

            <Card className="bg-black/80 backdrop-blur-sm border border-yellow-500/30 rounded-2xl shadow-2xl shadow-yellow-500/10">
                <CardHeader>
                    <CardTitle className="text-white text-xl sm:text-2xl font-semibold">Dados Cadastrais</CardTitle>
                    <CardDescription className="text-gray-400 text-sm">
                        Informações essenciais da sua empresa para gestão de eventos.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <Form {...form}>
                        <form onSubmit={form.handleSubmit(onSubmit, onInvalid)} className="space-y-6">
                            {/* CNPJ e Razão Social */}
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                                <FormField
                                    control={form.control}
                                    name="cnpj"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel className="text-white">CNPJ *</FormLabel>
                                            <FormControl>
                                                <Input 
                                                    placeholder="00.000.000/0000-00" 
                                                    {...field} 
                                                    onChange={handleCnpjChange}
                                                    disabled={!isEditing} 
                                                    isInvalid={!!form.formState.errors.cnpj || (isEditing && isValueEmpty(company?.cnpj))}
                                                    className="bg-black/60 border-yellow-500/30 text-white placeholder-gray-500 focus:border-yellow-500 disabled:text-gray-400 disabled:cursor-not-allowed" 
                                                    maxLength={18}
                                                />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                                <FormField
                                    control={form.control}
                                    name="corporate_name"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel className="text-white">Razão Social *</FormLabel>
                                            <FormControl>
                                                <Input 
                                                    placeholder="Nome Completo da Empresa S.A." 
                                                    {...field} 
                                                    disabled={!isEditing} 
                                                    isInvalid={!!form.formState.errors.corporate_name || (isEditing && isValueEmpty(company?.corporate_name))}
                                                    className="bg-black/60 border-yellow-500/30 text-white placeholder-gray-500 focus:border-yellow-500 disabled:text-gray-400 disabled:cursor-not-allowed" 
                                                />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                            </div>

                            {/* Nome Fantasia e Telefone */}
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                                <FormField
                                    control={form.control}
                                    name="trade_name"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel className="text-white">Nome Fantasia (Opcional)</FormLabel>
                                            <FormControl>
                                                <Input 
                                                    placeholder="Nome de Divulgação da Empresa" 
                                                    {...field} 
                                                    disabled={!isEditing} 
                                                    isInvalid={!!form.formState.errors.trade_name}
                                                    className="bg-black/60 border-yellow-500/30 text-white placeholder-gray-500 focus:border-yellow-500 disabled:text-gray-400 disabled:cursor-not-allowed" 
                                                />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                                <FormField
                                    control={form.control}
                                    name="phone"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel className="text-white flex items-center">
                                                <Phone className="h-4 w-4 mr-2 text-yellow-500" />
                                                Telefone (Opcional)
                                            </FormLabel>
                                            <FormControl>
                                                <Input 
                                                    placeholder="(XX) XXXXX-XXXX" 
                                                    {...field} 
                                                    disabled={!isEditing} 
                                                    isInvalid={!!form.formState.errors.phone}
                                                    className="bg-black/60 border-yellow-500/30 text-white placeholder-gray-500 focus:border-yellow-500 disabled:text-gray-400 disabled:cursor-not-allowed" 
                                                />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                            </div>

                            {/* Email da Empresa */}
                            <FormField
                                control={form.control}
                                name="email"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel className="text-white flex items-center">
                                            <Mail className="h-4 w-4 mr-2 text-yellow-500" />
                                            E-mail da Empresa (Opcional)
                                        </FormLabel>
                                        <FormControl>
                                            <Input 
                                                placeholder="contato@empresa.com" 
                                                {...field} 
                                                disabled={!isEditing} 
                                                isInvalid={!!form.formState.errors.email}
                                                className="bg-black/60 border-yellow-500/30 text-white placeholder-gray-500 focus:border-yellow-500 disabled:text-gray-400 disabled:cursor-not-allowed" 
                                            />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />

                            {/* --- Seção de Endereço --- */}
                            <div className="pt-4 border-t border-yellow-500/20">
                                <h3 className="text-xl font-semibold text-white mb-4">Endereço da Empresa *</h3>
                                <FormField
                                    control={form.control}
                                    name="cep"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel className="text-white">CEP *</FormLabel>
                                            <FormControl>
                                                <div className="relative">
                                                    <Input 
                                                        placeholder="00000-000"
                                                        {...field} 
                                                        onChange={handleCepChange}
                                                        disabled={!isEditing || isCepLoading} 
                                                        isInvalid={!!form.formState.errors.cep || (isEditing && isValueEmpty(company?.cep))}
                                                        className="bg-black/60 border-yellow-500/30 text-white placeholder-gray-500 focus:border-yellow-500 disabled:text-gray-400 disabled:cursor-not-allowed pr-10" 
                                                        maxLength={9}
                                                    />
                                                    {isCepLoading && (
                                                        <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                                                            <div className="w-4 h-4 border-2 border-yellow-500/20 border-t-yellow-500 rounded-full animate-spin"></div>
                                                        </div>
                                                    )}
                                                </div>
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
                                <div className="sm:col-span-2">
                                    <FormField
                                        control={form.control}
                                        name="street"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel className="text-white">Rua *</FormLabel>
                                                <FormControl>
                                                    <Input 
                                                        id="street" 
                                                        placeholder="Ex: Av. Paulista" 
                                                        {...field} 
                                                        disabled={!isEditing || isCepLoading} 
                                                        isInvalid={!!form.formState.errors.street || (isEditing && isValueEmpty(company?.street))}
                                                        className="bg-black/60 border-yellow-500/30 text-white placeholder-gray-500 focus:border-yellow-500 disabled:text-gray-400 disabled:cursor-not-allowed" 
                                                    />
                                                </FormControl>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />
                                </div>
                                <FormField
                                    control={form.control}
                                    name="number"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel className="text-white">Número *</FormLabel>
                                            <FormControl>
                                                <Input 
                                                    id="number" 
                                                    placeholder="123" 
                                                    {...field} 
                                                    disabled={!isEditing || isCepLoading} 
                                                    isInvalid={!!form.formState.errors.number || (isEditing && isValueEmpty(company?.number))}
                                                    className="bg-black/60 border-yellow-500/30 text-white placeholder-gray-500 focus:border-yellow-500 disabled:text-gray-400 disabled:cursor-not-allowed" 
                                                />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                            </div>

                            <FormField
                                control={form.control}
                                name="complement"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel className="text-white">Complemento (Opcional)</FormLabel>
                                        <FormControl>
                                            <Input 
                                                placeholder="Sala 10, Andar 5" 
                                                {...field} 
                                                disabled={!isEditing || isCepLoading} 
                                                isInvalid={!!form.formState.errors.complement}
                                                className="bg-black/60 border-yellow-500/30 text-white placeholder-gray-500 focus:border-yellow-500 disabled:text-gray-400 disabled:cursor-not-allowed" 
                                            />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />

                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
                                <div className="sm:col-span-1">
                                    <FormField
                                        control={form.control}
                                        name="neighborhood"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel className="text-white">Bairro *</FormLabel>
                                                <FormControl>
                                                    <Input 
                                                        placeholder="Centro" 
                                                        {...field} 
                                                        disabled={!isEditing || isCepLoading} 
                                                        isInvalid={!!form.formState.errors.neighborhood || (isEditing && isValueEmpty(company?.neighborhood))}
                                                        className="bg-black/60 border-yellow-500/30 text-white placeholder-gray-500 focus:border-yellow-500 disabled:text-gray-400 disabled:cursor-not-allowed" 
                                                    />
                                                </FormControl>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />
                                </div>
                                <FormField
                                    control={form.control}
                                    name="city"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel className="text-white">Cidade *</FormLabel>
                                            <FormControl>
                                                <Input 
                                                    placeholder="São Paulo" 
                                                    {...field} 
                                                    disabled={!isEditing || isCepLoading} 
                                                    isInvalid={!!form.formState.errors.city || (isEditing && isValueEmpty(company?.city))}
                                                    className="bg-black/60 border-yellow-500/30 text-white placeholder-gray-500 focus:border-yellow-500 disabled:text-gray-400 disabled:cursor-not-allowed" 
                                                />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                                <FormField
                                    control={form.control}
                                    name="state"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel className="text-white">Estado (UF) *</FormLabel>
                                            <FormControl>
                                                <Input 
                                                    placeholder="SP" 
                                                    {...field} 
                                                    disabled={!isEditing || isCepLoading} 
                                                    isInvalid={!!form.formState.errors.state || (isEditing && isValueEmpty(company?.state))}
                                                    className="bg-black/60 border-yellow-500/30 text-white placeholder-gray-500 focus:border-yellow-500 disabled:text-gray-400 disabled:cursor-not-allowed" 
                                                    maxLength={2}
                                                />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                            </div>
                            
                            {isEditing ? (
                                <div className="flex items-center space-x-4 pt-4">
                                    <Button type="submit" disabled={isSaving} className="bg-yellow-500 text-black hover:bg-yellow-600 transition-all duration-300 cursor-pointer">
                                        {isSaving ? (
                                            <div className="flex items-center justify-center">
                                                <Loader2 className="w-5 h-5 animate-spin mr-2" />
                                                Salvando...
                                            </div>
                                        ) : 'Salvar Alterações'}
                                    </Button>
                                    <Button type="button" variant="outline" onClick={handleCancelEdit} className="bg-black/60 border-yellow-500/30 text-yellow-500 hover:bg-yellow-500/10">
                                        Cancelar
                                    </Button>
                                </div>
                            ) : (
                                <Button type="button" onClick={() => setIsEditing(true)} className="bg-yellow-500 text-black hover:bg-yellow-600 transition-all duration-300 cursor-pointer">
                                    Editar Perfil da Empresa
                                </Button>
                            )}
                        </form>
                    </Form>
                </CardContent>
            </Card>
        </div>
    );
};

export default ManagerCompanyProfile;