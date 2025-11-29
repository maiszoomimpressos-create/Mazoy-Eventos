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

// Interface para os dados do evento retornados pela Edge Function
interface CarouselEvent {
    id: string;
    title: string;
    description: string;
    image_url: string;
    carousel_headline: string;
    carousel_subheadline: string;
    category: string;
    min_price: number | null;
    location: string;
    date: string;
    time: string;
}

interface EventCarouselProps {
    userId: string | undefined;
}

const getMinPriceDisplay = (price: number | null): string => {
    if (price === null || price === 0) return 'Grátis';
    return `R$ ${price.toFixed(2).replace('.', ',')}`;
};

const EventCarousel: React.FC<EventCarouselProps> = ({ userId }) => {
    const navigate = useNavigate();
    const [events, setEvents] = useState<CarouselEvent[]>([]);
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
        const fetchCarouselEvents = async () => {
            setIsLoading(true);
            try {
                const token = (await supabase.auth.getSession()).data.session?.access_token;
                if (!token) {
                    // Se não houver token, a Edge Function ainda pode retornar eventos públicos
                    console.warn("No session token found for carousel events. Fetching public events.");
                }

                const payload = {
                    user_id: userId,
                    user_latitude: userLocation?.latitude,
                    user_longitude: userLocation?.longitude,
                };

                const { data, error } = await supabase.functions.invoke('fetch-carousel-events', {
                    body: payload,
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

                setEvents(data.events || []);

            } catch (error: any) {
                console.error("Error fetching carousel events:", error);
                showError(`Falha ao carregar banners do carrossel: ${error.message || 'Erro desconhecido'}`);
            } finally {
                setIsLoading(false);
            }
        };

        fetchCarouselEvents();
    }, [userId, userLocation]); // Refetch quando userId ou userLocation mudarem

    if (isLoading) {
        return (
            <div className="w-full h-[400px] md:h-[500px] lg:h-[600px] bg-black/60 flex items-center justify-center rounded-2xl">
                <Loader2 className="h-10 w-10 animate-spin text-yellow-500" />
            </div>
        );
    }

    if (events.length === 0) {
        return (
            <div className="w-full h-[400px] md:h-[500px] lg:h-[600px] bg-black/60 border border-yellow-500/30 rounded-2xl flex items-center justify-center text-center p-4">
                <div className="text-gray-400">
                    <SlidersHorizontal className="h-12 w-12 mx-auto mb-4 text-gray-600" />
                    <p className="text-lg">Nenhum evento em destaque no carrossel.</p>
                    <p className="text-sm mt-2">Verifique as configurações do carrossel ou cadastre eventos em destaque.</p>
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
                {events.map((event) => (
                    <SwiperSlide key={event.id}>
                        <div className="relative w-full h-full">
                            <img
                                src={event.image_url}
                                alt={event.title}
                                className="w-full h-full object-cover object-center"
                            />
                            {/* Overlay escuro com gradiente */}
                            <div className="absolute inset-0 bg-gradient-to-r from-black/90 via-black/70 to-black/40"></div>
                            
                            <div className="absolute inset-0 flex items-end pb-16 pt-20">
                                <div className="max-w-7xl mx-auto px-4 sm:px-6 w-full">
                                    <div className="max-w-full lg:max-w-4xl">
                                        {/* Título do Carrossel */}
                                        <h2 className="text-4xl sm:text-6xl lg:text-7xl font-serif text-white mb-4 sm:mb-6 leading-tight drop-shadow-lg">
                                            {event.carousel_headline || event.title}
                                        </h2>
                                        
                                        {/* Subtítulo do Carrossel */}
                                        <p className="text-base sm:text-xl text-gray-200 mb-6 sm:mb-10 leading-relaxed line-clamp-3 drop-shadow-md">
                                            {event.carousel_subheadline || event.description}
                                        </p>
                                        
                                        {/* Detalhes (Data, Horário, Local) */}
                                        <div className="flex flex-wrap gap-x-10 gap-y-4 mb-8 sm:mb-12">
                                            <div className="flex items-center">
                                                <i className="fas fa-calendar-alt text-yellow-500 text-2xl mr-3"></i>
                                                <div>
                                                    <div className="text-xs text-gray-400">Data</div>
                                                    <div className="text-lg font-bold text-white">{event.date}</div>
                                                </div>
                                            </div>
                                            <div className="flex items-center">
                                                <i className="fas fa-clock text-yellow-500 text-2xl mr-3"></i>
                                                <div>
                                                    <div className="text-xs text-gray-400">Horário</div>
                                                    <div className="text-lg font-bold text-white">{event.time}</div>
                                                </div>
                                            </div>
                                            <div className="flex items-center">
                                                <i className="fas fa-map-marker-alt text-yellow-500 text-2xl mr-3"></i>
                                                <div>
                                                    <div className="text-xs text-gray-400">Local</div>
                                                    <div className="text-lg font-bold text-white">{event.location}</div>
                                                </div>
                                            </div>
                                        </div>
                                        
                                        {/* Preço e Botão */}
                                        <div className="flex flex-col sm:flex-row items-start sm:items-center space-y-4 sm:space-y-0 sm:space-x-6">
                                            <span className="text-3xl sm:text-4xl font-bold text-yellow-500">
                                                {getMinPriceDisplay(event.min_price)}
                                            </span>
                                            <Button 
                                                onClick={() => navigate(`/events/${event.id}`)}
                                                className="w-full sm:w-auto bg-yellow-500 text-black hover:bg-yellow-600 px-8 py-3 text-base sm:text-lg font-semibold transition-all duration-300 cursor-pointer hover:scale-105"
                                            >
                                                Ver Detalhes
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