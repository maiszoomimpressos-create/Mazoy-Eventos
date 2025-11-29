"use client";

import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import useEmblaCarousel, { EmblaCarouselType } from 'embla-carousel-react';
import { Card, CardContent } from "@/components/ui/card";
import { PublicEvent } from '@/hooks/use-public-events';
import { Button } from '@/components/ui/button';
import { ArrowRight, ArrowLeft } from 'lucide-react'; // Importando ArrowLeft
import { cn } from '@/lib/utils';

interface EventCarouselProps {
    events: PublicEvent[];
}

const MAX_FEATURED_EVENTS = 7;

const SLIDE_WIDTH = 550; // Max width for the content card
const SLIDE_HEIGHT = 380;
// PEEK_AMOUNT não é mais necessário

const getMinPriceDisplay = (price: number | null): string => {
    if (price === null || price === 0) return 'Grátis';
    return `R$ ${price.toFixed(2).replace('.', ',')}`;
};

const EventSlide: React.FC<{ event: PublicEvent, onClick: () => void, slideIndex: number, customStyle: React.CSSProperties }> = ({ event, onClick, slideIndex, customStyle }) => {
    const minPriceDisplay = getMinPriceDisplay(event.min_price);
    
    return (
        <Card 
            className={cn(
                "bg-black/60 backdrop-blur-sm border rounded-2xl overflow-hidden h-full cursor-pointer relative",
                "border-yellow-500/80 shadow-2xl shadow-yellow-500/30"
            )}
            onClick={onClick}
            style={{ 
                height: `${SLIDE_HEIGHT}px`, 
                maxWidth: `${SLIDE_WIDTH}px`, 
                width: '100%', 
                ...customStyle
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
    
    const featuredEvents = events.slice(0, MAX_FEATURED_EVENTS);

    // Set initialScrollSnap to 3 to start with the 4th banner (index 3)
    const [emblaRef, emblaApi] = useEmblaCarousel({ 
        loop: false, 
        align: 'center', 
        slidesToScroll: 1,
        watchDrag: true,
        initialScrollSnap: 3, // Inicia no 4º slide (índice 3)
    });
    
    // Initialize selectedIndex to 3 to match the initialScrollSnap
    const [selectedIndex, setSelectedIndex] = useState(3); 
    const [scrollSnaps, setScrollSnaps] = useState<number[]>([]);
    const [slideStyles, setSlideStyles] = useState<React.CSSProperties[]>([]);
    const [prevBtnEnabled, setPrevBtnEnabled] = useState(false); // Estado para botão Anterior
    const [nextBtnEnabled, setNextBtnEnabled] = useState(false); // Estado para botão Próximo

    const updateSlideStyles = useCallback((emblaApi: EmblaCarouselType) => {
        const styles: React.CSSProperties[] = [];
        const currentSelectedIndex = emblaApi.selectedScrollSnap();

        emblaApi.slideNodes().forEach((slide, index) => {
            let scale = 0.95; // Escala padrão para slides inativos
            let opacity = 0.7; // Opacidade padrão para slides inativos
            let zIndex = 10; 
            let translateX = 0; 

            if (index === currentSelectedIndex) {
                scale = 1.05; // Aumenta o slide selecionado
                opacity = 1; // Totalmente opaco
                zIndex = 20; // Traz para frente
            }
            
            styles.push({
                transform: `scale(${scale}) translateX(${translateX}px)`,
                opacity: opacity,
                zIndex: zIndex,
                transition: 'transform 0.5s ease-in-out, opacity 0.5s ease-in-out',
            });
        });
        setSlideStyles(styles);
    }, [featuredEvents.length]);

    const onSelect = useCallback((emblaApi: EmblaCarouselType) => {
        setSelectedIndex(emblaApi.selectedScrollSnap());
        setPrevBtnEnabled(emblaApi.canScrollPrev());
        setNextBtnEnabled(emblaApi.canScrollNext());
        updateSlideStyles(emblaApi); 
    }, [updateSlideStyles]);

    const onInit = useCallback((emblaApi: EmblaCarouselType) => {
        setScrollSnaps(emblaApi.scrollSnapList());
        setPrevBtnEnabled(emblaApi.canScrollPrev());
        setNextBtnEnabled(emblaApi.canScrollNext());
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
                        const slideContainerStyle = {
                            flex: '0 0 100%', 
                            minWidth: '100%',
                            maxWidth: '100%',
                            display: 'flex',
                            justifyContent: 'center',
                        };
                        
                        const slideStyle = {
                            width: '100%', 
                            maxWidth: `${SLIDE_WIDTH}px`, 
                            margin: '0 auto', 
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
                                        customStyle={slideStyles[index] || {}} 
                                    />
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>
            
            {/* Botões de navegação */}
            <Button
                onClick={scrollPrev}
                disabled={!prevBtnEnabled}
                className="absolute left-0 top-1/2 transform -translate-y-1/2 bg-black/60 border border-yellow-500/30 text-yellow-500 hover:bg-yellow-500/20 hover:border-yellow-500 rounded-full w-10 h-10 flex items-center justify-center z-20 disabled:opacity-50 disabled:cursor-not-allowed"
            >
                <ArrowLeft className="h-5 w-5" />
            </Button>
            <Button
                onClick={scrollNext}
                disabled={!nextBtnEnabled}
                className="absolute right-0 top-1/2 transform -translate-y-1/2 bg-black/60 border border-yellow-500/30 text-yellow-500 hover:bg-yellow-500/20 hover:border-yellow-500 rounded-full w-10 h-10 flex items-center justify-center z-20 disabled:opacity-50 disabled:cursor-not-allowed"
            >
                <ArrowRight className="h-5 w-5" />
            </Button>

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