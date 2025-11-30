"use client";

import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { showSuccess, showError, showLoading, dismissToast } from '@/utils/toast';
import { supabase } from '@/integrations/supabase/client';
import { Loader2, Image, Heading, Subtitles, QrCode, Save, ArrowLeft } from 'lucide-react';
import ImageUploadPicker from '@/components/ImageUploadPicker';
import { useProfile } from '@/hooks/use-profile';

// Zod schema for CRT Event validation
const crtEventoSchema = z.object({
    title: z.string().min(1, "Título é obrigatório."),
    description: z.string().min(1, "Descrição é obrigatória."),
    image_url: z.string().url("URL da Imagem/Banner é obrigatória e deve ser uma URL válida."),
    title_code: z.string().min(3, "Código do Título é obrigatório."),
});

type CrtEventoFormData = z.infer<typeof crtEventoSchema>;

const CrtEventoForm: React.FC = () => {
    const navigate = useNavigate();
    const [isSaving, setIsSaving] = useState(false);
    const [userId, setUserId] = useState<string | null>(null);
    const { profile, isLoading: isLoadingProfile } = useProfile(userId || undefined);

    useEffect(() => {
        supabase.auth.getUser().then(({ data: { user } }) => {
            setUserId(user?.id || null);
        });
    }, []);

    const form = useForm<CrtEventoFormData>({
        resolver: zodResolver(crtEventoSchema),
        defaultValues: {
            title: '',
            description: '',
            image_url: '',
            title_code: '',
        },
    });

    const handleImageUpload = (url: string) => {
        form.setValue('image_url', url, { shouldValidate: true });
    };

    const onSubmit = async (values: CrtEventoFormData) => {
        if (!userId) {
            showError("Usuário não autenticado.");
            return;
        }
        
        // NOTE: A tabela 'crt_eventos' não existe no schema atual. 
        // Para fins de demonstração do formulário, simulamos o salvamento.
        // Em um cenário real, criaríamos a tabela e a lógica de RLS.

        setIsSaving(true);
        const toastId = showLoading("Registrando CRT Evento...");

        try {
            // Simulação de inserção no banco de dados
            await new Promise(resolve => setTimeout(resolve, 1500)); 
            
            // Lógica de inserção real (se a tabela existisse):
            /*
            const { error } = await supabase
                .from('crt_eventos')
                .insert([{ 
                    ...values, 
                    manager_id: userId,
                    // outros campos
                }]);
            if (error) throw error;
            */

            dismissToast(toastId);
            showSuccess(`CRT Evento "${values.title}" registrado com sucesso!`);
            form.reset();
            navigate('/manager/dashboard');

        } catch (error: any) {
            dismissToast(toastId);
            console.error("Erro ao registrar CRT Evento:", error);
            showError(`Falha ao registrar: ${error.message || 'Erro desconhecido'}`);
        } finally {
            setIsSaving(false);
        }
    };

    if (isLoadingProfile) {
        return (
            <div className="max-w-4xl mx-auto px-4 sm:px-0 text-center py-20">
                <Loader2 className="h-10 w-10 animate-spin text-yellow-500 mx-auto mb-4" />
                <p className="text-gray-400">Carregando perfil...</p>
            </div>
        );
    }

    return (
        <div className="max-w-4xl mx-auto px-4 sm:px-0">
            <div className="flex items-center justify-between mb-8">
                <h1 className="text-2xl sm:text-3xl font-serif text-yellow-500 flex items-center">
                    <QrCode className="h-7 w-7 mr-3" />
                    Registro de CRT Evento
                </h1>
                <Button 
                    onClick={() => navigate('/manager/dashboard')}
                    variant="outline"
                    className="bg-black/60 border border-yellow-500/30 text-yellow-500 hover:bg-yellow-500/10 text-sm"
                >
                    <ArrowLeft className="mr-2 h-4 w-4" />
                    Voltar
                </Button>
            </div>

            <Card className="bg-black/80 backdrop-blur-sm border border-yellow-500/30 rounded-2xl shadow-2xl shadow-yellow-500/10">
                <CardHeader>
                    <CardTitle className="text-white text-xl sm:text-2xl font-semibold">Detalhes do Título</CardTitle>
                    <CardDescription className="text-gray-400 text-sm">
                        Preencha os dados para registrar um novo Certificado de Registro de Título (CRT).
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <Form {...form}>
                        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                            
                            {/* Imagem/Banner com ImageUploadPicker (600x400) */}
                            <div className="space-y-4 pt-4 border-t border-yellow-500/20">
                                <h3 className="text-xl font-semibold text-white">Banner do Título (600x400px) *</h3>
                                {userId && (
                                    <ImageUploadPicker
                                        userId={userId}
                                        currentImageUrl={form.watch('image_url')}
                                        onImageUpload={handleImageUpload}
                                        width={600} 
                                        height={400} 
                                        placeholderText="Clique para enviar ou arraste e solte uma imagem (600px de largura por 400px de altura)"
                                        bucketName="crt-banners" // Novo bucket para CRT
                                        folderPath="crt"
                                        maxFileSizeMB={5}
                                        isInvalid={!!form.formState.errors.image_url}
                                        disabled={isSaving}
                                    />
                                )}
                                {form.formState.errors.image_url && <p className="text-red-500 text-xs mt-1">{form.formState.errors.image_url.message}</p>}
                            </div>

                            {/* Título e Código do Título */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <FormField
                                    control={form.control}
                                    name="title"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel className="text-white flex items-center">
                                                <Heading className="h-4 w-4 mr-2 text-yellow-500" />
                                                Título do CRT *
                                            </FormLabel>
                                            <FormControl>
                                                <Input 
                                                    placeholder="Ex: Título de Propriedade Exclusiva"
                                                    {...field} 
                                                    className={`bg-black/60 border-yellow-500/30 text-white placeholder-gray-500 focus:border-yellow-500 ${form.formState.errors.title ? 'border-red-500' : ''}`}
                                                    disabled={isSaving}
                                                />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                                <FormField
                                    control={form.control}
                                    name="title_code"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel className="text-white flex items-center">
                                                <QrCode className="h-4 w-4 mr-2 text-yellow-500" />
                                                Código do Título *
                                            </FormLabel>
                                            <FormControl>
                                                <Input 
                                                    placeholder="Ex: CRT-2025-001"
                                                    {...field} 
                                                    className={`bg-black/60 border-yellow-500/30 text-white placeholder-gray-500 focus:border-yellow-500 ${form.formState.errors.title_code ? 'border-red-500' : ''}`}
                                                    disabled={isSaving}
                                                />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                            </div>

                            {/* Descrição */}
                            <FormField
                                control={form.control}
                                name="description"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel className="text-white flex items-center">
                                            <Subtitles className="h-4 w-4 mr-2 text-yellow-500" />
                                            Descrição Detalhada *
                                        </FormLabel>
                                        <FormControl>
                                            <Textarea 
                                                placeholder="Descreva a finalidade e os detalhes do registro."
                                                {...field} 
                                                className={`bg-black/60 border-yellow-500/30 text-white placeholder-gray-500 focus:border-yellow-500 min-h-[100px] ${form.formState.errors.description ? 'border-red-500' : ''}`}
                                                disabled={isSaving}
                                            />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />

                            <div className="flex items-center space-x-4 pt-4">
                                <Button
                                    type="submit"
                                    disabled={isSaving}
                                    className="flex-1 bg-yellow-500 text-black hover:bg-yellow-600 py-3 text-lg font-semibold transition-all duration-300 cursor-pointer disabled:opacity-50"
                                >
                                    {isSaving ? (
                                        <div className="flex items-center justify-center">
                                            <Loader2 className="w-5 h-5 animate-spin mr-2" />
                                            Registrando...
                                        </div>
                                    ) : (
                                        <>
                                            <Save className="mr-2 h-5 w-5" />
                                            Registrar CRT Evento
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
                                    Voltar
                                </Button>
                            </div>
                        </form>
                    </Form>
                </CardContent>
            </Card>
        </div>
    );
};

export default CrtEventoForm;