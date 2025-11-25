import React from 'react';
import { useNavigate } from 'react-router-dom';
import {
    Carousel,
    CarouselContent,
    CarouselItem,
    CarouselNext,
    CarouselPrevious,
} from "@/components/ui/carousel";
import { Card, CardContent } from "@/components/ui/card";
import { PublicEvent } from '@/hooks/use-public-events';
import { Button } from '@/components/ui/button';
import { ArrowRight } from 'lucide-react';

interface EventCarouselProps {
    events: PublicEvent[];
}

const EventCarousel: React.FC<EventCarouselProps> = ({ events }) => {
    const navigate = useNavigate();

    // Filtra os 5 primeiros eventos para o carrossel de destaque
    const featuredEvents = events.slice(0, 5);

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

    return (
        <Carousel
            opts={{
                align: "start",
                loop: true,
            }}
            className="w-full"
        >
            <CarouselContent>
                {featuredEvents.map((event, index) => (
                    <CarouselItem key={event.id} className="md:basis-1/2 lg:basis-1/3">
                        <div className="p-1">
                            <Card 
                                className="bg-black/60 backdrop-blur-sm border border-yellow-500/30 rounded-2xl overflow-hidden h-full cursor-pointer hover:border-yellow-500/60 transition-all duration-300 group"
                                onClick={() => navigate(`/events/${event.id}`)}
                            >
                                <CardContent className="flex flex-col aspect-video p-0">
                                    <div className="relative h-full">
                                        <img
                                            src={event.image_url}
                                            alt={event.title}
                                            className="w-full h-full object-cover object-center"
                                        />
                                        <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/50 to-transparent p-6 flex flex-col justify-end">
                                            <span className="bg-yellow-500 text-black px-3 py-1 rounded-full text-xs font-semibold mb-2 self-start">
                                                {event.category}
                                            </span>
                                            <h3 className="text-xl font-serif text-white mb-1 line-clamp-2 group-hover:text-yellow-400 transition-colors">
                                                {event.title}
                                            </h3>
                                            <div className="flex items-center justify-between pt-2">
                                                <div className="text-sm text-gray-300 flex items-center">
                                                    <i className="fas fa-calendar-alt mr-2 text-yellow-500"></i>
                                                    {event.date}
                                                </div>
                                                <Button 
                                                    variant="ghost" 
                                                    size="sm" 
                                                    className="text-yellow-500 hover:bg-yellow-500/10 h-8"
                                                >
                                                    Detalhes <ArrowRight className="h-4 w-4 ml-1" />
                                                </Button>
                                            </div>
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>
                        </div>
                    </CarouselItem>
                ))}
            </CarouselContent>
            <CarouselPrevious className="text-yellow-500 border-yellow-500 hover:bg-yellow-500/10" />
            <CarouselNext className="text-yellow-500 border-yellow-500 hover:bg-yellow-500/10" />
        </Carousel>
    );
};

export default EventCarousel;