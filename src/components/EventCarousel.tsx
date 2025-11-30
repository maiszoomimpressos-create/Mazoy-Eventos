"use client";

import React, { useEffect, useState, useRef } from 'react';
import { Swiper, SwiperSlide } from 'swiper/react';
import { Pagination, Autoplay, EffectCoverflow } from 'swiper/modules'; // Importando EffectCoverflow
import 'swiper/css';
import 'swiper/css/pagination';
import 'swiper/css/effect-coverflow'; // Importando o CSS do efeito
import './EventCarousel.css';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { showError } from '@/utils/toast';
import { Loader2, SlidersHorizontal } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useQuery } from '@tanstack/react-query';

// Interface para os dados do banner retornados pela Edge Function
interface CarouselBanner {
    id: string;
    type: 'event' | 'promotional';
    image_url: string;
    headline: string;
    subheadline: string;
    category?: string;
    min_price?: number | null;
    location?: string;
    date?: string;
    time?: string;
    link_url?: string;
    event_id?: string;
}

interface CarouselSettings {
    rotation_time_seconds: number;
    regional_distance_km: number;
    max_banners_display: number;
}

interface EventCarouselProps {
    userId: string | undefined;
}

const fetchCarouselSettings = async (): Promise<CarouselSettings> => {
    const { data, error } = await supabase
        .from('carousel_settings')
        .select('rotation_time_seconds, regional_distance_km, max_banners_display')
        .limit(1)
        .single();

    if (error && error.code !== 'PGRST116') {
        console.error("Error fetching carousel settings:", error);
        throw error;
    }
    
    return data || { rotation_time_seconds: 5, regional_distance_km: 100, max_banners_display: 5 };
};

const getMinPriceDisplay = (price: number | null | undefined): string => {
    if (price === null || price === undefined || price === 0) return 'Grátis';
    return `R$ ${price.toFixed(2).replace('.', ',')}`;
};

const EventCarousel: React.FC<EventCarouselProps> = ({ userId }) => {
    const navigate = useNavigate();
    const [banners, setBanners] = useState<CarouselBanner[]>([]);
    const [isLoadingBanners, setIsLoadingBanners] = useState(true);
    const [userLocation, setUserLocation] = useState<{ latitude: number; longitude: number } | null>(null);
    const [activeIndex, setActiveIndex] = useState(0);
    const swiperRef = useRef<any>(null); // Ref to store Swiper instance

    // Busca as configurações do carrossel
    const { data: settings, isLoading: isLoadingSettings } = useQuery({
        queryKey: ['carouselSettings'],
        queryFn: fetchCarouselSettings,
        staleTime: 1000 * 60 * 5, // 5 minutes
    });

    useEffect(() => {
        // 1. Tenta obter a localização do usuário APENAS se a distância regional for > 0
        if (settings && settings.regional_distance_km > 0 && navigator.geolocation) {
            navigator.geolocation.getCurrentPosition(
                (position) => {
                    setUserLocation({
                        latitude: position.coords.latitude,
                        longitude: position.coords.longitude,
                    });
                },
                (error) => {
                    console.warn("Geolocation error:", error);
                    setUserLocation(null); // Garante que a localização seja nula se houver erro
                },
                { enableHighAccuracy: false, timeout: 5000, maximumAge: 0 }
            );
        } else if (settings && settings.regional_distance_km === 0) {
            setUserLocation(null); // Se a distância for 0, não precisamos da localização
        }
    }, [settings]);

    useEffect(() => {
        if (isLoadingSettings || !settings) return;

        const fetchCarouselBanners = async () => {
            setIsLoadingBanners(true);
            try {
                const token = (await supabase.auth.getSession()).data.session?.access_token;
                
                let locationPayload = {};
                
                // Se a distância regional for > 0 E tivermos a localização do usuário, enviamos a localização
                if (settings.regional_distance_km > 0 && userLocation) {
                    locationPayload = {
                        user_latitude: userLocation.latitude,
                        user_longitude: userLocation.longitude,
                    };
                }
                
                // A Edge Function agora recebe a localização APENAS se for relevante (distância > 0)
                const { data, error } = await supabase.functions.invoke('fetch-carousel-events', {
                    body: {
                        user_id: userId,
                        ...locationPayload,
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

                const fetchedBanners = data.banners || data.events || [];
                
                const normalizedBanners: CarouselBanner[] = fetchedBanners.map((item: any) => ({
                    id: item.id,
                    type: item.type || 'event',
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
                
                // Define o slide inicial para o Banner 4 (índice 3)
                if (normalizedBanners.length >= 4) {
                    setActiveIndex(3);
                }


            } catch (error: any) {
                console.error("Error fetching carousel banners:", error);
                showError(`Falha ao carregar banners do carrossel: ${error.message || 'Erro desconhecido'}`);
            } finally {
                setIsLoadingBanners(false);
            }
        };

        // Só busca os banners se as configurações estiverem carregadas
        if (settings) {
            fetchCarouselBanners();
        }
    }, [userId, userLocation, settings, isLoadingSettings]);

    // Removendo a função applyStaircaseEffect customizada, pois usaremos EffectCoverflow

    if (isLoadingSettings || isLoadingBanners) {
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
                onSwiper={(swiper) => {
                    swiperRef.current = swiper;
                }}
                onSlideChange={(swiper) => setActiveIndex(swiper.activeIndex)}
                slidesPerView={'auto'}
                centeredSlides={true}
                spaceBetween={0}
                initialSlide={banners.length >= 4 ? 3 : 0}
                loop={true}
                pagination={{
                    clickable: true,
                }}
                autoplay={false}
                navigation={false}
                
                // Configuração do EffectCoverflow para criar o efeito de escadinha vertical
                effect={'coverflow'}
                grabCursor={true}
                modules={[Pagination, Autoplay, EffectCoverflow]}
                coverflowEffect={{
                    rotate: 0, // Sem rotação horizontal
                    stretch: 0, // Sem estiramento
                    depth: 100, // Profundidade (para o efeito 3D)
                    modifier: 1,
                    slideShadows: false,
                }}
                className="mySwiper w-full h-full event-carousel-perspective"
            >
                {banners.map((banner, index) => (
                    <SwiperSlide key={banner.id} className="event-slide-item">
                        {({ isActive }) => (
                            <div 
                                className={cn(
                                    "relative w-full h-full rounded-2xl overflow-hidden transition-all duration-500",
                                    // Aplica sombra amarela sutil nos slides adjacentes
                                    isActive 
                                        ? "shadow-2xl shadow-yellow-500/30 border-2 border-yellow-500/50" 
                                        : "shadow-xl shadow-yellow-500/10 border border-yellow-500/20"
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