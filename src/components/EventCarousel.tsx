"use client";

import React, { useEffect, useState, useCallback } from 'react';
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
    const [activeIndex, setActiveIndex] = useState(0); // Current index for the main card
    const [isTransitioning, setIsTransitioning] = useState(false); // State to manage image fade

    // Fetch carousel settings
    const { data: settings, isLoading: isLoadingSettings } = useQuery({
        queryKey: ['carouselSettings'],
        queryFn: fetchCarouselSettings,
        staleTime: 1000 * 60 * 5,
    });

    // Geolocation logic (omitted for brevity, assuming it works)
    useEffect(() => {
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
                    setUserLocation(null);
                },
                { enableHighAccuracy: false, timeout: 5000, maximumAge: 0 }
            );
        } else if (settings && settings.regional_distance_km === 0) {
            setUserLocation(null);
        }
    }, [settings]);

    // Fetch banners logic (omitted for brevity, assuming it works)
    useEffect(() => {
        if (isLoadingSettings || !settings) return;

        const fetchCarouselBanners = async () => {
            setIsLoadingBanners(true);
            try {
                const token = (await supabase.auth.getSession()).data.session?.access_token;
                
                let locationPayload = {};
                
                if (settings.regional_distance_km > 0 && userLocation) {
                    locationPayload = {
                        user_latitude: userLocation.latitude,
                        user_longitude: userLocation.longitude,
                    };
                }
                
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
                setActiveIndex(0);

            } catch (error: any) {
                console.error("Error fetching carousel banners:", error);
                showError(`Falha ao carregar banners do carrossel: ${error.message || 'Erro desconhecido'}`);
            } finally {
                setIsLoadingBanners(false);
            }
        };

        if (settings) {
            fetchCarouselBanners();
        }
    }, [userId, userLocation, settings, isLoadingSettings]);

    // --- Custom Carousel Logic ---

    const rotationTime = settings?.rotation_time_seconds || 5;

    const updateIndex = useCallback((newIndex: number) => {
        if (isTransitioning) return;
        
        // Ensure index wraps around
        const normalizedIndex = (newIndex % banners.length + banners.length) % banners.length;

        setIsTransitioning(true);
        setTimeout(() => {
            setActiveIndex(normalizedIndex);
            setIsTransitioning(false);
        }, 300); // Match the CSS transition time for opacity
    }, [isTransitioning, banners.length]);

    // Auto-rotation effect
    useEffect(() => {
        if (banners.length === 0 || isLoadingBanners) return;

        const interval = setInterval(() => {
            updateIndex((activeIndex + 1) % banners.length);
        }, rotationTime * 1000);

        return () => clearInterval(interval);
    }, [banners, rotationTime, isLoadingBanners, activeIndex, updateIndex]);

    const handleCardClick = (banner: CarouselBanner) => {
        if (banner.type === 'event' && banner.event_id) {
            navigate(`/events/${banner.event_id}`);
        } else if (banner.link_url) {
            window.open(banner.link_url, '_blank');
        } else {
            navigate('/');
        }
    };
    
    const handlePaginationClick = (index: number) => {
        if (index !== activeIndex) {
            updateIndex(index);
        }
    };
    
    // Helper function to get the indices for the 6 layers behind
    const getBehindIndices = () => {
        if (banners.length === 0) return [];
        const indices = [];
        // Layers 1, 2, 3 (left side) and 4, 5, 6 (right side)
        for (let i = 1; i <= 6; i++) {
            indices.push((activeIndex + i) % banners.length);
        }
        return indices;
    };

    const behindIndices = getBehindIndices();

    // --- Rendering Logic ---

    if (isLoadingSettings || isLoadingBanners) {
        return (
            <div className="w-full h-[440px] bg-black/60 flex items-center justify-center rounded-2xl max-w-4xl mx-auto">
                <Loader2 className="h-10 w-10 animate-spin text-yellow-500" />
            </div>
        );
    }

    if (banners.length === 0) {
        return (
            <div className="w-full h-[440px] bg-black/60 border border-yellow-500/30 rounded-2xl flex items-center justify-center text-center p-4 max-w-4xl mx-auto">
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
        <div className="carousel-wrapper">
            
            {/* Camadas Atrás (Efeito Cascata/Profundidade) */}
            <div className="behind-area" id="behindArea">
                {behindIndices.map((index, i) => {
                    const banner = banners[index];
                    const className = `behind b${i + 1}`;
                    
                    return (
                        <div 
                            key={banner.id + i} 
                            className={className} 
                            style={{ 
                                backgroundImage: `url(${banner.image_url})`,
                                backgroundColor: '#111', 
                            }}
                        >
                        </div>
                    );
                })}
            </div>

            {/* Card Central */}
            <div 
                className="main cursor-pointer"
                onClick={() => handleCardClick(activeBanner)}
            >
                <img 
                    src={activeBanner.image_url} 
                    alt={activeBanner.headline} 
                    style={{ opacity: isTransitioning ? 0 : 1 }} 
                />
                
                {/* Conteúdo do Banner */}
                <div className="card-content">
                    <div className="card-title">
                        {activeBanner.headline}
                    </div>
                    <div className="card-sub">
                        {activeBanner.subheadline}
                    </div>
                    
                    {activeBanner.type === 'event' && activeBanner.min_price !== null && (
                        <p className="text-xl font-bold text-yellow-500 mb-4 drop-shadow-lg">
                            A partir de {getMinPriceDisplay(activeBanner.min_price)}
                        </p>
                    )}
                    
                    <div className="btn-custom">
                        {activeBanner.type === 'event' ? 'Ver Detalhes' : 'Saiba Mais'}
                    </div>
                </div>
            </div>
            
            {/* Paginação (Bolinhas) - Centralizada */}
            <div className="absolute bottom-0 z-30 flex space-x-2 mb-4">
                {banners.map((_, index) => (
                    <button
                        key={index}
                        onClick={() => handlePaginationClick(index)}
                        className={cn(
                            "w-3 h-3 rounded-full transition-colors duration-300",
                            index === activeIndex ? "bg-yellow-500" : "bg-gray-600 hover:bg-gray-400"
                        )}
                        disabled={isTransitioning}
                    />
                ))}
            </div>
        </div>
    );
};

export default EventCarousel;