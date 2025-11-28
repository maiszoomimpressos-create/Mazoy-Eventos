"use client";

import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { showSuccess, showError, showLoading, dismissToast } from '@/utils/toast';
import { Loader2, User, Save, ArrowLeft, Building } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { ProfileData } from '@/hooks/use-profile';
import { useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom'; // Importando useNavigate

interface ManagerProfileEditDialogProps {
    isOpen: boolean;
    onClose: () => void;
    profile: ProfileData | null | undefined;
    userId: string | undefined;
}

const GENDER_OPTIONS = [
    "Masculino",
    "Feminino",
    "Não binário",
    "Outro",
    "Prefiro não dizer"
];

// Funções de formatação e validação (reutilizadas do Profile.tsx)
const formatCPF = (value: string) => {
    if (!value) return '';
    const cleanValue = value.replace(/\D/g, '');
    return cleanValue
        .replace(/(\d{3})(\d)/, '$1.$2')
        .replace(/(\d{3})(\d)/, '$1.$2')
        .replace(/(\d{3})(\d{1,2})/, '$1-$2')
        .replace(/(-\d{2})\d+?$/, '$1');
};

const formatRG = (value: string) => {
    if (!value) return '';
    const cleanValue = value.replace(/\D/g, '');
    return cleanValue
        .replace(/(\d{2})(\d)/, '$1.$2')
        .replace(/(\d{3})(\d)/, '$1.$2')
        .replace(/(\d{3})(\d{1})/, '$1-$2')
        .replace(/(-\d{1})\d+?$/, '$1');
};

const formatCEP = (value: string) => {
    if (!value) return '';
    const cleanValue = value.replace(/\D/g, '');
    return cleanValue
        .replace(/(\d{5})(\d)/, '$1-$2')
        .replace(/(-\d{3})\d+?$/, '$1');
};

const validateCPF = (cpf: string) => {
    const cleanCPF = cpf.replace(/\D/g, '');
    return cleanCPF.length === 11;
};

const validateRG = (rg: string) => {
    const cleanRG = rg.replace(/\D/g, '');
    return cleanRG.length >= 7 && cleanRG.length <= 9;
};

const validateCEP = (cep: string) => {
    const cleanCEP = cep.replace(/\D/g, '');
    return cleanCEP.length === 8;
};

// Schema simplificado para o Gestor PF (focando nos dados essenciais)
const managerProfileSchema = z.object({
    first_name: z.string().min(2, { message: "O nome deve ter pelo menos 2 caracteres." }),
    last_name: z.string().min(1, { message: "Sobrenome é obrigatório." }),
    birth_date: z.string().refine((val) => val && !isNaN(Date.parse(val)), { message: "Data de nascimento é obrigatória." }),
    gender: z.string().min(1, { message: "Gênero é obrigatório." }).refine((val) => GENDER_OPTIONS.includes(val), { message: "Selecione um gênero válido." }),
    
    cpf: z.string().refine(validateCPF, { message: "CPF inválido." }),
    rg: z.string().min(1, { message: "RG é obrigatório." }).refine(validateRG, { message: "RG inválido." }),

    cep: z.string().min(1, { message: "CEP é obrigatório." }).refine(validateCEP, { message: "CEP inválido (8 dígitos)." }),
    rua: z.string().min(1, { message: "Rua é obrigatória." }),
    bairro: z.string().min(1, { message: "Bairro é obrigatório." }),
    cidade: z.string().min(1, { message: "Cidade é obrigatória." }),
    estado: z.string().min(1, { message: "Estado é obrigatória." }),
    numero: z.string().min(1, { message: "Número é obrigatório." }),
    complemento: z.string().optional().nullable(),
});

type ManagerProfileData = z.infer<typeof managerProfileSchema>;

const ManagerProfileEditDialog: React.FC<ManagerProfileEditDialogProps> = ({
    isOpen,
    onClose,
    profile,
    userId,
}) => {
    const navigate = useNavigate(); // Usando useNavigate
    const queryClient = useQueryClient();
    const [isSaving, setIsSaving] = useState(false);
    const [isCepLoading, setIsCepLoading] = useState(false);

    const form = useForm<ManagerProfileData>({
        resolver: zodResolver(managerProfileSchema),
        defaultValues: {
            first_name: '',
            last_name: '',
            birth_date: '',
            gender: '',
            cpf: '',
            rg: '',
            cep: '',
            rua: '',
            bairro: '',
            cidade: '',
            estado: '',
            numero: '',
            complemento: '',
        },
    });

    // Sincroniza o formulário com os dados do perfil
    useEffect(() => {
        if (profile) {
            form.reset({
                first_name: profile.first_name || '',
                last_name: profile.last_name || '',
                birth_date: profile.birth_date || '',
                gender: profile.gender || '',
                cpf: profile.cpf ? formatCPF(profile.cpf) : '',
                rg: profile.rg ? formatRG(profile.rg) : '',
                cep: profile.cep ? formatCEP(profile.cep) : '',
                rua: profile.rua || '',
                bairro: profile.bairro || '',
                cidade: profile.cidade || '',
                estado: profile.estado || '',
                numero: profile.numero || '',
                complemento: profile.complemento || '',
            });
        }
    }, [profile, form]);

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
                form.setValue('rua', '');
                form.setValue('bairro', '');
                form.setValue('cidade', '');
                form.setValue('estado', '');
            } else {
                form.clearErrors('cep');
                form.setValue('rua', data.logradouro || '');
                form.setValue('bairro', data.bairro || '');
                form.setValue('cidade', data.localidade || '');
                form.setValue('estado', data.uf || '');
                document.getElementById('numero-gestor-pf')?.focus();
            }
        } catch (error) {
            console.error("Erro ao buscar CEP:", error);
            showError("Erro na comunicação com o serviço de CEP.");
        } finally {
            setIsCepLoading(false);
        }
    };

    const handleCpfChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const formattedCpf = formatCPF(e.target.value);
        form.setValue('cpf', formattedCpf, { shouldValidate: true });
    };

    const handleRgChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const formattedRg = formatRG(e.target.value);
        form.setValue('rg', formattedRg, { shouldValidate: true });
    };

    const handleCepChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const rawValue = e.target.value;
        const formattedCep = formatCEP(rawValue);
        form.setValue('cep', formattedCep, { shouldValidate: true });

        if (formattedCep.replace(/\D/g, '').length === 8) {
            fetchAddressByCep(formattedCep);
        }
    };

    const onSubmit = async (values: ManagerProfileData) => {
        if (!userId) {
            showError("Usuário não autenticado.");
            return;
        }
        setIsSaving(true);
        const toastId = showLoading("Atualizando Perfil de Gestor PF...");

        const cleanCPF = values.cpf.replace(/\D/g, '');
        const cleanRG = values.rg ? values.rg.replace(/\D/g, '') : null;
        const cleanCEP = values.cep ? values.cep.replace(/\D/g, '') : null;

        const dataToSave = {
            first_name: values.first_name,
            last_name: values.last_name,
            birth_date: values.birth_date,
            gender: values.gender,
            cpf: cleanCPF,
            rg: cleanRG,
            cep: cleanCEP,
            rua: values.rua,
            bairro: values.bairro,
            cidade: values.cidade,
            estado: values.estado,
            numero: values.numero,
            complemento: values.complemento || null,
        };

        try {
            const { error } = await supabase
                .from('profiles')
                .update(dataToSave)
                .eq('id', userId);

            if (error) {
                throw error;
            }

            dismissToast(toastId);
            showSuccess("Perfil de Gestor PF atualizado com sucesso!");
            queryClient.invalidateQueries({ queryKey: ['profile', userId] }); // Invalida o cache do perfil
            onClose();

        } catch (e: any) {
            dismissToast(toastId);
            console.error("Erro ao atualizar Perfil de Gestor PF:", e);
            showError(`Falha ao atualizar perfil: ${e.message || 'Erro desconhecido'}`);
        } finally {
            setIsSaving(false);
        }
    };
    
    const handleMigrateToCompany = () => {
        onClose(); // Fecha o modal de edição PF
        // Passa o estado 'from' para que a página de registro de empresa saiba para onde voltar
        navigate('/manager/register/company', { state: { from: '/manager/settings' } }); 
    };

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="sm:max-w-[800px] bg-black/90 border border-yellow-500/30 text-white p-6">
                <DialogHeader>
                    <DialogTitle className="text-yellow-500 text-2xl flex items-center">
                        <User className="h-6 w-6 mr-2" />
                        Editar Perfil de Gestor PF
                    </DialogTitle>
                    <DialogDescription className="text-gray-400">
                        Atualize seus dados pessoais essenciais para a gestão de eventos.
                    </DialogDescription>
                </DialogHeader>
                <div className="max-h-[60vh] overflow-y-auto pr-4">
                    <Form {...form}>
                        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6 py-4">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <FormField
                                    control={form.control}
                                    name="first_name"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel className="text-white">Nome *</FormLabel>
                                            <FormControl>
                                                <Input placeholder="Seu primeiro nome" {...field} className="bg-black/60 border-yellow-500/30 text-white placeholder-gray-500 focus:border-yellow-500" disabled={isSaving} />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                                <FormField
                                    control={form.control}
                                    name="last_name"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel className="text-white">Sobrenome *</FormLabel>
                                            <FormControl>
                                                <Input placeholder="Seu sobrenome" {...field} className="bg-black/60 border-yellow-500/30 text-white placeholder-gray-500 focus:border-yellow-500" disabled={isSaving} />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <FormField
                                    control={form.control}
                                    name="cpf"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel className="text-white">CPF *</FormLabel>
                                            <FormControl>
                                                <Input 
                                                    placeholder="000.000.000-00"
                                                    {...field} 
                                                    onChange={handleCpfChange}
                                                    className="bg-black/60 border-yellow-500/30 text-white placeholder-gray-500 focus:border-yellow-500" 
                                                    maxLength={14}
                                                    disabled={isSaving}
                                                />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                                <FormField
                                    control={form.control}
                                    name="rg"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel className="text-white">RG *</FormLabel>
                                            <FormControl>
                                                <Input 
                                                    placeholder="00.000.000-0"
                                                    {...field} 
                                                    onChange={handleRgChange}
                                                    className="bg-black/60 border-yellow-500/30 text-white placeholder-gray-500 focus:border-yellow-500" 
                                                    maxLength={12}
                                                    disabled={isSaving}
                                                />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <FormField
                                    control={form.control}
                                    name="birth_date"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel className="text-white">Data de Nascimento *</FormLabel>
                                            <FormControl>
                                                <Input 
                                                    type="date" 
                                                    {...field} 
                                                    className="bg-black/60 border-yellow-500/30 text-white placeholder-gray-500 focus:border-yellow-500" 
                                                    disabled={isSaving}
                                                />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                                <FormField
                                    control={form.control}
                                    name="gender"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel className="text-white">Gênero *</FormLabel>
                                            <Select 
                                                onValueChange={field.onChange} 
                                                defaultValue={field.value} 
                                                disabled={isSaving}
                                            >
                                                <FormControl>
                                                    <SelectTrigger className="w-full bg-black/60 border-yellow-500/30 text-white focus:ring-yellow-500">
                                                        <SelectValue placeholder="Selecione seu gênero" />
                                                    </SelectTrigger>
                                                </FormControl>
                                                <SelectContent className="bg-black border-yellow-500/30 text-white">
                                                    {GENDER_OPTIONS.map(option => (
                                                        <SelectItem key={option} value={option} className="hover:bg-yellow-500/10 cursor-pointer">
                                                            {option}
                                                        </SelectItem>
                                                    ))}
                                                </SelectContent>
                                            </Select>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                            </div>

                            {/* Seção de Endereço */}
                            <div className="pt-4 border-t border-yellow-500/20">
                                <h3 className="text-xl font-semibold text-white mb-4">Endereço *</h3>
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
                                                        disabled={isSaving || isCepLoading} 
                                                        className="bg-black/60 border-yellow-500/30 text-white placeholder-gray-500 focus:border-yellow-500 pr-10" 
                                                        maxLength={9}
                                                    />
                                                    {isCepLoading && (
                                                        <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                                                            <Loader2 className="w-4 h-4 border-2 border-yellow-500/20 border-t-yellow-500 rounded-full animate-spin">
                                                            </Loader2>
                                                        </div>
                                                    )}
                                                </div>
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                <div className="md:col-span-2">
                                    <FormField
                                        control={form.control}
                                        name="rua"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel className="text-white">Rua *</FormLabel>
                                                <FormControl>
                                                    <Input id="rua-gestor-pf" placeholder="Ex: Av. Paulista" {...field} disabled={isSaving || isCepLoading} className="bg-black/60 border-yellow-500/30 text-white placeholder-gray-500 focus:border-yellow-500" />
                                                </FormControl>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />
                                </div>
                                <FormField
                                    control={form.control}
                                    name="numero"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel className="text-white">Número *</FormLabel>
                                            <FormControl>
                                                <Input id="numero-gestor-pf" placeholder="123" {...field} disabled={isSaving || isCepLoading} className="bg-black/60 border-yellow-500/30 text-white placeholder-gray-500 focus:border-yellow-500" />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                            </div>

                            <FormField
                                control={form.control}
                                name="complemento"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel className="text-white">Complemento (Opcional)</FormLabel>
                                        <FormControl>
                                            <Input placeholder="Apto 101, Bloco B" {...field} disabled={isSaving || isCepLoading} className="bg-black/60 border-yellow-500/30 text-white placeholder-gray-500 focus:border-yellow-500" />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />

                            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                <FormField
                                    control={form.control}
                                    name="bairro"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel className="text-white">Bairro *</FormLabel>
                                            <FormControl>
                                                <Input placeholder="Jardim Paulista" {...field} disabled={isSaving || isCepLoading} className="bg-black/60 border-yellow-500/30 text-white placeholder-gray-500 focus:border-yellow-500" />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                                <FormField
                                    control={form.control}
                                    name="cidade"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel className="text-white">Cidade *</FormLabel>
                                            <FormControl>
                                                <Input placeholder="São Paulo" {...field} disabled={isSaving || isCepLoading} className="bg-black/60 border-yellow-500/30 text-white placeholder-gray-500 focus:border-yellow-500" />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                                <FormField
                                    control={form.control}
                                    name="estado"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel className="text-white">Estado *</FormLabel>
                                            <FormControl>
                                                <Input placeholder="SP" {...field} disabled={isSaving || isCepLoading} className="bg-black/60 border-yellow-500/30 text-white placeholder-gray-500 focus:border-yellow-500" />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                            </div>

                            <DialogFooter className="pt-4 flex flex-col sm:flex-row space-y-4 sm:space-y-0 sm:space-x-4">
                                <Button
                                    type="submit"
                                    disabled={isSaving}
                                    className="flex-1 bg-yellow-500 text-black hover:bg-yellow-600 py-3 text-lg font-semibold transition-all duration-300 cursor-pointer disabled:opacity-50"
                                >
                                    {isSaving ? (
                                        <div className="flex items-center justify-center">
                                            <Loader2 className="w-5 h-5 animate-spin mr-2" />
                                            Salvar Alterações
                                        </div>
                                    ) : (
                                        <>
                                            <Save className="w-5 h-5 mr-2" />
                                            Salvar Alterações
                                        </>
                                    )}
                                </Button>
                                <Button
                                    type="button"
                                    onClick={handleMigrateToCompany}
                                    variant="outline"
                                    className="flex-1 bg-black/60 border-yellow-500/30 text-yellow-500 hover:bg-yellow-500/10 py-3 text-lg font-semibold transition-all duration-300 cursor-pointer"
                                    disabled={isSaving}
                                >
                                    <Building className="mr-2 h-5 w-5" />
                                    Migrar para Gestor PJ
                                </Button>
                            </DialogFooter>
                        </form>
                    </Form>
                </div>
            </DialogContent>
        </Dialog>
    );
};

export default ManagerProfileEditDialog;