"use client";

import React, { useState, useEffect } from 'react';
import { useForm, FormProvider } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { categories } from '@/data/events';
import { showSuccess, showError, showLoading, dismissToast } from '@/utils/toast';
import { supabase } from '@/integrations/supabase/client';
import { Loader2, ImageOff, MapPin, CalendarDays, ListOrdered, Heading, Subtitles, SlidersHorizontal, ArrowLeft, Plus, Save } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { DatePicker } from '@/components/DatePicker';
import ImageUploadPicker from '@/components/ImageUploadPicker';
import { useManagerCompany } from '@/hooks/use-manager-company';
import { useProfile } from '@/hooks/use-profile';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";

// Define the structure for the form data
interface EventFormData {
    title: string;
    description: string;
    date: Date | undefined;
    time: string;
    location: string;
    address: string;
    image_url: string;
    min_age: number | string;
    category: string;
    capacity: number | string;
    duration: string;
    
    // Carousel fields (now optional and pre-filled)
    is_featured_carousel: boolean;
    carousel_display_order: number | string;
    carousel_start_date: Date | undefined;
    carousel_end_date: Date | undefined;
    carousel_headline: string;
    carousel_subheadline: string;
}

// Zod schema for form validation
const eventSchema = z.object({
    title: z.string().min(1, "Título é obrigatório."),
    description: z.string().min(1, "Descrição é obrigatória."),
    date: z.date({ required_error: "Data é obrigatória." }),
    time: z.string().min(1, "Horário é obrigatório."),
    location: z.string().min(1, "Localização é obrigatória."),
    address: z.string().min(1, "Endereço detalhado é obrigatório."),
    image_url: z.string().url("URL da Imagem/Banner é obrigatória e deve ser uma URL válida."),
    min_age: z.union([z.number().min(0, "Idade Mínima deve ser 0 ou maior."), z.literal('')]).transform(e => e === '' ? 0 : Number(e)),
    category: z.string().min(1, "Categoria é obrigatória."),
    capacity: z.union([z.number().min(1, "Capacidade deve ser maior que zero."), z.literal('')]).transform(e => e === '' ? 0 : Number(e)),
    duration: z.string().min(1, "Duração é obrigatória."),

    is_featured_carousel: z.boolean(),
    carousel_display_order: z.union([z.number().min(0, "Ordem de Exibição deve ser 0 ou maior."), z.literal('')]).transform(e => e === '' ? 0 : Number(e)),
    carousel_start_date: z.date().optional().nullable(),
    carousel_end_date: z.date().optional().nullable(),
    carousel_headline: z.string().optional().nullable(),
    carousel_subheadline: z.string().optional().nullable(),
}).superRefine((data, ctx) => {
    if (data.is_featured_carousel) {
        if (!data.carousel_headline) {
            ctx.addIssue({
                code: z.ZodIssueCode.custom,
                message: "Título do Banner é obrigatório para carrossel.",
                path: ['carousel_headline'],
            });
        }
        if (!data.carousel_subheadline) {
            ctx.addIssue({
                code: z.ZodIssueCode.custom,
                message: "Subtítulo do Banner é obrigatório para carrossel.",
                path: ['carousel_subheadline'],
            });
        }
        if (!data.carousel_start_date) {
            ctx.addIssue({
                code: z.ZodIssueCode.custom,
                message: "Data de Início do Carrossel é obrigatória.",
                path: ['carousel_start_date'],
            });
        }
        if (!data.carousel_end_date) {
            ctx.addIssue({
                code: z.ZodIssueCode.custom,
                message: "Data de Fim do Carrossel é obrigatória.",
                path: ['carousel_end_date'],
            });
        }
        if (data.carousel_start_date && data.carousel_end_date && data.carousel_start_date > data.carousel_end_date) {
            ctx.addIssue({
                code: z.ZodIssueCode.custom,
                message: "A data de início do carrossel não pode ser posterior à data de fim.",
                path: ['carousel_end_date'],
            });
        }
    }
});

interface EventFormStepsProps {
    eventId?: string; // Optional for creation, required for editing
    initialData?: EventFormData;
    onSaveSuccess: (id: string) => void;
    onCancel: () => void;
}

const EventFormSteps: React.FC<EventFormStepsProps> = ({ eventId, initialData, onSaveSuccess, onCancel }) => {
    const [step, setStep] = useState(1);
    const [isSaving, setIsSaving] = useState(false);
    const [userId, setUserId] = useState<string | null>(null);
    const { company, isLoading: isLoadingCompany } = useManagerCompany(userId || undefined);
    const { profile, isLoading: isLoadingProfile } = useProfile(userId || undefined);

    const form = useForm<EventFormData>({
        resolver: zodResolver(eventSchema),
        defaultValues: {
            title: '',
            description: '',
            date: undefined,
            time: '',
            location: '',
            address: '',
            image_url: '',
            min_age: 0,
            category: '',
            capacity: 0,
            duration: '',
            is_featured_carousel: true,
            carousel_display_order: 0,
            carousel_start_date: undefined,
            carousel_end_date: undefined,
            carousel_headline: '',
            carousel_subheadline: '',
        },
        values: initialData, // Use initialData for default values
    });

    useEffect(() => {
        supabase.auth.getUser().then(({ data: { user } }) => {
            setUserId(user?.id || null);
        });
    }, []);

    // Pre-fill carousel fields when moving to step 2 or when initialData changes
    useEffect(() => {
        if (step === 2 && initialData) {
            const eventDate = initialData.date;
            const defaultEndDate = eventDate ? new Date(eventDate.getTime()) : undefined;
            if (defaultEndDate) {
                defaultEndDate.setDate(defaultEndDate.getDate() + 30); // 30 days after event date
            }

            form.setValue('carousel_headline', initialData.title);
            form.setValue('carousel_subheadline', initialData.description);
            form.setValue('carousel_start_date', eventDate);
            form.setValue('carousel_end_date', defaultEndDate);
            form.setValue('carousel_display_order', 0); // Default to 0
        }
    }, [step, initialData, form]);

    const handleImageUpload = (url: string) => {
        form.setValue('image_url', url, { shouldValidate: true });
    };

    const handleNextStep = async () => {
        const isValid = await form.trigger([
            'title', 'description', 'date', 'time', 'location', 'address', 'image_url',
            'min_age', 'category', 'capacity', 'duration'
        ]);

        if (isValid) {
            setStep(2);
        } else {
            showError("Por favor, preencha todos os campos obrigatórios da Etapa 1.");
        }
    };

    const handlePreviousStep = () => {
        setStep(1);
    };

    const onSubmit = async (values: EventFormData) => {
        if (!userId || !company?.id) {
            showError("Usuário ou empresa não identificados.");
            return;
        }

        setIsSaving(true);
        const toastId = showLoading(eventId ? "Atualizando evento..." : "Publicando evento...");

        const isoDate = values.date ? format(values.date, 'yyyy-MM-dd') : null;
        const isoCarouselStartDate = values.carousel_start_date ? format(values.carousel_start_date, 'yyyy-MM-dd') : null;
        const isoCarouselEndDate = values.carousel_end_date ? format(values.carousel_end_date, 'yyyy-MM-dd') : null;

        // Placeholder para geocodificação
        const geocodedLatitude = -23.5505; // Exemplo: Latitude de São Paulo
        const geocodedLongitude = -46.6333; // Exemplo: Longitude de São Paulo

        const eventDataToSave = {
            company_id: company.id,
            title: values.title,
            description: values.description,
            date: isoDate,
            time: values.time,
            location: values.location,
            address: values.address,
            image_url: values.image_url,
            min_age: Number(values.min_age),
            category: values.category,
            capacity: Number(values.capacity),
            duration: values.duration,
            latitude: geocodedLatitude,
            longitude: geocodedLongitude,
            is_featured_carousel: values.is_featured_carousel,
            carousel_display_order: values.is_featured_carousel ? Number(values.carousel_display_order) : 0,
            carousel_start_date: values.is_featured_carousel ? isoCarouselStartDate : null,
            carousel_end_date: values.is_featured_carousel ? isoCarouselEndDate : null,
            carousel_headline: values.is_featured_carousel ? values.carousel_headline : null,
            carousel_subheadline: values.is_featured_carousel ? values.carousel_subheadline : null,
        };

        try {
            let data, error;
            if (eventId) {
                // Update existing event
                ({ data, error } = await supabase
                    .from('events')
                    .update(eventDataToSave)
                    .eq('id', eventId)
                    .eq('company_id', company.id)
                    .select('id')
                    .single());
            } else {
                // Insert new event
                ({ data, error } = await supabase
                    .from('events')
                    .insert([eventDataToSave])
                    .select('id')
                    .single());
            }

            if (error) {
                throw error;
            }

            dismissToast(toastId);
            showSuccess(`Evento "${values.title}" ${eventId ? 'atualizado' : 'criado'} com sucesso!`);
            onSaveSuccess(data.id);

        } catch (error: any) {
            dismissToast(toastId);
            console.error("Erro ao salvar evento:", error);
            showError(`Falha ao salvar evento: ${error.message || 'Erro desconhecido'}`);
        } finally {
            setIsSaving(false);
        }
    };

    if (isLoadingCompany || isLoadingProfile || !userId) {
        return (
            <div className="max-w-4xl mx-auto px-4 sm:px-0 text-center py-20">
                <Loader2 className="h-10 w-10 animate-spin text-yellow-500 mx-auto mb-4" />
                <p className="text-gray-400">Carregando dados do gestor...</p>
            </div>
        );
    }

    if (!company?.id) {
        return (
            <div className="max-w-4xl mx-auto px-4 sm:px-0 text-center py-20">
                <div className="bg-red-500/20 border border-red-500/50 text-red-400 p-6 rounded-xl mb-8">
                    <i className="fas fa-exclamation-triangle text-2xl mb-3"></i>
                    <h3 className="font-semibold text-white mb-2">Perfil da Empresa Necessário</h3>
                    <p className="text-sm">Você precisa cadastrar o Perfil da Empresa antes de criar/editar eventos.</p>
                    <Button 
                        onClick={() => onCancel()} // Volta para a lista de eventos ou dashboard
                        className="mt-4 bg-yellow-500 text-black hover:bg-yellow-600"
                    >
                        Ir para Perfil da Empresa
                    </Button>
                </div>
            </div>
        );
    }

    return (
        <FormProvider {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                <Card className="bg-black/80 backdrop-blur-sm border border-yellow-500/30 rounded-2xl shadow-2xl shadow-yellow-500/10">
                    <CardHeader>
                        <CardTitle className="text-white text-xl sm:text-2xl font-semibold">
                            {eventId ? `Editar Evento: ${initialData?.title}` : "Criar Novo Evento"}
                        </CardTitle>
                        <CardDescription className="text-gray-400 text-sm">
                            {step === 1 ? "Etapa 1 de 2: Detalhes básicos do evento." : "Etapa 2 de 2: Configurações do carrossel (opcional)."}
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        {step === 1 && (
                            <div className="space-y-6">
                                {/* Linha 1: Título e Localização Geral */}
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <FormField
                                        control={form.control}
                                        name="title"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel className="text-white">Título do Evento *</FormLabel>
                                                <FormControl>
                                                    <Input 
                                                        placeholder="Ex: Concerto Sinfônico Premium"
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
                                        name="location"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel className="text-white">Localização (Nome do Local) *</FormLabel>
                                                <FormControl>
                                                    <Input 
                                                        placeholder="Ex: Teatro Municipal"
                                                        {...field} 
                                                        className={`bg-black/60 border-yellow-500/30 text-white placeholder-gray-500 focus:border-yellow-500 ${form.formState.errors.location ? 'border-red-500' : ''}`}
                                                        disabled={isSaving}
                                                    />
                                                </FormControl>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />
                                </div>

                                {/* Linha 2: Endereço Detalhado */}
                                <FormField
                                    control={form.control}
                                    name="address"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel className="text-white">Endereço Detalhado (Rua, Número, Cidade) *</FormLabel>
                                            <FormControl>
                                                <Input 
                                                    placeholder="Ex: Praça Ramos de Azevedo, s/n - República, São Paulo - SP"
                                                    {...field} 
                                                    className={`bg-black/60 border-yellow-500/30 text-white placeholder-gray-500 focus:border-yellow-500 ${form.formState.errors.address ? 'border-red-500' : ''}`}
                                                    disabled={isSaving}
                                                />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />

                                {/* Linha 3: Descrição */}
                                <FormField
                                    control={form.control}
                                    name="description"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel className="text-white">Descrição Detalhada *</FormLabel>
                                            <FormControl>
                                                <Textarea 
                                                    placeholder="Descreva o evento, destaques e público-alvo."
                                                    {...field} 
                                                    className={`bg-black/60 border-yellow-500/30 text-white placeholder-gray-500 focus:border-yellow-500 min-h-[100px] ${form.formState.errors.description ? 'border-red-500' : ''}`}
                                                    disabled={isSaving}
                                                />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                                
                                {/* Linha 4: Imagem/Banner com ImageUploadPicker */}
                                <div className="space-y-4 pt-4 border-t border-yellow-500/20">
                                    <h3 className="text-xl font-semibold text-white">Banner do Evento *</h3>
                                    {userId && (
                                        <ImageUploadPicker
                                            userId={userId}
                                            currentImageUrl={form.watch('image_url')}
                                            onImageUpload={handleImageUpload}
                                            width={1000}
                                            height={400}
                                            placeholderText="Clique para enviar ou arraste e solte uma imagem (1000px de largura por 400px de altura)"
                                            bucketName="event-banners"
                                            folderPath="banners"
                                            maxFileSizeMB={5}
                                            isInvalid={!!form.formState.errors.image_url}
                                            disabled={isSaving}
                                        />
                                    )}
                                    {form.formState.errors.image_url && <p className="text-red-500 text-xs mt-1">{form.formState.errors.image_url.message}</p>}
                                </div>

                                {/* Linha 5: Data, Horário, Categoria */}
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                    <FormField
                                        control={form.control}
                                        name="date"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel className="text-white">Data *</FormLabel>
                                                <FormControl>
                                                    <DatePicker 
                                                        date={field.value}
                                                        setDate={field.onChange}
                                                        placeholder="DD/MM/AAAA ou Selecione"
                                                        disabled={isSaving}
                                                    />
                                                </FormControl>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />
                                    <FormField
                                        control={form.control}
                                        name="time"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel className="text-white">Horário *</FormLabel>
                                                <FormControl>
                                                    <Input 
                                                        type="time"
                                                        {...field} 
                                                        className={`bg-black/60 border-yellow-500/30 text-white placeholder-gray-500 focus:border-yellow-500 ${form.formState.errors.time ? 'border-red-500' : ''}`}
                                                        disabled={isSaving}
                                                    />
                                                </FormControl>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />
                                    <FormField
                                        control={form.control}
                                        name="category"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel className="text-white">Categoria *</FormLabel>
                                                <Select onValueChange={field.onChange} value={field.value} disabled={isSaving}>
                                                    <FormControl>
                                                        <SelectTrigger className={`w-full bg-black/60 border-yellow-500/30 text-white focus:ring-yellow-500 ${form.formState.errors.category ? 'border-red-500' : ''}`}>
                                                            <SelectValue placeholder="Selecione a Categoria" />
                                                        </SelectTrigger>
                                                    </FormControl>
                                                    <SelectContent className="bg-black border-yellow-500/30 text-white">
                                                        {categories.map(cat => (
                                                            <SelectItem key={cat.id} value={cat.name} className="hover:bg-yellow-500/10 cursor-pointer">
                                                                {cat.name}
                                                            </SelectItem>
                                                        ))}
                                                    </SelectContent>
                                                </Select>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />
                                </div>
                                
                                {/* Linha 6: Capacidade, Duração e Idade Mínima */}
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                    <FormField
                                        control={form.control}
                                        name="capacity"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel className="text-white">Capacidade Máxima (Pessoas) *</FormLabel>
                                                <FormControl>
                                                    <Input 
                                                        type="number"
                                                        placeholder="Ex: 500"
                                                        {...field} 
                                                        onChange={e => field.onChange(e.target.value === '' ? '' : Number(e.target.value))}
                                                        className={`bg-black/60 border-yellow-500/30 text-white placeholder-gray-500 focus:border-yellow-500 ${form.formState.errors.capacity ? 'border-red-500' : ''}`}
                                                        min="1"
                                                        disabled={isSaving}
                                                    />
                                                </FormControl>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />
                                    <FormField
                                        control={form.control}
                                        name="duration"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel className="text-white">Duração (Ex: 2h30min) *</FormLabel>
                                                <FormControl>
                                                    <Input 
                                                        placeholder="Ex: 3 horas ou 2h30min"
                                                        {...field} 
                                                        className={`bg-black/60 border-yellow-500/30 text-white placeholder-gray-500 focus:border-yellow-500 ${form.formState.errors.duration ? 'border-red-500' : ''}`}
                                                        disabled={isSaving}
                                                    />
                                                </FormControl>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />
                                    <FormField
                                        control={form.control}
                                        name="min_age"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel className="text-white">Idade Mínima (Anos) *</FormLabel>
                                                <FormControl>
                                                    <Input 
                                                        type="number"
                                                        placeholder="0 (Livre)"
                                                        {...field} 
                                                        onChange={e => field.onChange(e.target.value === '' ? '' : Number(e.target.value))}
                                                        className={`bg-black/60 border-yellow-500/30 text-white placeholder-gray-500 focus:border-yellow-500 ${form.formState.errors.min_age ? 'border-red-500' : ''}`}
                                                        min="0"
                                                        disabled={isSaving}
                                                    />
                                                </FormControl>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />
                                </div>
                            </div>
                        )}

                        {step === 2 && (
                            <div className="space-y-6">
                                {/* Seção de Configurações do Carrossel */}
                                <div className="space-y-4 pt-4 border-t border-yellow-500/20">
                                    <div className="flex items-center justify-between">
                                        <h3 className="text-xl font-semibold text-white flex items-center">
                                            <SlidersHorizontal className="h-5 w-5 mr-2 text-yellow-500" />
                                            Exibir no Carrossel da Home?
                                        </h3>
                                        <FormField
                                            control={form.control}
                                            name="is_featured_carousel"
                                            render={({ field }) => (
                                                <FormItem>
                                                    <FormControl>
                                                        <Switch 
                                                            checked={field.value} 
                                                            onCheckedChange={field.onChange}
                                                            className="data-[state=checked]:bg-yellow-500 data-[state=unchecked]:bg-gray-700"
                                                            disabled={isSaving}
                                                        />
                                                    </FormControl>
                                                </FormItem>
                                            )}
                                        />
                                    </div>

                                    {form.watch('is_featured_carousel') && (
                                        <div className="space-y-6 p-4 bg-black/60 rounded-xl border border-yellow-500/20">
                                            <FormField
                                                control={form.control}
                                                name="carousel_headline"
                                                render={({ field }) => (
                                                    <FormItem>
                                                        <FormLabel className="text-white flex items-center">
                                                            <Heading className="h-4 w-4 mr-2 text-yellow-500" />
                                                            Título do Banner (Carrossel) *
                                                        </FormLabel>
                                                        <FormControl>
                                                            <Input 
                                                                placeholder="Título chamativo para o carrossel"
                                                                {...field} 
                                                                className={`bg-black/60 border-yellow-500/30 text-white placeholder-gray-500 focus:border-yellow-500 ${form.formState.errors.carousel_headline ? 'border-red-500' : ''}`}
                                                                disabled={isSaving}
                                                            />
                                                        </FormControl>
                                                        <FormMessage />
                                                    </FormItem>
                                                )}
                                            />
                                            <FormField
                                                control={form.control}
                                                name="carousel_subheadline"
                                                render={({ field }) => (
                                                    <FormItem>
                                                        <FormLabel className="text-white flex items-center">
                                                            <Subtitles className="h-4 w-4 mr-2 text-yellow-500" />
                                                            Subtítulo do Banner (Carrossel) *
                                                        </FormLabel>
                                                        <FormControl>
                                                            <Textarea 
                                                                placeholder="Descrição curta para o banner"
                                                                {...field} 
                                                                className={`bg-black/60 border-yellow-500/30 text-white placeholder-gray-500 focus:border-yellow-500 min-h-[60px] ${form.formState.errors.carousel_subheadline ? 'border-red-500' : ''}`}
                                                                disabled={isSaving}
                                                            />
                                                        </FormControl>
                                                        <FormMessage />
                                                    </FormItem>
                                                )}
                                            />
                                            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                                <FormField
                                                    control={form.control}
                                                    name="carousel_display_order"
                                                    render={({ field }) => (
                                                        <FormItem>
                                                            <FormLabel className="text-white flex items-center">
                                                                <ListOrdered className="h-4 w-4 mr-2 text-yellow-500" />
                                                                Ordem de Exibição *
                                                            </FormLabel>
                                                            <FormControl>
                                                                <Input 
                                                                    type="number"
                                                                    placeholder="0"
                                                                    {...field} 
                                                                    onChange={e => field.onChange(e.target.value === '' ? '' : Number(e.target.value))}
                                                                    className={`bg-black/60 border-yellow-500/30 text-white placeholder-gray-500 focus:border-yellow-500 ${form.formState.errors.carousel_display_order ? 'border-red-500' : ''}`}
                                                                    min="0"
                                                                    disabled={isSaving}
                                                                />
                                                            </FormControl>
                                                            <FormMessage />
                                                        </FormItem>
                                                    )}
                                                />
                                                <FormField
                                                    control={form.control}
                                                    name="carousel_start_date"
                                                    render={({ field }) => (
                                                        <FormItem>
                                                            <FormLabel className="text-white flex items-center">
                                                                <CalendarDays className="h-4 w-4 mr-2 text-yellow-500" />
                                                                Início Exibição *
                                                            </FormLabel>
                                                            <FormControl>
                                                                <DatePicker 
                                                                    date={field.value || undefined}
                                                                    setDate={field.onChange}
                                                                    placeholder="DD/MM/AAAA"
                                                                    disabled={isSaving}
                                                                />
                                                            </FormControl>
                                                            <FormMessage />
                                                        </FormItem>
                                                    )}
                                                />
                                                <FormField
                                                    control={form.control}
                                                    name="carousel_end_date"
                                                    render={({ field }) => (
                                                        <FormItem>
                                                            <FormLabel className="text-white flex items-center">
                                                                <CalendarDays className="h-4 w-4 mr-2 text-yellow-500" />
                                                                Fim Exibição *
                                                            </FormLabel>
                                                            <FormControl>
                                                                <DatePicker 
                                                                    date={field.value || undefined}
                                                                    setDate={field.onChange}
                                                                    placeholder="DD/MM/AAAA"
                                                                    disabled={isSaving}
                                                                />
                                                            </FormControl>
                                                            <FormMessage />
                                                        </FormItem>
                                                    )}
                                                />
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}

                        <div className="flex items-center space-x-4 pt-4">
                            {step === 1 && (
                                <Button
                                    type="button"
                                    onClick={handleNextStep}
                                    disabled={isSaving}
                                    className="flex-1 bg-yellow-500 text-black hover:bg-yellow-600 py-3 text-lg font-semibold transition-all duration-300 cursor-pointer disabled:opacity-50"
                                >
                                    Próximo <ArrowLeft className="ml-2 h-5 w-5 rotate-180" />
                                </Button>
                            )}
                            {step === 2 && (
                                <>
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
                                                <Save className="mr-2 h-5 w-5" />
                                                Salvar Evento
                                            </>
                                        )}
                                    </Button>
                                    <Button
                                        type="button"
                                        onClick={handlePreviousStep}
                                        variant="outline"
                                        className="flex-1 bg-black/60 border-yellow-500/30 text-yellow-500 hover:bg-yellow-500/10 py-3 text-lg font-semibold transition-all duration-300 cursor-pointer"
                                        disabled={isSaving}
                                    >
                                        <ArrowLeft className="mr-2 h-5 w-5" />
                                        Voltar
                                    </Button>
                                </>
                            )}
                        </div>
                    </CardContent>
                </Card>
            </form>
        </FormProvider>
    );
};

export default EventFormSteps;