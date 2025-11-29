"use client";

import React, { useEffect, useState } from 'react';
import { Swiper, SwiperSlide } from 'swiper/react';
import { Autoplay, Pagination, Navigation } from 'swiper/modules';
import 'swiper/css';
import 'swiper/css/pagination';
import 'swiper/css/navigation';
import './EventCarousel.css'; // Para estilos personalizados do Swiper
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { showError } from '@/utils/toast';
import { Loader2, SlidersHorizontal } from 'lucide-react'; // Importação corrigida

// Interface para os dados do banner retornados pela Edge Function
interface CarouselBanner {
    id: string;
    type: 'event' | 'promotional'; // Novo campo para diferenciar
    image_url: string;
    headline: string;
    subheadline: string;
    category?: string; // Opcional para banners promocionais
    min_price?: number | null; // Opcional para banners promocionais
    location?: string; // Opcional para banners promocionais
    date?: string; // Opcional para banners promocionais
    time?: string; // Opcional para banners promocionais
    link_url?: string; // Para banners promocionais
    event_id?: string; // Para banners de evento
}

interface EventCarouselProps {
    userId: string | undefined;
}

const getMinPriceDisplay = (price: number | null | undefined): string => {
    if (price === null || price === undefined || price === 0) return 'Grátis';
    return `R$ ${price.toFixed(2).replace('.', ',')}`;
};

const EventCarousel: React.FC<EventCarouselProps> = ({ userId }) => {
    const navigate = useNavigate();
    const [banners, setBanners] = useState<CarouselBanner[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [userLocation, setUserLocation] = useState<{ latitude: number; longitude: number } | null>(null);

    useEffect(() => {
        // Tenta obter a localização do usuário
        if (navigator.geolocation) {
            navigator.geolocation.getCurrentPosition(
                (position) => {
                    setUserLocation({
                        latitude: position.coords.latitude,
                        longitude: position.coords.longitude,
                    });
                },
                (error) => {
                    console.warn("Geolocation error:", error);
                    // Não é um erro crítico, apenas não usaremos a localização
                },
                { enableHighAccuracy: false, timeout: 5000, maximumAge: 0 }
            );
        }
    }, []);

    useEffect(() => {
        const fetchCarouselBanners = async () => {
            setIsLoading(true);
            try {
                const token = (await supabase.auth.getSession()).data.session?.access_token;
                // A Edge Function 'fetch-carousel-events' agora buscará de ambas as tabelas
                const { data, error } = await supabase.functions.invoke('fetch-carousel-events', {
                    body: {
                        user_id: userId,
                        user_latitude: userLocation?.latitude,
                        user_longitude: userLocation?.longitude,
                    },
                    headers: {
                        'Authorization': `Bearer ${token}`,
                        'Content-Type': 'application/json',
                    },
                });

                if (error) {
                    throw error;
                }
                
                if (data.error) {
                    throw new Error(data.error);
                }

                setBanners(data.banners || []); // Agora esperamos 'banners' em vez de 'events'

            } catch (error: any) {
                console.error("Error fetching carousel banners:", error);
                showError(`Falha ao carregar banners do carrossel: ${error.message || 'Erro desconhecido'}`);
            } finally {
                setIsLoading(false);
            }
        };

        fetchCarouselBanners();
    }, [userId, userLocation]); // Refetch quando userId ou userLocation mudarem

    if (isLoading) {
        return (
            <div className="w-full h-[400px] md:h-[500px] lg:h-[600px] bg-black/60 flex items-center justify-center rounded-2xl">
                <Loader2 className="h-10 w-10 animate-spin text-yellow-500" />
            </div>
        );
    }

    if (banners.length === 0) {
        return (
            <div className="w-full h-[400px] md:h-[500px] lg:h-[600px] bg-black/60 border border-yellow-500/30 rounded-2xl flex items-center justify-center text-center p-4">
                <div className="text-gray-400">
                    <SlidersHorizontal className="h-12 w-12 mx-auto mb-4 text-gray-600" />
                    <p className="text-lg">Nenhum banner em destaque no carrossel.</p>
                    <p className="text-sm mt-2">Verifique as configurações do carrossel ou cadastre banners.</p>
                </div>
            </div>
        );
    }

    return (
        <div className="relative w-full h-[400px] md:h-[500px] lg:h-[600px] rounded-2xl overflow-hidden shadow-2xl shadow-yellow-500/10">
            <Swiper
                spaceBetween={30}
                centeredSlides={true}
                autoplay={{
                    delay: 5000, // Usar o delay padrão ou buscar da config
                    disableOnInteraction: false,
                }}
                pagination={{
                    clickable: true,
                }}
                navigation={true}
                modules={[Autoplay, Pagination, Navigation]}
                className="mySwiper w-full h-full"
            >
                {banners.map((banner) => (
                    <SwiperSlide key={banner.id}>
                        <div className="relative w-full h-full">
                            <img
                                src={banner.image_url}
                                alt={banner.headline}
                                className="w-full h-full object-cover object-center"
                            />
                            {/* Overlay escuro com gradiente */}
                            <div className="absolute inset-0 bg-gradient-to-r from-black/90 via-black/70 to-black/40"></div>
                            
                            <div className="absolute inset-0 flex items-end pb-16 pt-20">
                                <div className="max-w-7xl mx-auto px-4 sm:px-6 w-full">
                                    <div className="max-w-full lg:max-w-4xl">
                                        {/* Título do Carrossel */}
                                        <h2 className="text-4xl sm:text-6xl lg:text-7xl font-serif text-white mb-4 sm:mb-6 leading-tight drop-shadow-lg">
                                            {banner.headline}
                                        </h2>
                                        
                                        {/* Subtítulo do Carrossel */}
                                        <p className="text-base sm:text-xl text-gray-200 mb-6 sm:mb-10 leading-relaxed line-clamp-3 drop-shadow-md">
                                            {banner.subheadline}
                                        </p>
                                        
                                        {/* Detalhes (Data, Horário, Local) - Apenas para banners de evento */}
                                        {banner.type === 'event' && (
                                            <div className="flex flex-wrap gap-x-10 gap-y-4 mb-8 sm:mb-12">
                                                <div className="flex items-center">
                                                    <i className="fas fa-calendar-alt text-yellow-500 text-2xl mr-3"></i>
                                                    <div>
                                                        <div className="text-xs text-gray-400">Data</div>
                                                        <div className="text-lg font-bold text-white">{banner.date}</div>
                                                    </div>
                                                </div>
                                                <div className="flex items-center">
                                                    <i className="fas fa-clock text-yellow-500 text-2xl mr-3"></i>
                                                    <div>
                                                        <div className="text-xs text-gray-400">Horário</div>
                                                        <div className="text-lg font-bold text-white">{banner.time}</div>
                                                    </div>
                                                </div>
                                                <div className="flex items-center">
                                                    <i className="fas fa-map-marker-alt text-yellow-500 text-2xl mr-3"></i>
                                                    <div>
                                                        <div className="text-xs text-gray-400">Local</div>
                                                        <div className="text-lg font-bold text-white">{banner.location}</div>
                                                    </div>
                                                </div>
                                            </div>
                                        )}
                                        
                                        {/* Preço e Botão */}
                                        <div className="flex flex-col sm:flex-row items-start sm:items-center space-y-4 sm:space-y-0 sm:space-x-6">
                                            {banner.type === 'event' && (
                                                <span className="text-3xl sm:text-4xl font-bold text-yellow-500">
                                                    {getMinPriceDisplay(banner.min_price)}
                                                </span>
                                            )}
                                            <Button 
                                                onClick={() => navigate(banner.event_id ? `/events/${banner.event_id}` : banner.link_url || '/')}
                                                className="w-full sm:w-auto bg-yellow-500 text-black hover:bg-yellow-600 px-8 py-3 text-base sm:text-lg font-semibold transition-all duration-300 cursor-pointer hover:scale-105"
                                            >
                                                {banner.type === 'event' ? 'Ver Detalhes' : 'Saiba Mais'}
                                            </Button>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </SwiperSlide>
                ))}
            </Swiper>
        </div>
    );
};

export default EventCarousel;