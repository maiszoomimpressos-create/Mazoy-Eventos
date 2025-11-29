"use client";

import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent } from "@/components/ui/card";
import { PublicEvent } from '@/hooks/use-public-events';
import { Button } from '@/components/ui/button';
import { ArrowRight } from 'lucide-react';
import { cn } from '@/lib/utils';

interface EventCarouselProps {
    events: PublicEvent[];
}

const MAX_FEATURED_EVENTS = 8; // Aumentado para 8 para acomodar 6 banners (índices 0 a 5)

const SLIDE_WIDTH = 550; // Largura máxima para o cartão de conteúdo
const SLIDE_HEIGHT = 380; // Altura fixa para os cartões

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
    
    // Agora pegamos 6 eventos para os 6 banners
    const featuredEvents = events.slice(0, MAX_FEATURED_EVENTS);

    const handleEventClick = (event: PublicEvent) => {
        navigate(`/finalizar-compra`, { state: { eventId: event.id } });
    };

    if (featuredEvents.length < 6) { // Ajusta a verificação para garantir que temos pelo menos 6 eventos para exibir
        return (
            <div className="flex items-center justify-center h-full bg-black/60 border border-yellow-500/30 rounded-2xl shadow-2xl shadow-yellow-500/20" style={{ height: `${SLIDE_HEIGHT}px` }}>
                <div className="text-center p-8">
                    <i className="fas fa-star text-yellow-500 text-4xl mb-4"></i>
                    <h2 className="text-xl sm:text-2xl font-serif text-white mb-2">Destaques Premium</h2>
                    <p className="text-gray-400 text-sm">Não há eventos suficientes para o carrossel completo.</p>
                </div>
            </div>
        );
    }
    
    // Identifica os eventos para os banners 1, 2, 3, 4, 5 e 6 (índices 0, 1, 2, 3, 4 e 5)
    const prevPrevPrevEvent = featuredEvents[0]; // Banner 1
    const prevPrevEvent = featuredEvents[1];     // Banner 2
    const prevEvent = featuredEvents[2];         // Banner 3
    const fixedEvent = featuredEvents[3];        // Banner 4 (central e fixo)
    const nextEvent = featuredEvents[4];         // Banner 5
    const nextNextEvent = featuredEvents[5];     // NOVO: Banner 6

    // Se o evento central não existir, exibe uma mensagem de erro
    if (!fixedEvent) {
        return (
            <div className="flex items-center justify-center h-full bg-black/60 border border-yellow-500/30 rounded-2xl shadow-2xl shadow-yellow-500/20" style={{ height: `${SLIDE_HEIGHT}px` }}>
                <div className="text-center p-8">
                    <i className="fas fa-exclamation-circle text-red-500 text-4xl mb-4"></i>
                    <h2 className="text-xl sm:text-2xl font-serif text-white mb-2">Evento Destacado Não Encontrado</h2>
                    <p className="text-gray-400 text-sm">O evento principal (banner 4) não está disponível.</p>
                </div>
            </div>
        );
    }

    // Calcula a largura efetiva do banner lateral após a escala
    const scaledWidth = SLIDE_WIDTH * 0.85;
    const visiblePeek = 50; // Quantos pixels do banner lateral devem estar visíveis
    const overlapAmount = scaledWidth - visiblePeek; // Quantidade de sobreposição

    return (
        <div className="relative pt-4 pb-10 flex justify-center items-center overflow-hidden">
            <div className="flex items-center"> {/* Este div interno será centralizado pelo flex pai */}
                {prevPrevPrevEvent && (
                    <div 
                        className="relative hidden md:block" 
                        style={{ marginRight: `-${overlapAmount}px` }} 
                    >
                        <EventSlide 
                            event={prevPrevPrevEvent} 
                            onClick={() => handleEventClick(prevPrevPrevEvent)}
                            slideIndex={1} 
                            customStyle={{ transform: 'scale(0.55)', opacity: 0.05, zIndex: 5 }} // Escala e opacidade ainda menores para o banner 1
                        />
                    </div>
                )}
                {prevPrevEvent && (
                    <div 
                        className="relative hidden md:block" 
                        style={{ marginRight: `-${overlapAmount}px` }} 
                    >
                        <EventSlide 
                            event={prevPrevEvent} 
                            onClick={() => handleEventClick(prevPrevEvent)}
                            slideIndex={2} 
                            customStyle={{ transform: 'scale(0.7)', opacity: 0.15, zIndex: 10 }} // Escala e opacidade ajustadas para mais profundidade
                        />
                    </div>
                )}
                {prevEvent && (
                    <div 
                        className="relative hidden md:block" 
                        style={{ marginRight: `-${overlapAmount}px` }} 
                    >
                        <EventSlide 
                            event={prevEvent} 
                            onClick={() => handleEventClick(prevEvent)}
                            slideIndex={3} 
                            customStyle={{ transform: 'scale(0.85)', opacity: 0.5, zIndex: 15 }} // zIndex intermediário
                        />
                    </div>
                )}
                {fixedEvent && (
                    <div className="relative z-20"> {/* Banner 4 central e em destaque */}
                        <EventSlide 
                            event={fixedEvent} 
                            onClick={() => handleEventClick(fixedEvent)}
                            slideIndex={4} 
                            customStyle={{ opacity: 1, zIndex: 20 }} 
                        />
                    </div>
                )}
                {nextEvent && (
                    <div 
                        className="relative hidden md:block" 
                        style={{ marginLeft: `-${overlapAmount}px` }} 
                    >
                        <EventSlide 
                            event={nextEvent} 
                            onClick={() => handleEventClick(nextEvent)}
                            slideIndex={5} 
                            customStyle={{ transform: 'scale(0.85)', opacity: 0.5, zIndex: 15 }} 
                        />
                    </div>
                )}
                {nextNextEvent && ( // NOVO: Banner 6
                    <div 
                        className="relative hidden md:block" 
                        style={{ marginLeft: `-${overlapAmount}px` }} 
                    >
                        <EventSlide 
                            event={nextNextEvent} 
                            onClick={() => handleEventClick(nextNextEvent)}
                            slideIndex={6} 
                            customStyle={{ transform: 'scale(0.7)', opacity: 0.15, zIndex: 10 }} // Espelha o estilo do banner 2
                        />
                    </div>
                )}
            </div>
        </div>
    );
};

export default EventCarousel;