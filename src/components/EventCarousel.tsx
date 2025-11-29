"use client";

import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import useEmblaCarousel, { EmblaCarouselType } from 'embla-carousel-react';
import { Card, CardContent } from "@/components/ui/card";
import { PublicEvent } from '@/hooks/use-public-events';
import { Button } from '@/components/ui/button';
import { ArrowRight, ChevronLeft, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';

interface EventCarouselProps {
    events: PublicEvent[];
}

const AUTOPLAY_DELAY = 6000; // 6 segundos
const MAX_FEATURED_EVENTS = 7; // Limita a 7 eventos conforme solicitado

// Helper function to get the minimum price display
const getMinPriceDisplay = (price: number | null): string => {
    if (price === null || price === 0) return 'Grátis';
    // Formata para R$ X.XX, usando vírgula como separador decimal
    return `R$ ${price.toFixed(2).replace('.', ',')}`;
};

// Componente para o Slide de Evento
const EventSlide: React.FC<{ event: PublicEvent, isCentral: boolean, onClick: () => void }> = ({ event, isCentral, onClick }) => {
    const minPriceDisplay = getMinPriceDisplay(event.min_price);
    
    return (
        <Card 
            className={cn(
                "bg-black/60 backdrop-blur-sm border rounded-2xl overflow-hidden h-full cursor-pointer transition-all duration-500 ease-in-out",
                isCentral 
                    ? "border-yellow-500/80 shadow-2xl shadow-yellow-500/30 scale-100" 
                    : "border-yellow-500/20 shadow-md scale-[0.95] opacity-70 hover:opacity-90"
            )}
            onClick={onClick}
            style={{ height: '380px' }} // Altura fixa conforme solicitado
        >
            <CardContent className="flex flex-col p-0 h-full">
                <div className="relative h-full overflow-hidden">
                    <img
                        src={event.image_url}
                        alt={event.title}
                        className="w-full h-full object-cover object-center transition-transform duration-500"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/50 to-transparent p-6 flex flex-col justify-end">
                        <span className="bg-yellow-500 text-black px-3 py-1 rounded-full text-xs font-semibold mb-2 self-start">
                            {event.category}
                        </span>
                        <h3 className={cn(
                            "font-serif text-white line-clamp-2 transition-colors",
                            isCentral ? "text-2xl sm:text-3xl" : "text-xl sm:text-2xl text-gray-200"
                        )}>
                            {event.title}
                        </h3>
                        <div className="flex justify-between items-center pt-3 mt-2 border-t border-yellow-500/20">
                            <div className="flex flex-col">
                                <span className="text-sm text-gray-400">A partir de</span>
                                <span className="text-xl font-bold text-yellow-500 whitespace-nowrap">
                                    {minPriceDisplay}
                                
                                </span>
                            </div>
                            <Button 
                                variant="default" 
                                className="bg-yellow-500 text-black hover:bg-yellow-600 px-4 py-2 text-xs"
                                onClick={(e) => {
                                    e.stopPropagation();
                                    onClick();
                                }}
                            >
                                Detalhes <ArrowRight className="h-3 w-3 ml-1" />
                            </Button>
                        </div>
                    </div>
                </div>
            </CardContent>
        </Card>
    );
};


const EventCarousel = ({ events }: EventCarouselProps) => {
    const navigate = useNavigate();
    
    // Limita a 7 eventos
    const featuredEvents = events.slice(0, MAX_FEATURED_EVENTS);

    const [emblaRef, emblaApi] = useEmblaCarousel({ 
        loop: true,
        align: 'center', // Alinha ao centro para o efeito de destaque
        slidesToScroll: 1,
        watchDrag: true,
    });
    const [selectedIndex, setSelectedIndex] = useState(0);
    const [scrollSnaps, setScrollSnaps] = useState<number[]>([]);
    const [prevBtnDisabled, setPrevBtnDisabled] = useState(true);
    const [nextBtnDisabled, setNextBtnDisabled] = useState(true);

    // --- Lógica de Auto-Play ---
    const autoplay = useCallback(() => {
        if (!emblaApi) return;
        emblaApi.scrollNext();
    }, [emblaApi]);

    useEffect(() => {
        if (!emblaApi) return;

        const timer = setInterval(autoplay, AUTOPLAY_DELAY);

        return () => {
            clearInterval(timer);
        };
    }, [emblaApi, autoplay]);

    // --- Lógica de Navegação e Indicadores ---
    const onSelect = useCallback((emblaApi: EmblaCarouselType) => {
        setSelectedIndex(emblaApi.selectedScrollSnap());
        setPrevBtnDisabled(!emblaApi.canScrollPrev());
        setNextBtnDisabled(!emblaApi.canScrollNext());
    }, []);

    const onInit = useCallback((emblaApi: EmblaCarouselType) => {
        setScrollSnaps(emblaApi.scrollSnapList());
    }, []);

    useEffect(() => {
        if (!emblaApi) return;
        onInit(emblaApi);
        onSelect(emblaApi);
        emblaApi.on('reInit', onInit);
        emblaApi.on('select', onSelect);
    }, [emblaApi, onInit, onSelect]);

    const scrollTo = useCallback((index: number) => {
        emblaApi && emblaApi.scrollTo(index);
    }, [emblaApi]);
    
    const scrollPrev = useCallback(() => {
        emblaApi && emblaApi.scrollPrev();
    }, [emblaApi]);

    const scrollNext = useCallback(() => {
        emblaApi && emblaApi.scrollNext();
    }, [emblaApi]);

    const handleEventClick = (event: PublicEvent) => {
        navigate(`/finalizar-compra`, { state: { eventId: event.id } });
    };


    if (featuredEvents.length === 0) {
        return (
            <div className="flex items-center justify-center h-full bg-black/60 border border-yellow-500/30 rounded-2xl shadow-2xl shadow-yellow-500/20">
                <div className="text-center p-8">
                    <i className="fas fa-star text-yellow-500 text-4xl mb-4"></i>
                    <h2 className="text-xl sm:text-2xl font-serif text-white mb-2">Destaques Premium</h2>
                    <p className="text-gray-400 text-sm">Nenhum evento em destaque encontrado.</p>
                </div>
            </div>
        );
    }
    
    // Calcula a distância de cada slide para o slide central (selectedIndex)
    const getSlideDistance = (index: number) => {
        if (!emblaApi || !emblaApi.options) return 0;
        const totalSlides = featuredEvents.length;
        
        // Calcula a diferença absoluta
        let diff = Math.abs(index - selectedIndex);
        
        // Ajusta para loop (distância circular)
        if (emblaApi.options.loop) {
            diff = Math.min(diff, totalSlides - diff);
        }
        
        // Limita a distância máxima para 3 (para o efeito visual)
        return Math.min(diff, 3);
    };

    return (
        <div className="relative pt-4 pb-10">
            <div className="overflow-hidden" ref={emblaRef}>
                <div className="flex touch-pan-y">
                    {featuredEvents.map((event, index) => {
                        const distance = getSlideDistance(index);
                        const isCentral = index === selectedIndex;
                        
                        // Ajuste de Largura: Central 550px, Laterais 350px
                        const slideWidth = isCentral ? '550px' : '350px';
                        
                        // Define a profundidade (z-index) e a transformação de escala/opacidade
                        let zIndex = 10 - distance;
                        let opacity = 1;
                        let scale = 1;
                        
                        if (!isCentral) {
                            // Escala e opacidade decrescem mais agressivamente
                            scale = 1 - (distance * 0.1); // 0.9, 0.8, etc.
                            opacity = 1 - (distance * 0.3); // 0.7, 0.4, etc.
                            zIndex = 10 - distance;
                        }
                        
                        // Ajusta a largura do slide para o efeito de empilhamento
                        const slideStyle = {
                            flex: `0 0 ${slideWidth}`,
                            minWidth: slideWidth,
                            maxWidth: slideWidth,
                            // Reduz o margin para que os slides se sobreponham mais
                            margin: '0 5px', 
                            zIndex: zIndex,
                            opacity: opacity,
                            transform: `scale(${scale})`,
                            transition: 'all 0.5s ease-in-out',
                        };

                        return (
                            <div 
                                key={event.id} 
                                className="flex-shrink-0 min-w-0"
                                style={slideStyle}
                            >
                                <EventSlide 
                                    event={event} 
                                    isCentral={isCentral} 
                                    onClick={() => handleEventClick(event)}
                                />
                            </div>
                        );
                    })}
                </div>
            </div>
            
            {/* Setas de Navegação Customizadas */}
            <Button
                variant="outline"
                className="absolute left-0 top-1/2 transform -translate-y-1/2 z-20 text-yellow-500 border-yellow-500 hover:bg-yellow-500/10 w-12 h-12 p-0 rounded-full hidden md:flex"
                onClick={scrollPrev}
                disabled={featuredEvents.length <= 1}
            >
                <ChevronLeft className="h-6 w-6" />
            </Button>
            <Button
                variant="outline"
                className="absolute right-0 top-1/2 transform -translate-y-1/2 z-20 text-yellow-500 border-yellow-500 hover:bg-yellow-500/10 w-12 h-12 p-0 rounded-full hidden md:flex"
                onClick={scrollNext}
                disabled={featuredEvents.length <= 1}
            >
                <ChevronRight className="h-6 w-6" />
            </Button>

            {/* Indicadores (Bolinhas) */}
            <div className="absolute bottom-0 left-0 right-0 flex justify-center space-x-2 z-10">
                {scrollSnaps.map((_, index) => (
                    <button
                        key={index}
                        onClick={() => scrollTo(index)}
                        className={cn(
                            "w-3 h-3 rounded-full transition-all duration-300",
                            index === selectedIndex ? "bg-yellow-500 w-6" : "bg-gray-500/50 hover:bg-yellow-500/50"
                        )}
                    />
                ))}
            </div>
        </div>
    );
};

export default EventCarousel;