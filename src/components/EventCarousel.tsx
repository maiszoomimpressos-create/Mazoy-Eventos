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
import { cn } from '@/lib/utils'; // Importando cn para classes condicionais

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
    const [activeIndex, setActiveIndex] = useState(0); // Estado para rastrear o slide ativo

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

                // A Edge Function retorna 'events' ou 'banners' dependendo da versão. 
                // Vamos normalizar para 'banners'
                const fetchedBanners = data.banners || data.events || [];
                
                // Mapeamento para garantir que os dados de evento simulados se encaixem na interface CarouselBanner
                const normalizedBanners: CarouselBanner[] = fetchedBanners.map((item: any) => ({
                    id: item.id,
                    type: item.type || 'event', // Assume 'event' se não especificado
                    image_url: item.image_url,
                    headline: item.headline || item.title,
                    subheadline: item.subheadline || item.description,
                    category: item.category,
                    min_price: item.min_price,
                    location: item.location,
                    date: item.date,
                    time: item.time,
                    link_url: item.link_url,
                    event_id: item.event_id || item.id,
                }));

                setBanners(normalizedBanners);

            } catch (error: any) {
                console.error("Error fetching carousel banners:", error);
                showError(`Falha ao carregar banners do carrossel: ${error.message || 'Erro desconhecido'}`);
            } finally {
                setIsLoading(false);
            }
        };

        fetchCarouselBanners();
    }, [userId, userLocation]);

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
    
    const activeBanner = banners[activeIndex];

    return (
        <div className="relative w-full h-[500px] md:h-[600px] lg:h-[700px] overflow-hidden">
            <Swiper
                onSlideChange={(swiper) => setActiveIndex(swiper.activeIndex)}
                slidesPerView={'auto'} // Permite que o Swiper calcule o número de slides visíveis
                centeredSlides={true} // Centraliza o slide ativo
                spaceBetween={30} // Espaçamento entre os slides
                autoplay={{
                    delay: 5000,
                    disableOnInteraction: false,
                }}
                pagination={{
                    clickable: true,
                }}
                navigation={true}
                modules={[Autoplay, Pagination, Navigation]}
                className="mySwiper w-full h-full event-carousel-perspective" // Adicionando classe para estilos de perspectiva
            >
                {banners.map((banner, index) => (
                    <SwiperSlide key={banner.id} className="event-slide-item">
                        {({ isActive }) => (
                            <div 
                                className={cn(
                                    "relative w-full h-full rounded-2xl overflow-hidden shadow-2xl transition-all duration-500",
                                    isActive ? "scale-100 opacity-100 shadow-yellow-500/30" : "scale-90 opacity-70 shadow-none"
                                )}
                                onClick={() => navigate(banner.event_id ? `/events/${banner.event_id}` : banner.link_url || '/')}
                            >
                                <img
                                    src={banner.image_url}
                                    alt={banner.headline}
                                    className="w-full h-full object-cover object-center"
                                />
                                {/* Overlay escuro com gradiente */}
                                <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/70 to-black/40"></div>
                                
                                <div className="absolute inset-0 flex items-end pb-10 pt-20">
                                    <div className="px-6 w-full">
                                        <div className="max-w-full">
                                            {/* Título do Carrossel */}
                                            <h2 className="text-2xl sm:text-4xl font-serif text-white mb-2 leading-tight drop-shadow-lg line-clamp-2">
                                                {banner.headline}
                                            </h2>
                                            
                                            {/* Subtítulo do Carrossel */}
                                            <p className="text-sm sm:text-base text-gray-200 mb-4 leading-relaxed line-clamp-2 drop-shadow-md">
                                                {banner.subheadline}
                                            </p>
                                            
                                            {/* Botão (Apenas no slide ativo) */}
                                            {isActive && (
                                                <Button 
                                                    className="w-full sm:w-auto bg-yellow-500 text-black hover:bg-yellow-600 px-6 py-2 text-sm sm:text-base font-semibold transition-all duration-300 cursor-pointer hover:scale-105"
                                                >
                                                    {banner.type === 'event' ? 'Ver Detalhes' : 'Saiba Mais'}
                                                </Button>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}
                    </SwiperSlide>
                ))}
            </Swiper>
            
            {/* Detalhes do Evento Ativo (abaixo do carrossel) */}
            {activeBanner && (
                <div className="mt-8 text-center animate-fadeInUp">
                    <h3 className="text-xl font-semibold text-white mb-2">{activeBanner.headline}</h3>
                    {activeBanner.type === 'event' && (
                        <div className="flex items-center justify-center space-x-6 text-gray-400 text-sm">
                            <div className="flex items-center">
                                <i className="fas fa-map-marker-alt mr-2 text-yellow-500"></i>
                                <span>{activeBanner.location}</span>
                            </div>
                            <div className="flex items-center">
                                <i className="fas fa-calendar-alt mr-2 text-yellow-500"></i>
                                <span>{activeBanner.date}</span>
                            </div>
                            <div className="flex items-center">
                                <i className="fas fa-clock mr-2 text-yellow-500"></i>
                                <span>{activeBanner.time}</span>
                            </div>
                        </div>
                    )}
                    {activeBanner.type === 'event' && activeBanner.min_price !== null && (
                        <p className="text-2xl font-bold text-yellow-500 mt-3">
                            A partir de {getMinPriceDisplay(activeBanner.min_price)}
                        </p>
                    )}
                </div>
            )}
        </div>
    );
};

export default EventCarousel;