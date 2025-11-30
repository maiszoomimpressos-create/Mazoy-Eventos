"use client";

import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input'; // Importando Input para evitar erro de importação não resolvida

const FixedCarousel: React.FC = () => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const navigate = useNavigate();
  
  // Usando URLs de exemplo para o carrossel
  const items = [
    'https://readdy.ai/api/search-image?query=modern%20luxury%20sports%20car%20in%20elegant%20showroom%20with%20soft%20lighting%20and%20minimalist%20background%20clean%20white%20environment%20professional%20photography&width=620&height=350&seq=1&orientation=landscape',
    'https://readdy.ai/api/search-image?query=beautiful%20mountain%20landscape%20with%20serene%20lake%20reflection%20during%20golden%20hour%20sunset%20peaceful%20nature%20scene%20professional%20photography&width=620&height=350&seq=2&orientation=landscape',
    'https://readdy.ai/api/search-image?query=contemporary%20architecture%20building%20with%20glass%20facade%20and%20modern%20design%20elements%20urban%20cityscape%20professional%20photography%20clean%20background&width=620&height=350&seq=3&orientation=landscape',
    'https://readdy.ai/api/search-image?query=gourmet%20food%20presentation%20on%20elegant%20white%20plate%20fine%20dining%20restaurant%20atmosphere%20professional%20culinary%20photography%20minimalist%20background&width=620&height=350&seq=4&orientation=landscape',
    'https://readdy.ai/api/search-image?query=tropical%20beach%20paradise%20with%20crystal%20clear%20turquoise%20water%20and%20white%20sand%20peaceful%20vacation%20destination%20professional%20travel%20photography&width=620&height=350&seq=5&orientation=landscape',
    'https://readdy.ai/api/search-image?query=modern%20technology%20workspace%20with%20sleek%20devices%20and%20minimalist%20design%20clean%20professional%20environment%20contemporary%20office%20setup&width=620&height=350&seq=6&orientation=landscape',
    'https://readdy.ai/api/search-image?query=elegant%20fashion%20model%20wearing%20stylish%20clothing%20in%20sophisticated%20studio%20setting%20professional%20fashion%20photography%20clean%20background&width=620&height=350&seq=7&orientation=landscape'
  ];

  const itemCount = items.length;

  const getCardPosition = (index: number) => {
    const distance = (index - currentIndex + itemCount) % itemCount;
    
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
    
    // Cards à direita
    if (distance <= 3) {
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
    
    // Cards à esquerda
    const leftDistance = itemCount - distance;
    if (leftDistance <= 3) {
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
    if (currentIndex > 0) {
      setCurrentIndex(currentIndex - 1);
    } else {
      setCurrentIndex(itemCount - 1);
    }
  };

  const handleNext = () => {
    setCurrentIndex((currentIndex + 1) % itemCount);
  };
  
  const handleCardClick = (index: number) => {
    const position = getCardPosition(index);
    if (position.opacity > 0.1 && index !== currentIndex) {
        setCurrentIndex(index);
    }
    // Se for o card central, pode-se adicionar uma ação de navegação aqui
    if (index === currentIndex) {
        // Exemplo: navigate('/events/details/' + index);
    }
  };

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
            {items.map((imageUrl, index) => {
              const position = getCardPosition(index);
              
              // Não renderiza cards totalmente invisíveis para otimização
              if (position.opacity === 0 && position.zIndex === 0) return null;

              return (
                <div
                  key={index}
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
                  onClick={() => handleCardClick(index)}
                >
                  <div className="relative overflow-hidden shadow-2xl shadow-yellow-500/20 rounded-2xl border border-yellow-500/30">
                    <img
                      src={imageUrl}
                      alt={`Slide ${index + 1}`}
                      style={{
                        width: '620px',
                        height: '350px',
                        objectFit: 'cover',
                        borderRadius: '16px'
                      }}
                      className="w-[300px] h-[170px] sm:w-[620px] sm:h-[350px] transition-transform duration-300"
                    />
                    {/* Overlay para o card central */}
                    {index === currentIndex && (
                        <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent rounded-2xl flex items-end p-6">
                            <div className="text-white">
                                <h3 className="text-2xl font-bold font-serif mb-1">Destaque {index + 1}</h3>
                                <p className="text-sm text-gray-200">Clique para ver detalhes.</p>
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