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

// Dimensões fixas
const SLIDE_WIDTH = 550;
const SLIDE_HEIGHT = 380;
const PEEK_WIDTH = 40; // 40px de visibilidade parcial

// Helper function to get the minimum price display
const getMinPriceDisplay = (price: number | null): string => {
    if (price === null || price === 0) return 'Grátis';
    // Formata para R$ X.XX, usando vírgula como separador decimal
    return `R$ ${price.toFixed(2).replace('.', ',')}`;
};

// Componente para o Slide de Evento
const EventSlide: React.FC<{ event: PublicEvent, onClick: () => void, slideIndex: number, style: React.CSSProperties }> = ({ event, onClick, slideIndex, style }) => {
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
                ...style // Aplica o estilo dinâmico
            }} 
        >
            {/* Identificadores de Borda */}
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
    
    // Limita a 7 eventos
    const featuredEvents = events.slice(0, MAX_FEATURED_EVENTS);

    const [emblaRef, emblaApi] = useEmblaCarousel({ 
        loop: true,
        align: 'center', // Centraliza o slide principal
        slidesToScroll: 1,
        watchDrag: true,
        padding: { left: PEEK_WIDTH, right: PEEK_WIDTH },
    });
    
    const [selectedIndex, setSelectedIndex] = useState(0);
    const [scrollSnaps, setScrollSnaps] = useState<number[]>([]);
    const [prevBtnDisabled, setPrevBtnDisabled] = useState(true);
    const [nextBtnDisabled, setNextBtnDisabled] = useState(true);
    const [scrollProgress, setScrollProgress] = useState<number[]>([]); // Novo estado para o progresso do scroll

    // Função para calcular o progresso do scroll (distância do centro)
    const onScroll = useCallback((emblaApi: EmblaCarouselType) => {
        const progress = emblaApi.scrollProgress();
        const progressArray = emblaApi.scrollSnapList().map((snap) => {
            return emblaApi.scrollProgress() - snap;
        });
        setScrollProgress(progressArray);
    }, []);

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
        onScroll(emblaApi);
    }, [onScroll]);

    useEffect(() => {
        if (!emblaApi) return;
        onInit(emblaApi);
        onSelect(emblaApi);
        emblaApi.on('reInit', onInit);
        emblaApi.on('select', onSelect);
        emblaApi.on('scroll', onScroll); // Adiciona listener de scroll
    }, [emblaApi, onInit, onSelect, onScroll]);

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

    // Função de interpolação para o efeito de profundidade
    const getSlideStyle = (index: number): React.CSSProperties => {
        if (!emblaApi || scrollProgress.length === 0) return {};

        const progress = scrollProgress[index];
        const distance = Math.abs(progress);
        
        // Define a escala mínima e máxima
        const MIN_SCALE = 0.85;
        const MAX_SCALE = 1.0;
        
        // Define a opacidade mínima e máxima
        const MIN_OPACITY = 0.5;
        const MAX_OPACITY = 1.0;
        
        // Interpolação linear: 
        // Se distance = 0 (centro), scale = MAX_SCALE, opacity = MAX_OPACITY
        // Se distance = 1 (longe), scale = MIN_SCALE, opacity = MIN_OPACITY
        
        // Usamos Math.min(distance, 1) para limitar a interpolação
        const clampedDistance = Math.min(distance * 1.5, 1); // Multiplicamos por 1.5 para acelerar o efeito
        
        const scale = MAX_SCALE - clampedDistance * (MAX_SCALE - MIN_SCALE);
        const opacity = MAX_OPACITY - clampedDistance * (MAX_OPACITY - MIN_OPACITY);
        
        // ZIndex: O slide central (distance 0) deve ter o maior zIndex
        const zIndex = Math.round(MAX_SCALE * 100 - clampedDistance * 100);

        // O deslocamento X (translate) é crucial para o efeito de profundidade
        // Move o slide para longe do centro (para dentro)
        const MAX_TRANSLATE = 100; // Deslocamento máximo em pixels
        const translateX = progress * MAX_TRANSLATE; // progress é negativo para a esquerda, positivo para a direita

        return {
            transform: `translateX(${translateX}px) scale(${scale})`,
            opacity: opacity,
            zIndex: zIndex,
            transition: 'transform 0.3s ease-out, opacity 0.3s ease-out', // Transição suave
        };
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
    
    const arrowOffset = SLIDE_WIDTH / 2 + PEEK_WIDTH; // 275 + 40 = 315

    return (
        <div className="relative pt-4 pb-10">
            <div className="overflow-hidden" ref={emblaRef}>
                <div className="flex touch-pan-y">
                    {featuredEvents.map((event, index) => {
                        
                        // Estilo para limitar a largura do slide e centralizar
                        const slideContainerStyle = {
                            // Ocupa a largura do slide + 2 * PEEK_WIDTH para o Embla calcular o alinhamento
                            flex: `0 0 ${SLIDE_WIDTH + PEEK_WIDTH * 2}px`, 
                            minWidth: `${SLIDE_WIDTH + PEEK_WIDTH * 2}px`,
                            maxWidth: `${SLIDE_WIDTH + PEEK_WIDTH * 2}px`,
                            display: 'flex',
                            justifyContent: 'center', // Centraliza o conteúdo dentro do slide
                            paddingLeft: `${PEEK_WIDTH}px`, // Adiciona padding para o peek
                            paddingRight: `${PEEK_WIDTH}px`, // Adiciona padding para o peek
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
                                <EventSlide 
                                    event={event} 
                                    onClick={() => handleEventClick(event)}
                                    slideIndex={index + 1} // Adicionando o índice do slide
                                    style={getSlideStyle(index)} // Aplica o estilo dinâmico de profundidade
                                />
                            </div>
                        );
                    })}
                </div>
            </div>
            
            {/* Setas de Navegação Customizadas (Posicionamento ajustado) */}
            <Button
                variant="outline"
                className={`absolute left-1/2 transform -translate-x-1/2 top-1/2 -translate-y-1/2 z-30 text-yellow-500 border-yellow-500 hover:bg-yellow-500/10 w-12 h-12 p-0 rounded-full hidden md:flex`}
                style={{ marginLeft: `-${arrowOffset}px` }} // Move para a borda esquerda do slide + peek
                onClick={scrollPrev}
                disabled={featuredEvents.length <= 1}
            >
                <ChevronLeft className="h-6 w-6" />
            </Button>
            <Button
                variant="outline"
                className={`absolute right-1/2 transform translate-x-1/2 top-1/2 -translate-y-1/2 z-30 text-yellow-500 border-yellow-500 hover:bg-yellow-500/10 w-12 h-12 p-0 rounded-full hidden md:flex`}
                style={{ marginRight: `-${arrowOffset}px` }} // Move para a borda direita do slide + peek
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