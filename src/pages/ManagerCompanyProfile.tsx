import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { ArrowLeft, Loader2, Building2, Mail, Phone, MapPin } from 'lucide-react';
import { showSuccess, showError, showLoading, dismissToast } from '@/utils/toast';
import { supabase } from '@/integrations/supabase/client';
import { useProfile } from '@/hooks/use-profile';
import { useManagerCompany, CompanyData } from '@/hooks/use-manager-company';

// --- Schemas e Validações ---

const validateCNPJ = (cnpj: string) => {
    const cleanCNPJ = cnpj.replace(/\D/g, '');
    return cleanCNPJ.length === 14;
};

const validateCEP = (cep: string) => {
    const cleanCEP = cep.replace(/\D/g, '');
    return cleanCEP.length === 8;
};

const companySchema = z.object({
    cnpj: z.string().refine(validateCNPJ, { message: "CNPJ inválido (14 dígitos)." }),
    corporate_name: z.string().min(3, { message: "Razão Social é obrigatória." }),
    trade_name: z.string().optional().nullable(),
    email: z.string().email({ message: "E-mail inválido." }),
    phone: z.string().optional().nullable(),
    
    // Endereço
    cep: z.string().optional().nullable().refine((val) => !val || validateCEP(val), { message: "CEP inválido (8 dígitos)." }),
    street: z.string().optional().nullable(),
    number: z.string().optional().nullable(),
    neighborhood: z.string().optional().nullable(),
    city: z.string().optional().nullable(),
    state: z.string().optional().nullable(),
    complement: z.string().optional().nullable(),
});

// --- Componente Principal ---

const ManagerCompanyProfile: React.FC = () => {
    const navigate = useNavigate();
    const [userId, setUserId] = useState<string | undefined>(undefined);
    const [isCepLoading, setIsCepLoading] = useState(false);

    useEffect(() => {
        supabase.auth.getUser().then(({ data: { user } }) => {
            setUserId(user?.id);
        });
    }, []);

    const { profile, isLoading: isLoadingProfile } = useProfile(userId);
    const { company, isLoading: isLoadingCompany, refetch } = useManagerCompany(userId, profile?.tipo_usuario_id);

    const isLoadingCombined = isLoadingProfile || isLoadingCompany || !userId;

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
    
    const formatPhone = (value: string) => {
        if (!value) return '';
        const cleanValue = value.replace(/\D/g, '');
        if (cleanValue.length <= 10) {
            return cleanValue.replace(/^(\d{2})(\d{4})(\d{4})$/, '($1) $2-$3');
        }
        return cleanValue.replace(/^(\d{2})(\d{5})(\d{4})$/, '($1) $2-$3');
    };

    const form = useForm<z.infer<typeof companySchema>>({
        resolver: zodResolver(companySchema),
        defaultValues: {
            cnpj: '',
            corporate_name: '',
            trade_name: '',
            email: profile?.email || '', // Usa o email do auth como padrão
            phone: '',
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
            email: company?.email || profile?.email || '',
            phone: company?.phone ? formatPhone(company.phone) : '',
            cep: company?.cep ? formatCEP(company.cep) : '',
            street: company?.street || '',
            number: company?.number || '',
            neighborhood: company?.neighborhood || '',
            city: company?.city || '',
            state: company?.state || '',
            complement: company?.complement || '',
        }
    });
    
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
                // Limpa campos de endereço se o CEP for inválido
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
                // Foca no campo número após o preenchimento automático
                document.getElementById('number')?.focus();
            }
        } catch (error) {
            console.error("Erro ao buscar CEP:", error);
            showError("Erro na comunicação com o serviço de CEP.");
        } finally {
            setIsCepLoading(false);
        }
    };

    const handleCepChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const rawValue = e.target.value;
        const formattedCep = formatCEP(rawValue);
        form.setValue('cep', formattedCep, { shouldValidate: true });

        if (formattedCep.replace(/\D/g, '').length === 8) {
            fetchAddressByCep(formattedCep);
        }
    };
    
    const handleCnpjChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const formattedCnpj = formatCNPJ(e.target.value);
        form.setValue('cnpj', formattedCnpj, { shouldValidate: true });
    };
    
    const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const formattedPhone = formatPhone(e.target.value);
        form.setValue('phone', formattedPhone, { shouldValidate: true });
    };

    const onSubmit = async (values: z.infer<typeof companySchema>) => {
        if (!userId) return;
        const toastId = showLoading(company ? "Atualizando perfil da empresa..." : "Cadastrando perfil da empresa...");

        // Limpeza e conversão para salvar no DB
        const cleanCNPJ = values.cnpj.replace(/\D/g, '');
        const cleanPhone = values.phone ? values.phone.replace(/\D/g, '') : null;
        const cleanCEP = values.cep ? values.cep.replace(/\D/g, '') : null;
        
        const payload = {
            user_id: userId,
            cnpj: cleanCNPJ,
            corporate_name: values.corporate_name,
            trade_name: values.trade_name || null,
            email: values.email,
            phone: cleanPhone,
            cep: cleanCEP,
            street: values.street || null,
            number: values.number || null,
            neighborhood: values.neighborhood || null,
            city: values.city || null,
            state: values.state || null,
            complement: values.complement || null,
            updated_at: new Date().toISOString(),
        };

        try {
            // Usamos upsert para garantir que, se o registro existir, ele seja atualizado
            const { error } = await supabase
                .from('companies')
                .upsert(payload, { onConflict: 'user_id' });

            if (error) {
                throw error;
            }

            dismissToast(toastId);
            showSuccess("Perfil da empresa salvo com sucesso!");
            refetch(); // Força a atualização dos dados
            navigate('/manager/events/create'); // Redireciona para a próxima etapa

        } catch (e: any) {
            dismissToast(toastId);
            console.error("Supabase Save Error:", e);
            showError(`Falha ao salvar perfil: ${e.message || 'Erro desconhecido'}`);
        }
    };

    if (isLoadingCombined) {
        return (
            <div className="max-w-4xl mx-auto px-4 sm:px-0 text-center py-20">
                <Loader2 className="h-10 w-10 animate-spin text-yellow-500 mx-auto mb-4" />
                <p className="text-gray-400">Carregando dados da empresa...</p>
            </div>
        );
    }
    
    // Se o usuário não for um gestor (tipo 1 ou 2), redireciona
    if (profile?.tipo_usuario_id !== 1 && profile?.tipo_usuario_id !== 2) {
        showError("Acesso negado. Você não é um gestor.");
        navigate('/manager/login', { replace: true });
        return null;
    }

    return (
        <div className="max-w-4xl mx-auto px-4 sm:px-0">
            <div className="flex items-center justify-between mb-8">
                <h1 className="text-2xl sm:text-3xl font-serif text-yellow-500 flex items-center">
                    <Building2 className="h-7 w-7 mr-3" />
                    Perfil da Empresa (PJ)
                </h1>
                <Button 
                    onClick={() => navigate('/manager/settings')}
                    variant="outline"
                    className="bg-black/60 border border-yellow-500/30 text-yellow-500 hover:bg-yellow-500/10 text-sm"
                >
                    <ArrowLeft className="mr-2 h-4 w-4" />
                    Voltar
                </Button>
            </div>

            <Card className="bg-black/80 backdrop-blur-sm border border-yellow-500/30 rounded-2xl shadow-2xl shadow-yellow-500/10">
                <CardHeader>
                    <CardTitle className="text-white text-xl sm:text-2xl font-semibold">{company ? 'Editar' : 'Cadastrar'} Dados Corporativos</CardTitle>
                    <CardDescription className="text-gray-400 text-sm">
                        Estas informações serão usadas para emissão de notas e contato oficial.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <Form {...form}>
                        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                            
                            {/* CNPJ e Razão Social */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
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
                                                    className="bg-black/60 border-yellow-500/30 text-white placeholder-gray-500 focus:border-yellow-500" 
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
                                                    placeholder="Nome da Empresa S.A." 
                                                    {...field} 
                                                    className="bg-black/60 border-yellow-500/30 text-white placeholder-gray-500 focus:border-yellow-500" 
                                                />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                            </div>
                            
                            {/* Nome Fantasia */}
                            <FormField
                                control={form.control}
                                name="trade_name"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel className="text-white">Nome Fantasia (Opcional)</FormLabel>
                                        <FormControl>
                                            <Input 
                                                placeholder="Nome Comercial" 
                                                {...field} 
                                                className="bg-black/60 border-yellow-500/30 text-white placeholder-gray-500 focus:border-yellow-500" 
                                            />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />

                            {/* Contato */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4 border-t border-yellow-500/20">
                                <FormField
                                    control={form.control}
                                    name="email"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel className="text-white flex items-center"><Mail className="h-4 w-4 mr-2 text-yellow-500" /> E-mail de Contato *</FormLabel>
                                            <FormControl>
                                                <Input 
                                                    placeholder="contato@empresa.com" 
                                                    {...field} 
                                                    className="bg-black/60 border-yellow-500/30 text-white placeholder-gray-500 focus:border-yellow-500" 
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
                                            <FormLabel className="text-white flex items-center"><Phone className="h-4 w-4 mr-2 text-yellow-500" /> Telefone (Opcional)</FormLabel>
                                            <FormControl>
                                                <Input 
                                                    placeholder="(00) 00000-0000" 
                                                    {...field} 
                                                    onChange={handlePhoneChange}
                                                    className="bg-black/60 border-yellow-500/30 text-white placeholder-gray-500 focus:border-yellow-500" 
                                                    maxLength={15}
                                                />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                            </div>
                            
                            {/* Endereço */}
                            <div className="pt-4 border-t border-yellow-500/20">
                                <h3 className="text-xl font-semibold text-white mb-4 flex items-center">
                                    <MapPin className="h-5 w-5 mr-2 text-yellow-500" />
                                    Endereço
                                </h3>
                                <FormField
                                    control={form.control}
                                    name="cep"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel className="text-white">CEP (Opcional)</FormLabel>
                                            <FormControl>
                                                <div className="relative">
                                                    <Input 
                                                        placeholder="00000-000"
                                                        {...field} 
                                                        onChange={handleCepChange}
                                                        disabled={isCepLoading} 
                                                        className="bg-black/60 border-yellow-500/30 text-white placeholder-gray-500 focus:border-yellow-500 pr-10" 
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
                                                <FormLabel className="text-white">Rua (Opcional)</FormLabel>
                                                <FormControl>
                                                    <Input 
                                                        id="street" 
                                                        placeholder="Ex: Av. Paulista" 
                                                        {...field} 
                                                        disabled={isCepLoading} 
                                                        className="bg-black/60 border-yellow-500/30 text-white placeholder-gray-500 focus:border-yellow-500" 
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
                                            <FormLabel className="text-white">Número (Opcional)</FormLabel>
                                            <FormControl>
                                                <Input 
                                                    id="number" 
                                                    placeholder="123" 
                                                    {...field} 
                                                    disabled={isCepLoading} 
                                                    className="bg-black/60 border-yellow-500/30 text-white placeholder-gray-500 focus:border-yellow-500" 
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
                                                placeholder="Sala 505" 
                                                {...field} 
                                                className="bg-black/60 border-yellow-500/30 text-white placeholder-gray-500 focus:border-yellow-500" 
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
                                                <FormLabel className="text-white">Bairro (Opcional)</FormLabel>
                                                <FormControl>
                                                    <Input 
                                                        placeholder="Jardim Paulista" 
                                                        {...field} 
                                                        disabled={isCepLoading} 
                                                        className="bg-black/60 border-yellow-500/30 text-white placeholder-gray-500 focus:border-yellow-500" 
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
                                            <FormLabel className="text-white">Cidade (Opcional)</FormLabel>
                                            <FormControl>
                                                <Input 
                                                    placeholder="São Paulo" 
                                                    {...field} 
                                                    disabled={isCepLoading} 
                                                    className="bg-black/60 border-yellow-500/30 text-white placeholder-gray-500 focus:border-yellow-500" 
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
                                            <FormLabel className="text-white">Estado (Opcional)</FormLabel>
                                            <FormControl>
                                                <Input 
                                                    placeholder="SP" 
                                                    {...field} 
                                                    disabled={isCepLoading} 
                                                    className="bg-black/60 border-yellow-500/30 text-white placeholder-gray-500 focus:border-yellow-500" 
                                                />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                            </div>

                            <Button
                                type="submit"
                                disabled={form.formState.isSubmitting}
                                className="w-full bg-yellow-500 text-black hover:bg-yellow-600 py-3 text-lg font-semibold transition-all duration-300 cursor-pointer disabled:opacity-50"
                            >
                                {form.formState.isSubmitting ? (
                                    <div className="flex items-center justify-center">
                                        <Loader2 className="w-5 h-5 animate-spin mr-2" />
                                        Salvando...
                                    </div>
                                ) : (
                                    <>
                                        <i className="fas fa-save mr-2"></i>
                                        Salvar e Continuar
                                    </>
                                )}
                            </Button>
                        </form>
                    </Form>
                </CardContent>
            </Card>
        </div>
    );
};

export default ManagerCompanyProfile;