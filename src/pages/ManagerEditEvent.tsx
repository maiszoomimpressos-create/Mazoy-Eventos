import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { categories } from '@/data/events';
import { showSuccess, showError, showLoading, dismissToast } from '@/utils/toast';
import { supabase } from '@/integrations/supabase/client';
import { Loader2, ImageOff, AlertTriangle, ArrowLeft } from 'lucide-react';
import { format } from 'date-fns';
import { DatePicker } from '@/components/DatePicker';
import ImageUploadPicker from '@/components/ImageUploadPicker';
import { useProfileStatus } from '@/hooks/use-profile-status';
import { useProfile } from '@/hooks/use-profile';
import { useManagerCompany } from '@/hooks/use-manager-company';

// Define the structure for the form data
interface EventFormData {
    title: string;
    description: string;
    date: Date | undefined; // Mantido como Date | undefined
    time: string;
    location: string; // General location name
    address: string; // Detailed address
    image_url: string; // Image URL
    min_age: number | string; // Minimum age
    category: string;
    capacity: number | string; // Capacidade
    duration: string; // NOVO: Duração
}

const ManagerEditEvent: React.FC = () => {
    const navigate = useNavigate();
    const { id } = useParams<{ id: string }>();
    const [formData, setFormData] = useState<EventFormData | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [isFetchingEvent, setIsFetchingEvent] = useState(true);
    const [userId, setUserId] = useState<string | null>(null);
    const [formErrors, setFormErrors] = useState<{ [key: string]: string }>({});

    // Fetch current user ID
    useEffect(() => {
        supabase.auth.getUser().then(({ data: { user } }) => {
            if (user) {
                setUserId(user.id);
            } else {
                showError("Sessão expirada ou não autenticada. Faça login novamente.");
                navigate('/manager/login');
            }
        });
    }, [navigate]);

    const { profile, isLoading: isLoadingProfile } = useProfile(userId);
    const { needsPersonalProfileCompletion, loading: isLoadingProfileStatus } = useProfileStatus(profile, isLoadingProfile); 
    const { company, isLoading: isLoadingCompany } = useManagerCompany(userId, profile?.tipo_usuario_id); 

    const isProfileIncomplete = needsPersonalProfileCompletion;
    const isPageLoading = isLoadingProfile || isLoadingProfileStatus || isFetchingEvent || isLoadingCompany || !userId; 
    
    // Verifica se o gestor é PJ e ainda não cadastrou a empresa
    const isPJManager = profile?.tipo_usuario_id === 2;
    const needsCompanyProfile = isPJManager && !company;
    
    const isFormDisabled = isProfileIncomplete || needsCompanyProfile;


    useEffect(() => {
        const fetchEventAndUser = async () => {
            if (!userId || isLoadingProfile || isLoadingCompany) return; 

            setIsFetchingEvent(true);
            
            if (!id) {
                showError("ID do evento não fornecido.");
                navigate('/manager/events');
                return;
            }

            // Fetch event data
            // A RLS garante que apenas eventos da empresa do gestor sejam retornados
            const { data: eventData, error: fetchError } = await supabase
                .from('events')
                .select('*')
                .eq('id', id)
                .single();

            if (fetchError || !eventData) {
                console.error("Erro ao buscar evento:", fetchError);
                showError("Evento não encontrado ou você não tem permissão para editá-lo.");
                navigate('/manager/events');
                return;
            }

            // Populate form data
            setFormData({
                title: eventData.title || '',
                description: eventData.description || '',
                date: eventData.date ? new Date(eventData.date) : undefined,
                time: eventData.time || '',
                location: eventData.location || '',
                address: eventData.address || '',
                image_url: eventData.image_url || '',
                min_age: eventData.min_age || 0,
                category: eventData.category || '',
                capacity: eventData.capacity || '',
                duration: eventData.duration || '',
            });
            setIsFetchingEvent(false);
        };

        if (userId) {
            fetchEventAndUser();
        }
    }, [id, navigate, userId, isLoadingProfile, isLoadingCompany]); 

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        const { id, value, type } = e.target;
        
        // Limpa o erro para o campo atual quando o usuário começa a digitar
        setFormErrors(prev => ({ ...prev, [id]: '' }));

        setFormData(prev => {
            if (!prev) return null;
            return { 
                ...prev, 
                [id]: type === 'number' ? (value === '' ? '' : Number(value)) : value 
            };
        });
    };

    const handleDateChange = (date: Date | undefined) => {
        setFormData(prev => {
            if (!prev) return null;
            return { ...prev, date };
        });
        setFormErrors(prev => ({ ...prev, date: '' }));
    };

    const handleSelectChange = (value: string) => {
        setFormData(prev => {
            if (!prev) return null;
            return { ...prev, category: value };
        });
        setFormErrors(prev => ({ ...prev, category: '' }));
    };

    const handleImageUpload = (url: string) => {
        setFormData(prev => {
            if (!prev) return null;
            return { ...prev, image_url: url };
        });
        setFormErrors(prev => ({ ...prev, image_url: '' }));
    };

    const validateForm = (): { isValid: boolean, errors: { [key: string]: string }, isoDate: string | null } => {
        const newErrors: { [key: string]: string } = {};
        let isValid = true;
        let isoDate: string | null = null;
        
        if (!formData) { isValid = false; return { isValid, errors: newErrors, isoDate }; }

        if (!formData.title) { newErrors.title = "Título é obrigatório."; isValid = false; }
        if (!formData.description) { newErrors.description = "Descrição é obrigatória."; isValid = false; }
        if (!formData.time) { newErrors.time = "Horário é obrigatório."; isValid = false; }
        if (!formData.location) { newErrors.location = "Localização é obrigatória."; isValid = false; }
        if (!formData.address) { newErrors.address = "Endereço detalhado é obrigatório."; isValid = false; }
        if (!formData.image_url) { newErrors.image_url = "URL da Imagem/Banner é obrigatória."; isValid = false; }
        if (!formData.duration) { newErrors.duration = "Duração é obrigatória."; isValid = false; }
        
        // Validação da Data (agora é um objeto Date)
        if (!formData.date) {
            newErrors.date = "Data é obrigatória."; isValid = false;
        } else {
            // Converte para o formato ISO (YYYY-MM-DD) para salvar no Supabase
            isoDate = format(formData.date, 'yyyy-MM-dd');
        }

        const minAge = Number(formData.min_age);
        if (formData.min_age === '' || formData.min_age === null || isNaN(minAge) || minAge < 0) {
            newErrors.min_age = "Idade Mínima é obrigatória e deve ser 0 ou maior."; isValid = false;
        }
        
        const capacity = Number(formData.capacity);
        if (formData.capacity === '' || formData.capacity === null || isNaN(capacity) || capacity <= 0) {
            newErrors.capacity = "Capacidade é obrigatória e deve ser maior que zero."; isValid = false;
        }

        if (!formData.category) { newErrors.category = "Categoria é obrigatória."; isValid = false; }

        return { isValid, errors: newErrors, isoDate };
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (isFormDisabled) {
            showError("Por favor, complete seu perfil e/ou cadastre sua empresa para editar eventos.");
            return;
        }

        const validationResult = validateForm();
        setFormErrors(validationResult.errors);

        if (!validationResult.isValid || !userId || !id || !formData || !validationResult.isoDate) {
            showError("Por favor, preencha todos os campos obrigatórios.");
            return;
        }

        setIsLoading(true);
        const toastId = showLoading("Atualizando evento...");

        try {
            // A RLS garante que apenas o gestor da empresa associada possa atualizar
            const { error } = await supabase
                .from('events')
                .update({
                    title: formData.title,
                    description: formData.description,
                    date: validationResult.isoDate,
                    time: formData.time,
                    location: formData.location,
                    address: formData.address,
                    image_url: formData.image_url,
                    min_age: Number(formData.min_age),
                    category: formData.category,
                    capacity: Number(formData.capacity),
                    duration: formData.duration,
                })
                .eq('id', id); // Não precisamos mais do eq('user_id', userId) graças à RLS

            if (error) {
                throw error;
            }

            dismissToast(toastId);
            showSuccess(`Evento "${formData.title}" atualizado com sucesso!`);
            navigate('/manager/events');

        } catch (error: any) {
            dismissToast(toastId);
            console.error("Erro ao atualizar evento:", error);
            showError(`Falha ao atualizar evento: ${error.message || 'Erro desconhecido'}`);
        } finally {
            setIsLoading(false);
        }
    };

    if (isPageLoading || !formData) {
        return (
            <div className="max-w-4xl mx-auto px-4 sm:px-0 text-center py-20">
                <Loader2 className="h-10 w-10 animate-spin text-yellow-500 mx-auto mb-4" />
                <p className="text-gray-400">Carregando detalhes do evento e dados do gestor...</p>
            </div>
        );
    }

    return (
        <div className="max-w-4xl mx-auto px-4 sm:px-0">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-8">
                <h1 className="text-2xl sm:text-3xl font-serif text-yellow-500 mb-4 sm:mb-0">Editar Evento: {formData.title}</h1>
                <Button 
                    onClick={() => navigate('/manager/events')}
                    variant="outline"
                    className="bg-black/60 border border-yellow-500/30 text-yellow-500 hover:bg-yellow-500/10 text-sm"
                >
                    <ArrowLeft className="mr-2 h-4 w-4" />
                    Voltar para a Lista
                </Button>
            </div>

            {isFormDisabled && (
                <Alert className="bg-red-500/20 border border-red-500/50 text-red-400 mb-8 animate-fadeInUp">
                    <AlertTriangle className="h-5 w-5" />
                    <AlertTitle className="text-white">Ação Bloqueada</AlertTitle>
                    <AlertDescription className="text-gray-300">
                        {needsPersonalProfileCompletion && (
                            <p className="mb-2">Seu perfil pessoal está incompleto. Por favor, <Button variant="link" className="h-auto p-0 text-red-400 hover:text-red-300" onClick={() => navigate('/profile')}>complete-o aqui</Button> para editar eventos.</p>
                        )}
                        {needsCompanyProfile && (
                            <p className="mb-2">Você é um Gestor PJ. Por favor, <Button variant="link" className="h-auto p-0 text-red-400 hover:text-red-300" onClick={() => navigate('/manager/settings/company-profile')}>cadastre sua empresa aqui</Button> para editar eventos.</p>
                        )}
                        <p className="mt-2 text-sm text-white font-semibold">O formulário de edição de evento está desabilitado.</p>
                    </AlertDescription>
                </Alert>
            )}

            <Card className="bg-black/80 backdrop-blur-sm border border-yellow-500/30 rounded-2xl shadow-2xl shadow-yellow-500/10">
                <CardHeader>
                    <CardTitle className="text-white text-xl sm:text-2xl font-semibold">Detalhes do Evento</CardTitle>
                </CardHeader>
                <CardContent>
                    <form onSubmit={handleSubmit} className="space-y-6">
                        {/* Linha 1: Título e Localização Geral */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div>
                                <label htmlFor="title" className="block text-sm font-medium text-white mb-2">Título do Evento *</label>
                                <Input 
                                    id="title" 
                                    value={formData.title} 
                                    onChange={handleChange} 
                                    placeholder="Ex: Concerto Sinfônico Premium"
                                    className="bg-black/60 border-yellow-500/30 text-white placeholder-gray-500 focus:border-yellow-500"
                                    isInvalid={!!formErrors.title}
                                    required
                                    disabled={isFormDisabled}
                                />
                                {formErrors.title && <p className="text-red-400 text-xs mt-1">{formErrors.title}</p>}
                            </div>
                            <div>
                                <label htmlFor="location" className="block text-sm font-medium text-white mb-2">Localização (Nome do Local) *</label>
                                <Input 
                                    id="location" 
                                    value={formData.location} 
                                    onChange={handleChange} 
                                    placeholder="Ex: Teatro Municipal"
                                    className="bg-black/60 border-yellow-500/30 text-white placeholder-gray-500 focus:border-yellow-500"
                                    isInvalid={!!formErrors.location}
                                    required
                                    disabled={isFormDisabled}
                                />
                                {formErrors.location && <p className="text-red-400 text-xs mt-1">{formErrors.location}</p>}
                            </div>
                        </div>

                        {/* Linha 2: Endereço Detalhado */}
                        <div>
                            <label htmlFor="address" className="block text-sm font-medium text-white mb-2">Endereço Detalhado (Rua, Número, Cidade) *</label>
                            <Input 
                                id="address" 
                                value={formData.address} 
                                onChange={handleChange} 
                                placeholder="Ex: Praça Ramos de Azevedo, s/n - República, São Paulo - SP"
                                className="bg-black/60 border-yellow-500/30 text-white placeholder-gray-500 focus:border-yellow-500"
                                isInvalid={!!formErrors.address}
                                required
                                disabled={isFormDisabled}
                            />
                            {formErrors.address && <p className="text-red-400 text-xs mt-1">{formErrors.address}</p>}
                        </div>

                        {/* Linha 3: Descrição */}
                        <div>
                            <label htmlFor="description" className="block text-sm font-medium text-white mb-2">Descrição Detalhada *</label>
                            <Textarea 
                                id="description" 
                                value={formData.description} 
                                onChange={handleChange} 
                                placeholder="Descreva o evento, destaques e público-alvo."
                                className="bg-black/60 border-yellow-500/30 text-white placeholder-gray-500 focus:border-yellow-500 min-h-[100px]"
                                isInvalid={!!formErrors.description}
                                required
                                disabled={isFormDisabled}
                            />
                            {formErrors.description && <p className="text-red-400 text-xs mt-1">{formErrors.description}</p>}
                        </div>
                        
                        {/* Linha 4: Imagem/Banner Preview - Usando o novo componente */}
                        <div className="space-y-4 pt-4 border-t border-yellow-500/20">
                            <h3 className="text-xl font-semibold text-white">Banner do Evento *</h3>
                            {userId && (
                                <ImageUploadPicker
                                    userId={userId}
                                    currentImageUrl={formData.image_url}
                                    onImageUpload={handleImageUpload}
                                    disabled={isLoading || isFormDisabled}
                                    width={550}
                                    height={380}
                                    placeholderText="Nenhuma imagem de banner selecionada."
                                    isInvalid={!!formErrors.image_url}
                                />
                            )}
                            {formErrors.image_url && <p className="text-red-400 text-xs mt-1">{formErrors.image_url}</p>}
                        </div>

                        {/* Linha 5: Data, Horário, Categoria */}
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                            <div>
                                <label htmlFor="date" className="block text-sm font-medium text-white mb-2">Data *</label>
                                <DatePicker 
                                    date={formData.date}
                                    setDate={handleDateChange}
                                    placeholder="DD/MM/AAAA ou Selecione"
                                    isInvalid={!!formErrors.date}
                                    disabled={isFormDisabled}
                                />
                                {formErrors.date && <p className="text-red-400 text-xs mt-1">{formErrors.date}</p>}
                            </div>
                            <div>
                                <label htmlFor="time" className="block text-sm font-medium text-white mb-2">Horário *</label>
                                <Input 
                                    id="time" 
                                    type="time"
                                    value={formData.time} 
                                    onChange={handleChange} 
                                    className="bg-black/60 border-yellow-500/30 text-white placeholder-gray-500 focus:border-yellow-500"
                                    isInvalid={!!formErrors.time}
                                    required
                                    disabled={isFormDisabled}
                                />
                                {formErrors.time && <p className="text-red-400 text-xs mt-1">{formErrors.time}</p>}
                            </div>
                            <div>
                                <label htmlFor="category" className="block text-sm font-medium text-white mb-2">Categoria *</label>
                                <Select onValueChange={handleSelectChange} value={formData.category} disabled={isFormDisabled}>
                                    <SelectTrigger 
                                        className="w-full bg-black/60 border-yellow-500/30 text-white focus:ring-yellow-500"
                                        isInvalid={!!formErrors.category}
                                    >
                                        <SelectValue placeholder="Selecione a Categoria" />
                                    </SelectTrigger>
                                    <SelectContent className="bg-black border-yellow-500/30 text-white">
                                        {categories.map(cat => (
                                            <SelectItem key={cat.id} value={cat.name} className="hover:bg-yellow-500/10 cursor-pointer">
                                                {cat.name}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                                {formErrors.category && <p className="text-red-400 text-xs mt-1">{formErrors.category}</p>}
                            </div>
                        </div>
                        
                        {/* Linha 6: Capacidade, Duração e Idade Mínima */}
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                            <div>
                                <label htmlFor="capacity" className="block text-sm font-medium text-white mb-2">Capacidade Máxima (Pessoas) *</label>
                                <Input 
                                    id="capacity" 
                                    type="number"
                                    value={formData.capacity} 
                                    onChange={handleChange} 
                                    placeholder="Ex: 500"
                                    className="bg-black/60 border-yellow-500/30 text-white placeholder-gray-500 focus:border-yellow-500"
                                    isInvalid={!!formErrors.capacity}
                                    min="1"
                                    required
                                    disabled={isFormDisabled}
                                />
                                <p className="text-xs text-gray-500 mt-1">Número máximo de pessoas permitidas.</p>
                                {formErrors.capacity && <p className="text-red-400 text-xs mt-1">{formErrors.capacity}</p>}
                            </div>
                            <div>
                                <label htmlFor="duration" className="block text-sm font-medium text-white mb-2">Duração (Ex: 2h30min) *</label>
                                <Input 
                                    id="duration" 
                                    type="text"
                                    value={formData.duration} 
                                    onChange={handleChange} 
                                    placeholder="Ex: 3 horas ou 2h30min"
                                    className="bg-black/60 border-yellow-500/30 text-white placeholder-gray-500 focus:border-yellow-500"
                                    isInvalid={!!formErrors.duration}
                                    required
                                    disabled={isFormDisabled}
                                />
                                <p className="text-xs text-gray-500 mt-1">Duração estimada do evento.</p>
                                {formErrors.duration && <p className="text-red-400 text-xs mt-1">{formErrors.duration}</p>}
                            </div>
                            <div>
                                <label htmlFor="min_age" className="block text-sm font-medium text-white mb-2">Idade Mínima (Anos) *</label>
                                <Input 
                                    id="min_age" 
                                    type="number"
                                    value={formData.min_age} 
                                    onChange={handleChange} 
                                    placeholder="0 (Livre)"
                                    className="bg-black/60 border-yellow-500/30 text-white placeholder-gray-500 focus:border-yellow-500"
                                    isInvalid={!!formErrors.min_age}
                                    min="0"
                                    required
                                    disabled={isFormDisabled}
                                />
                                <p className="text-xs text-gray-500 mt-1">Defina 0 para classificação livre.</p>
                                {formErrors.min_age && <p className="text-red-400 text-xs mt-1">{formErrors.min_age}</p>}
                            </div>
                        </div>

                        <div className="flex items-center space-x-4 pt-4">
                            <Button
                                type="submit"
                                disabled={isLoading || !userId || isFormDisabled}
                                className="bg-yellow-500 text-black hover:bg-yellow-600 py-3 text-lg font-semibold transition-all duration-300 cursor-pointer disabled:opacity-50 flex-1"
                            >
                                {isLoading ? (
                                    <div className="flex items-center justify-center">
                                        <Loader2 className="w-5 h-5 animate-spin mr-2" />
                                        Salvando Alterações...
                                    </div>
                                ) : (
                                    <>
                                        <i className="fas fa-save mr-2"></i>
                                        Salvar Alterações
                                    </>
                                )}
                            </Button>
                            <Button
                                type="button"
                                onClick={() => navigate('/manager/events')}
                                variant="outline"
                                className="bg-black/60 border-yellow-500/30 text-yellow-500 hover:bg-yellow-500/10 py-3 text-lg font-semibold transition-all duration-300 cursor-pointer flex-1"
                            >
                                <ArrowLeft className="mr-2 h-5 w-5" />
                                Voltar para a Lista
                            </Button>
                        </div>
                    </form>
                </CardContent>
            </Card>
        </div>
    );
};

export default ManagerEditEvent;