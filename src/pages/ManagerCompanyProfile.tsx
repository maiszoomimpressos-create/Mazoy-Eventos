import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useForm, FormProvider } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Form } from '@/components/ui/form';
import { showSuccess, showError, showLoading, dismissToast } from '@/utils/toast';
import { Loader2, Building, ArrowLeft } from 'lucide-react';
import CompanyForm, { companySchema, CompanyFormData } from '@/components/CompanyForm'; // Importando o novo componente e schema

const ManagerCompanyProfile: React.FC = () => {
    const navigate = useNavigate();
    const [userId, setUserId] = useState<string | null>(null);
    const [isFetching, setIsFetching] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [companyId, setCompanyId] = useState<string | null>(null);
    const [isCepLoading, setIsCepLoading] = useState(false);

    const form = useForm<CompanyFormData>({
        resolver: zodResolver(companySchema),
        defaultValues: {
            cnpj: '',
            corporate_name: '',
            trade_name: '',
            phone: '',
            email: '',
            cep: '',
            street: '',
            neighborhood: '',
            city: '',
            state: '',
            number: '',
            complement: '',
        },
    });

    // Fetch Data
    useEffect(() => {
        const fetchProfile = async () => {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) {
                showError("Sessão expirada. Faça login novamente.");
                navigate('/manager/login');
                return;
            }
            setUserId(user.id);

            // Modificado para buscar o primeiro registro de empresa, se houver múltiplos
            const { data: companiesData, error } = await supabase
                .from('companies')
                .select('*')
                .eq('user_id', user.id)
                .limit(1); // Busca apenas um registro

            if (error) {
                console.error("Error fetching company profile:", error);
                showError("Erro ao carregar perfil da empresa.");
            }

            const data = companiesData?.[0]; // Pega o primeiro item do array
            if (data) {
                setCompanyId(data.id);
                form.reset({
                    cnpj: data.cnpj ? data.cnpj.replace(/^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/, '$1.$2.$3/$4-$5') : '', // Formata CNPJ para exibição
                    corporate_name: data.corporate_name || '',
                    trade_name: data.trade_name || '',
                    phone: data.phone ? data.phone.replace(/^(\d{2})(\d{5})(\d{4})$/, '($1) $2-$3') : '', // Formata telefone para exibição
                    email: data.email || '',
                    cep: data.cep ? data.cep.replace(/^(\d{5})(\d{3})$/, '$1-$2') : '', // Formata CEP para exibição
                    street: data.street || '',
                    neighborhood: data.neighborhood || '',
                    city: data.city || '',
                    state: data.state || '',
                    number: data.number || '',
                    complement: data.complement || '',
                });
            }
            setIsFetching(false);
        };
        fetchProfile();
    }, [navigate, form]);

    // Function to fetch address via ViaCEP
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

    const onSubmit = async (values: CompanyFormData) => {
        if (!userId) return;
        setIsSaving(true);
        const toastId = showLoading(companyId ? "Atualizando perfil..." : "Cadastrando perfil...");

        const dataToSave = {
            user_id: userId,
            cnpj: values.cnpj.replace(/\D/g, ''),
            corporate_name: values.corporate_name,
            trade_name: values.trade_name || null,
            phone: values.phone ? values.phone.replace(/\D/g, '') : null,
            email: values.email || null,
            
            cep: values.cep ? values.cep.replace(/\D/g, '') : null,
            street: values.street || null,
            number: values.number || null,
            neighborhood: values.neighborhood || null,
            city: values.city || null,
            state: values.state || null,
            complement: values.complement || null,
        };

        try {
            let error;
            if (companyId) {
                // Update existing profile
                const result = await supabase
                    .from('companies')
                    .update(dataToSave)
                    .eq('id', companyId);
                error = result.error;
            } else {
                // Insert new profile
                const result = await supabase
                    .from('companies')
                    .insert([dataToSave])
                    .select('id')
                    .single();
                error = result.error;
                if (result.data) {
                    setCompanyId(result.data.id);
                }
            }

            if (error) {
                if (error.code === '23505' && error.message.includes('cnpj')) {
                    throw new Error("Este CNPJ já está cadastrado em outra conta.");
                }
                throw error;
            }

            dismissToast(toastId);
            showSuccess("Perfil da Empresa salvo com sucesso!");
            navigate('/manager/settings');

        } catch (e: any) {
            dismissToast(toastId);
            console.error("Supabase Save Error:", e);
            showError(`Falha ao salvar perfil: ${e.message || 'Erro desconhecido'}`);
        } finally {
            setIsSaving(false);
        }
    };

    if (isFetching) {
        return (
            <div className="max-w-4xl mx-auto px-4 sm:px-0 text-center py-20">
                <Loader2 className="h-10 w-10 animate-spin text-yellow-500 mx-auto mb-4" />
                <p className="text-gray-400">Carregando perfil da empresa...</p>
            </div>
        );
    }

    return (
        <div className="max-w-4xl mx-auto px-4 sm:px-0">
            <div className="flex items-center justify-between mb-8">
                <h1 className="text-2xl sm:text-3xl font-serif text-yellow-500 flex items-center">
                    <Building className="h-7 w-7 mr-3" />
                    Perfil da Empresa
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
                    <CardTitle className="text-white text-xl sm:text-2xl font-semibold">
                        {companyId ? "Editar Dados Corporativos" : "Cadastrar Dados Corporativos"}
                    </CardTitle>
                    <CardDescription className="text-gray-400 text-sm">
                        Estes dados são essenciais para a emissão de notas fiscais e validação de eventos.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <FormProvider {...form}> {/* Usando FormProvider */}
                        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                            <CompanyForm 
                                isSaving={isSaving} 
                                isCepLoading={isCepLoading} 
                                fetchAddressByCep={fetchAddressByCep} 
                            />

                            <div className="pt-4 flex flex-col sm:flex-row space-y-4 sm:space-y-0 sm:space-x-4">
                                <Button
                                    type="submit"
                                    disabled={isSaving}
                                    className="flex-1 bg-yellow-500 text-black hover:bg-yellow-600 py-3 text-lg font-semibold transition-all duration-300 cursor-pointer disabled:opacity-50"
                                >
                                    {isSaving ? (
                                        <div className="flex items-center justify-center">
                                            <Loader2 className="w-5 h-5 animate-spin mr-2" />
                                            Salvando...
                                        </div>
                                    ) : (
                                        <>
                                            <i className="fas fa-save mr-2"></i>
                                            Salvar Perfil da Empresa
                                        </>
                                    )}
                                </Button>
                                <Button
                                    type="button"
                                    onClick={() => navigate('/manager/settings')}
                                    variant="outline"
                                    className="flex-1 bg-black/60 border-yellow-500/30 text-yellow-500 hover:bg-yellow-500/10 py-3 text-lg font-semibold transition-all duration-300 cursor-pointer"
                                    disabled={isSaving}
                                >
                                    <ArrowLeft className="mr-2 h-5 w-5" />
                                    Voltar para Configurações
                                </Button>
                            </div>
                        </form>
                    </FormProvider>
                </CardContent>
            </Card>
        </div>
    );
};

export default ManagerCompanyProfile;