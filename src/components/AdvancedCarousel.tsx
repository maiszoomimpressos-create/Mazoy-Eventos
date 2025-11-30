import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { CarouselBanner } from '@/hooks/use-carousel-banners';
import { Button } from '@/components/ui/button';

interface AdvancedCarouselProps {
    banners: CarouselBanner[];
}

const getMinPriceDisplay = (price: number | null | undefined): string => {
    if (price === null || price === undefined || price === 0) return 'Grátis';
    return `A partir de R$ ${price.toFixed(2).replace('.', ',')}`;
};

// Definições de posição baseadas no CSS fornecido pelo usuário
const POSITIONS_CSS = [
    // Left Side (Imagens anteriores)
    { transform: 'scale(.90) translate(-300px, 20px)', zIndex: 10 }, // b1 (Furthest Left)
    { transform: 'scale(.85) translate(-220px, 50px)', zIndex: 11 }, // b2
    { transform: 'scale(.80) translate(-140px, 80px)', zIndex: 12 }, // b3 (Closest Left)
    // Right Side (Imagens seguintes)
    { transform: 'scale(.80) translate(140px, 80px)', zIndex: 12 }, // b4 (Closest Right)
    { transform: 'scale(.85) translate(220px, 50px)', zIndex: 11 }, // b5
    { transform: 'scale(.90) translate(300px, 20px)', zIndex: 10 }, // b6 (Furthest Right)
];

const AdvancedCarousel: React.FC<AdvancedCarouselProps> = ({ banners }) => {
    const navigate = useNavigate();
    const [currentIndex, setCurrentIndex] = useState(0);
    const [isTransitioning, setIsTransitioning] = useState(false);

    if (banners.length === 0) {
        return (
            <div className="w-full h-full flex items-center justify-center bg-black">
                <p className="text-gray-400">Nenhum banner ativo no momento.</p>
            </div>
        );
    }

    const currentBanner = banners[currentIndex];

    const updateSlide = () => {
        const next = (currentIndex + 1) % banners.length;
        
        // 1. Inicia o fade out (opacidade 0)
        setIsTransitioning(true); 

        // 2. Após o tempo de fade out (280ms), atualiza o índice
        setTimeout(() => {
            setCurrentIndex(next);
            // 3. Permite o fade in (opacidade 1) no próximo ciclo de renderização
            setIsTransitioning(false); 
        }, 280);
    };

    useEffect(() => {
        // O tempo de intervalo é 4000ms (4 segundos)
        const interval = setInterval(updateSlide, 4000);
        return () => clearInterval(interval);
    }, [currentIndex, banners.length]);

    const getSideImages = (indexToUse = currentIndex) => {
        const sideImages = [];
        
        // 3 imagens anteriores (Left Side: b3, b2, b1)
        for (let i = 1; i <= 3; i++) {
            const leftIndex = (indexToUse - i + banners.length) % banners.length;
            sideImages.push({
                image: banners[leftIndex].image_url,
                positionIndex: 3 - i, // Mapeia i=1 para 2 (b3), i=2 para 1 (b2), i=3 para 0 (b1)
            });
        }
        
        // 3 imagens seguintes (Right Side: b4, b5, b6)
        for (let i = 1; i <= 3; i++) {
            const rightIndex = (indexToUse + i) % banners.length;
            sideImages.push({
                image: banners[rightIndex].image_url,
                positionIndex: 2 + i, // Mapeia i=1 para 3 (b4), i=2 para 4 (b5), i=3 para 5 (b6)
            });
        }
        return sideImages;
    };
    
    const handleCenterCardClick = () => {
        const link = currentBanner.type === 'event' 
            ? `/events/${currentBanner.event_id}` 
            : currentBanner.link_url || '/';
            
        navigate(link);
    };
    
    const handleManualNavigation = (newIndex: number) => {
        if (newIndex !== currentIndex && !isTransitioning) {
            setIsTransitioning(true);
            setTimeout(() => {
                setCurrentIndex(newIndex);
                setIsTransitioning(false);
            }, 280);
        }
    };

    return (
        <div className="h-full bg-black flex justify-center items-center pt-5 overflow-hidden font-sans">
            <div className="carousel-wrapper max-w-[920px] w-full h-[440px] relative flex justify-center items-center px-4">
                
                {/* Área dos Banners Laterais (behind-area) */}
                <div className="behind-area absolute bottom-0 w-full h-[280px] pointer-events-none">
                    {getSideImages().map((sideImg, index) => {
                        const pos = POSITIONS_CSS[sideImg.positionIndex];
                        
                        return (
                            <div
                                key={`side-${index}-${currentIndex}`}
                                className="behind absolute w-[460px] h-[280px] rounded-xl overflow-hidden shadow-xl"
                                style={{
                                    backgroundImage: `url(${sideImg.image})`,
                                    backgroundSize: 'cover',
                                    backgroundPosition: 'center',
                                    filter: 'blur(1.5px)',
                                    opacity: 0.9,
                                    transition: 'transform 0.6s ease, filter 0.6s ease',
                                    transform: pos.transform,
                                    zIndex: pos.zIndex,
                                }}
                            >
                                {/* Overlay 100% sólido (bg-black) para garantir que não haja transparência */}
                                <div className="absolute inset-0 bg-black opacity-0"></div>
                            </div>
                        );
                    })}
                </div>

                {/* Banner Central (main) */}
                <div 
                    className="main w-[580px] h-[340px] rounded-[18px] overflow-hidden relative z-20 shadow-[0_0_45px_rgba(255,210,0,.45)] cursor-pointer"
                    onClick={handleCenterCardClick}
                >
                    <img
                        src={currentBanner.image_url}
                        alt={currentBanner.headline}
                        // Transição de opacidade de 280ms (0.28s)
                        className={`w-full h-full object-cover transition-[opacity] duration-[280ms] ease ${
                            isTransitioning ? 'opacity-0' : 'opacity-100'
                        }`}
                    />
                    
                    {/* Overlay escuro para o texto ser legível (100% opaco na base) */}
                    <div className="absolute inset-0 bg-gradient-to-t from-black via-transparent to-transparent opacity-90"></div>
                    
                    {/* Conteúdo do Banner */}
                    <div className="absolute bottom-0 left-0 right-0 p-6 text-white">
                        <h2 className="text-3xl sm:text-4xl font-serif font-bold mb-2 text-shadow-lg">
                            {currentBanner.headline}
                        </h2>
                        <p className="text-base sm:text-lg text-gray-200 mb-4 text-shadow-lg">
                            {currentBanner.subheadline}
                        </p>
                        
                        <div className="flex items-center space-x-4">
                            {currentBanner.type === 'event' && currentBanner.min_price !== null && (
                                <span className="text-xl sm:text-2xl font-bold text-yellow-400">
                                    {getMinPriceDisplay(currentBanner.min_price)}
                                </span>
                            )}
                            <Button
                                onClick={handleCenterCardClick}
                                className="bg-yellow-500 text-black hover:bg-yellow-600 px-6 py-2 text-base font-semibold transition-all duration-300"
                            >
                                {currentBanner.type === 'event' ? 'Ver Evento' : 'Saiba Mais'}
                            </Button>
                        </div>
                    </div>
                    
                    {/* Control buttons (100% sólido) */}
                    <button
                        onClick={(e) => {
                            e.stopPropagation();
                            const prev = currentIndex === 0 ? banners.length - 1 : currentIndex - 1;
                            handleManualNavigation(prev);
                        }}
                        className="absolute left-4 top-1/2 transform -translate-y-1/2 w-10 h-10 bg-black hover:bg-black/90 rounded-xl flex items-center justify-center transition-all duration-400 z-30 cursor-pointer border border-yellow-400/30 shadow-2xl"
                    >
                        <i className="fas fa-chevron-left text-white text-lg"></i>
                    </button>
                    <button
                        onClick={(e) => {
                            e.stopPropagation();
                            updateSlide();
                        }}
                        className="absolute right-4 top-1/2 transform -translate-y-1/2 w-10 h-10 bg-black hover:bg-black/90 rounded-xl flex items-center justify-center transition-all duration-400 z-30 cursor-pointer border border-yellow-400/30 shadow-2xl"
                    >
                        <i className="fas fa-chevron-right text-white text-lg"></i>
                    </button>
                </div>
                
                {/* Navigation dots */}
                <div className="absolute left-1/2 transform -translate-x-1/2 flex space-x-4 z-30" style={{bottom: '20px'}}>
                    {banners.map((_, index) => (
                        <button
                            key={index}
                            onClick={() => handleManualNavigation(index)}
                            className={`w-3 h-3 rounded-full transition-all duration-400 cursor-pointer !rounded-button whitespace-nowrap ${
                                index === currentIndex
                                    ? 'bg-yellow-400 shadow-[0_0_10px_rgba(255,210,0,0.9)] scale-125'
                                    : 'bg-white/50 hover:bg-white/70'
                            }`}
                        />
                    ))}
                </div>
                
                {/* Glow effects */}
                <div className="absolute inset-0 pointer-events-none">
                    <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-[800px] h-[500px] bg-gradient-radial from-yellow-400/10 via-yellow-400/5 to-transparent rounded-full blur-3xl"></div>
                </div>
            </div>
        </div>
    );
};

export default AdvancedCarousel;