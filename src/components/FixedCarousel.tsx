"use client";

import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input'; 
import { useCarouselBanners, CarouselBanner } from '@/hooks/use-carousel-banners';
import { Loader2 } from 'lucide-react';

const FixedCarousel: React.FC = () => {
  const navigate = useNavigate();
  const { banners, isLoading, isError } = useCarouselBanners();
  const [currentIndex, setCurrentIndex] = useState(0);
  
  const items = banners;
  const itemCount = items.length;

  // Sincroniza o índice quando os banners são carregados ou mudam
  useEffect(() => {
    if (itemCount > 0) {
        setCurrentIndex(0);
    }
  }, [itemCount]);

  // Helper function to get the minimum price display
  const getMinPriceDisplay = (price: number | null | undefined): string => {
    if (price === null || price === undefined || price === 0) return 'Grátis';
    return `R$ ${price.toFixed(2).replace('.', ',')}`;
  };

  const getCardPosition = (index: number) => {
    if (itemCount === 0) return { translateX: 0, translateY: 0, scale: 0, opacity: 0, zIndex: 0 };
    
    // Calcula a distância cíclica
    let distance = (index - currentIndex + itemCount) % itemCount;
    
    // Se a distância for maior que a metade, significa que é mais perto ir para trás
    if (distance > itemCount / 2) {
        distance = distance - itemCount;
    }

    // Card central
    if (distance === 0) {
      return {
        translateX: 0,
        translateY: 0,
        scale: 1,
        opacity: 1,
        zIndex: 10
      };
    }
    
    // Cards à direita (distância positiva)
    if (distance > 0 && distance <= 3) {
      const rightPositions = [
        { x: 160, y: 30, scale: 0.85 },
        { x: 260, y: 60, scale: 0.75 },
        { x: 360, y: 90, scale: 0.65 }
      ];
      const pos = rightPositions[distance - 1];
      return {
        translateX: pos.x,
        translateY: pos.y,
        scale: pos.scale,
        opacity: 0.9,
        zIndex: 10 - distance
      };
    }
    
    // Cards à esquerda (distância negativa)
    if (distance < 0 && distance >= -3) {
      const leftDistance = Math.abs(distance);
      const leftPositions = [
        { x: -160, y: 30, scale: 0.85 },
        { x: -260, y: 60, scale: 0.75 },
        { x: -360, y: 90, scale: 0.65 }
      ];
      const pos = leftPositions[leftDistance - 1];
      return {
        translateX: pos.x,
        translateY: pos.y,
        scale: pos.scale,
        opacity: 0.9,
        zIndex: 10 - leftDistance
      };
    }
    
    // Cards invisíveis
    return {
      translateX: 0,
      translateY: 200,
      scale: 0.4,
      opacity: 0,
      zIndex: 0
    };
  };

  const handlePrevious = () => {
    setCurrentIndex((prevIndex) => (prevIndex - 1 + itemCount) % itemCount);
  };

  const handleNext = () => {
    setCurrentIndex((prevIndex) => (prevIndex + 1) % itemCount);
  };
  
  const handleCardClick = (index: number, banner: CarouselBanner) => {
    if (index === currentIndex) {
        // Se for o card central, navega
        if (banner.type === 'event' && banner.event_id) {
            navigate(`/events/${banner.event_id}`);
        } else if (banner.type === 'promotional' && banner.link_url) {
            // Para links externos, usamos window.open
            if (banner.link_url.startsWith('http')) {
                window.open(banner.link_url, '_blank');
            } else {
                navigate(banner.link_url);
            }
        }
    } else {
        // Se for um card lateral, move para o centro
        setCurrentIndex(index);
    }
  };

  if (isLoading) {
    return (
        <div className="bg-black text-white py-12 sm:py-16 h-[500px] flex items-center justify-center">
            <Loader2 className="h-10 w-10 animate-spin text-yellow-500" />
        </div>
    );
  }
  
  if (isError || itemCount === 0) {
    return (
        <div className="bg-black text-white py-12 sm:py-16 h-[500px] flex items-center justify-center">
            <div className="text-center text-gray-500">
                <i className="fas fa-exclamation-triangle text-4xl mb-4"></i>
                <p>Não foi possível carregar os banners do carrossel.</p>
            </div>
        </div>
    );
  }

  return (
    <div className="bg-black text-white py-12 sm:py-16">
      <div className="container mx-auto px-4">
        {/* Header */}
        <div className="text-center mb-10 sm:mb-16">
            <h2 className="text-3xl sm:text-5xl font-serif text-yellow-500 mb-4">Eventos em Destaque</h2>
            <div className="w-16 sm:w-24 h-px bg-yellow-500 mx-auto"></div>
        </div>

        {/* Carousel Container */}
        <div className="flex justify-center mb-10">
          <div 
            style={{
              position: 'relative',
              width: '900px',
              height: '420px',
              margin: 'auto'
            }}
            className="max-w-full sm:max-w-[900px] overflow-hidden"
          >
            {/* Previous Button */}
            <button
              onClick={handlePrevious}
              className="cursor-pointer absolute left-0 top-1/2 transform -translate-y-1/2 bg-black/60 border border-yellow-500/30 hover:bg-yellow-500/10 shadow-lg transition-all duration-300 text-yellow-500 z-20 w-12 h-12 flex items-center justify-center text-xl font-bold rounded-full disabled:opacity-50 disabled:cursor-not-allowed"
              disabled={itemCount < 2}
            >
              <i className="fas fa-chevron-left"></i>
            </button>

            {/* Cards */}
            {items.map((banner, index) => {
              const position = getCardPosition(index);
              
              // Não renderiza cards totalmente invisíveis para otimização
              if (position.opacity === 0 && position.zIndex === 0) return null;
              
              const isCenter = index === currentIndex;
              const minPriceDisplay = banner.type === 'event' ? getMinPriceDisplay(banner.min_price) : null;

              return (
                <div
                  key={banner.id}
                  style={{
                    position: 'absolute',
                    left: '50%',
                    top: '50%',
                    transform: `translate(-50%, -50%) translate(${position.translateX}px, ${position.translateY}px) scale(${position.scale})`,
                    opacity: position.opacity,
                    zIndex: position.zIndex,
                    transition: 'all 0.4s ease-in-out',
                    pointerEvents: position.opacity > 0.1 ? 'auto' : 'none',
                    cursor: position.opacity > 0.1 ? 'pointer' : 'default',
                  }}
                  onClick={() => handleCardClick(index, banner)}
                >
                  <div className="relative overflow-hidden shadow-2xl shadow-yellow-500/20 rounded-2xl border border-yellow-500/30">
                    <img
                      src={banner.image_url}
                      alt={banner.headline}
                      style={{
                        width: '620px',
                        height: '350px',
                        objectFit: 'cover',
                        borderRadius: '16px'
                      }}
                      className="w-[300px] h-[170px] sm:w-[620px] sm:h-[350px] transition-transform duration-300"
                    />
                    {/* Overlay para o card central */}
                    {isCenter && (
                        <div className="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent rounded-2xl flex flex-col justify-end p-6">
                            <div className="text-white">
                                <span className="bg-yellow-500 text-black px-3 py-1 rounded-full text-xs font-semibold mb-2 inline-block">
                                    {banner.type === 'event' ? banner.category : 'Promoção'}
                                </span>
                                <h3 className="text-2xl sm:text-3xl font-bold font-serif mb-1 line-clamp-1">{banner.headline}</h3>
                                <p className="text-sm text-gray-200 mb-3 line-clamp-2">{banner.subheadline}</p>
                                
                                {banner.type === 'event' && minPriceDisplay && (
                                    <div className="flex items-center space-x-4">
                                        <span className="text-xl font-bold text-yellow-500">
                                            A partir de {minPriceDisplay}
                                        </span>
                                        <Button 
                                            className="bg-yellow-500 text-black hover:bg-yellow-600 px-4 py-2 h-8 text-sm font-semibold"
                                            onClick={(e) => { e.stopPropagation(); handleCardClick(index, banner); }}
                                        >
                                            Ver Detalhes
                                        </Button>
                                    </div>
                                )}
                                {banner.type === 'promotional' && (
                                    <Button 
                                        className="bg-yellow-500 text-black hover:bg-yellow-600 px-4 py-2 h-8 text-sm font-semibold"
                                        onClick={(e) => { e.stopPropagation(); handleCardClick(index, banner); }}
                                    >
                                        {banner.link_url ? 'Acessar' : 'Ver Promoção'}
                                    </Button>
                                )}
                            </div>
                        </div>
                    )}
                  </div>
                </div>
              );
            })}

            {/* Next Button */}
            <button
              onClick={handleNext}
              className="cursor-pointer absolute right-0 top-1/2 transform -translate-y-1/2 bg-black/60 border border-yellow-500/30 hover:bg-yellow-500/10 shadow-lg transition-all duration-300 text-yellow-500 z-20 w-12 h-12 flex items-center justify-center text-xl font-bold rounded-full disabled:opacity-50 disabled:cursor-not-allowed"
              disabled={itemCount < 2}
            >
              <i className="fas fa-chevron-right"></i>
            </button>
          </div>
        </div>

        {/* Navigation Dots */}
        <div className="flex justify-center space-x-3 mb-10">
          {items.map((_, index) => (
            <button
              key={index}
              onClick={() => setCurrentIndex(index)}
              className={cn(
                "cursor-pointer w-3 h-3 rounded-full transition-all duration-300",
                index === currentIndex 
                  ? 'bg-yellow-500 scale-125 shadow-md shadow-yellow-500/50' 
                  : 'bg-gray-600 hover:bg-gray-400'
              )}
            />
          ))}
        </div>
      </div>
    </div>
  );
};

export default FixedCarousel;