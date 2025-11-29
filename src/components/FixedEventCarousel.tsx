"use client";

import React from 'react';
import EventCarousel from './EventCarousel';
import { usePublicEvents } from '@/hooks/use-public-events';
import { Loader2 } from 'lucide-react';

const FixedEventCarousel: React.FC = () => {
    const { events: allEvents, isLoading: isLoadingEvents } = usePublicEvents();

    if (isLoadingEvents) {
        // Renderiza um placeholder fixo enquanto carrega
        return (
            <div className="fixed top-20 left-0 right-0 z-50 flex items-center justify-center h-[450px] bg-black/80 backdrop-blur-sm">
                <Loader2 className="h-10 w-10 animate-spin text-yellow-500" />
            </div>
        );
    }

    return (
        <div 
            className="fixed top-20 left-0 right-0 z-50 bg-black/80 backdrop-blur-sm border-b border-yellow-500/20"
            style={{ height: '450px' }} // Altura total do carrossel + padding
        >
            <div className="max-w-7xl mx-auto px-4 sm:px-6 h-full flex items-center justify-center">
                <EventCarousel events={allEvents} />
            </div>
        </div>
    );
};

export default FixedEventCarousel;