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

const MAX_FEATURED_EVENTS = 7; // Definindo a constante

// Dimensões fixas
const SLIDE_WIDTH = 550;
const SLIDE_HEIGHT = 380;
// Removendo PEEK_WIDTH

// Helper function to get the minimum price display
const getMinPriceDisplay = (price: number | null): string => {
    if (price === null || price === 0) return 'Grátis';
    return `R$ ${price.toFixed(2).replace('.', ',')}`;
};

// Componente para o Slide de Evento
const EventSlide: React.FC<{ event: PublicEvent, onClick: () => void, slideIndex: number, customStyle: React.CSSProperties }> = ({ event, onClick, slideIndex, customStyle }) => {
    const minPriceDisplay = getMinPriceDisplay(event.min_price);
    
    return (
        <Card 
            className={cn(
                "bg-black/60 backdrop-blur-sm border rounded-2xl overflow-hidden h-full cursor-pointer transition-all duration-500 ease-in-out relative",
                "border-yellow-500/80 shadow-2xl shadow-yellow-500/30"
            )}
            onClick={onClick}
            style={{ 
                height: `${SLIDE_HEIGHT}px`, 
                width: `${SLIDE_WIDTH}px`,
                ...customStyle // Aplica o estilo customizado dinâmico
            }} 
        >
            <div className="absolute top-4 left-4 z-30 bg-black/70 text-white px-3 py-1 rounded-full text-sm font-bold border border-yellow-500">
                {slideIndex}
            </div>
            <div className="absolute top-4 right-4 z-30 bg-black/70 text-white px-3 py-1 rounded-full text-sm font-bold border border-yellow-500">
                {slideIndex}
            </div>
            
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
                            "text-2xl sm:text-3xl"
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
    
    // 1. Limita a 7 eventos e mantém a ordem original
    const featuredEvents = events.slice(0, MAX_FEATURED_EVENTS);

    const [emblaRef, emblaApi] = useEmblaCarousel({ 
        loop: false, 
        align: 'center', 
        slidesToScroll: 1,
        watchDrag: true,
        // Removendo padding para não mostrar slides adjacentes
    });
    
    const [selectedIndex, setSelectedIndex] = useState(0);
    const [scrollSnaps, setScrollSnaps] = useState<number[]>([]);
    const [slideStyles, setSlideStyles] = useState<React.CSSProperties[]>([]);

    // --- Lógica de Estilo Dinâmico (Simplificada) ---
    const updateSlideStyles = useCallback((emblaApi: EmblaCarouselType) => {
        const styles: React.CSSProperties[] = [];
        const currentSnap = emblaApi.selectedScrollSnap();
        
        emblaApi.slideNodes().forEach((slide, index) => {
            let scale = 0.9;
            let opacity = 0.6;
            let zIndex = 10;
            let translateX = '0'; 

            // Slide Central
            if (index === currentSnap) {
                scale = 1;
                opacity = 1;
                zIndex = 30;
            } 
            // Slides adjacentes e distantes
            else {
                scale = 0.9;
                opacity = 0.6;
                zIndex = 10;
            }
            
            styles.push({
                // Aplicamos apenas scale e zIndex. Removemos a translação customizada.
                transform: `scale(${scale})`,
                opacity: opacity,
                zIndex: zIndex,
                transition: 'transform 0.5s ease-in-out, opacity 0.5s ease-in-out',
            });
        });
        setSlideStyles(styles);
    }, [featuredEvents.length]);


    // --- Lógica de Navegação e Indicadores ---
    const onSelect = useCallback((emblaApi: EmblaCarouselType) => {
        setSelectedIndex(emblaApi.selectedScrollSnap());
        updateSlideStyles(emblaApi); 
    }, [updateSlideStyles]);

    const onInit = useCallback((emblaApi: EmblaCarouselType) => {
        setScrollSnaps(emblaApi.scrollSnapList());
        updateSlideStyles(emblaApi); 
    }, [updateSlideStyles]);

    useEffect(() => {
        if (!emblaApi) return;
        onInit(emblaApi);
        onSelect(emblaApi);
        emblaApi.on('reInit', onInit);
        emblaApi.on('select', onSelect);
        emblaApi.on('scroll', updateSlideStyles); 
    }, [emblaApi, onInit, onSelect, updateSlideStyles]);

    const scrollTo = useCallback((index: number) => {
        emblaApi && emblaApi.scrollTo(index);
    }, [emblaApi]);
    
    const handleEventClick = (event: PublicEvent) => {
        navigate(`/finalizar-compra`, { state: { eventId: event.id } });
    };


    if (featuredEvents.length === 0) {
        return (
            <div className="flex items-center justify-center h-full bg-black/60 border border-yellow-500/30 rounded-2xl shadow-2xl shadow-yellow-500/20" style={{ height: `${SLIDE_HEIGHT}px` }}>
                <div className="text-center p-8">
                    <i className="fas fa-star text-yellow-500 text-4xl mb-4"></i>
                    <h2 className="text-xl sm:text-2xl font-serif text-white mb-2">Destaques Premium</h2>
                    <p className="text-gray-400 text-sm">Nenhum evento em destaque encontrado.</p>
                </div>
            </div>
        );
    }
    
    return (
        <div className="relative pt-4 pb-10">
            <div className="overflow-hidden" ref={emblaRef}>
                <div className="flex touch-pan-y">
                    {featuredEvents.map((event, index) => {
                        
                        // Estilo para limitar a largura do slide e centralizar
                        const slideContainerStyle = {
                            // Ocupa a largura do slide (550px)
                            flex: `0 0 ${SLIDE_WIDTH}px`, 
                            minWidth: `${SLIDE_WIDTH}px`,
                            maxWidth: `${SLIDE_WIDTH}px`,
                            display: 'flex',
                            justifyContent: 'center', // Centraliza o conteúdo dentro do slide
                            // Removendo margens de compensação
                            marginLeft: '0',
                            marginRight: '0',
                        };
                        
                        // Estilo para o slide em si (largura fixa)
                        const slideStyle = {
                            width: `${SLIDE_WIDTH}px`,
                            maxWidth: '100%', 
                            margin: '0', 
                        };

                        return (
                            <div 
                                key={event.id} 
                                className="flex-shrink-0 min-w-0"
                                style={slideContainerStyle}
                            >
                                <div style={slideStyle}>
                                    <EventSlide 
                                        event={event} 
                                        onClick={() => handleEventClick(event)}
                                        slideIndex={index + 1} 
                                        customStyle={slideStyles[index] || {}} // Aplica o estilo dinâmico
                                    />
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>
            
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
            
            {/* Botões de Navegação */}
            <button
                className="absolute top-1/2 left-0 transform -translate-y-1/2 p-3 bg-black/50 rounded-full text-yellow-500 hover:bg-black/80 transition-colors z-40 ml-4 disabled:opacity-30"
                onClick={() => emblaApi?.scrollPrev()}
                disabled={!emblaApi || emblaApi.canScrollPrev() === false}
            >
                <ChevronLeft className="h-6 w-6" />
            </button>
            <button
                className="absolute top-1/2 right-0 transform -translate-y-1/2 p-3 bg-black/50 rounded-full text-yellow-500 hover:bg-black/80 transition-colors z-40 mr-4 disabled:opacity-30"
                onClick={() => emblaApi?.scrollNext()}
                disabled={!emblaApi || emblaApi.canScrollNext() === false}
            >
                <ChevronRight className="h-6 w-6" />
            </button>
        </div>
    );
};

export default EventCarousel;