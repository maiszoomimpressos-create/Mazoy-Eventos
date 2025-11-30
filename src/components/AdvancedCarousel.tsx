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
    const nextIndex = (currentIndex + 1) % banners.length;
    const nextBanner = banners[nextIndex];

    const updateSlide = () => {
        const next = (currentIndex + 1) % banners.length;
        setIsTransitioning(true);
        setTimeout(() => {
            setCurrentIndex(next);
            setIsTransitioning(false);
        }, 1000);
    };

    useEffect(() => {
        const interval = setInterval(updateSlide, 4000);
        return () => clearInterval(interval);
    }, [currentIndex, banners.length]);

    const getSideImages = (indexToUse = currentIndex) => {
        const sideImages = [];
        // Lado esquerdo - 3 imagens
        for (let i = 1; i <= 3; i++) {
            const leftIndex = (indexToUse - i + banners.length) % banners.length;
            sideImages.push({
                image: banners[leftIndex].image_url,
                side: 'left',
                position: i
            });
        }
        // Lado direito - 3 imagens
        for (let i = 1; i <= 3; i++) {
            const rightIndex = (indexToUse + i) % banners.length;
            sideImages.push({
                image: banners[rightIndex].image_url,
                side: 'right',
                position: i
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

    return (
        <div className="h-full bg-black flex justify-center items-center pt-5 overflow-hidden font-sans">
            <div className="max-w-[1600px] w-full h-[600px] relative flex justify-center items-center px-4">
                {/* Banners laterais em escadinha - SEMPRE SÓLIDOS */}
                {getSideImages(currentIndex).map((sideImg, index) => {
                    const isLeft = sideImg.side === 'left';
                    const pos = sideImg.position;
                    const baseWidth = 320;
                    const baseHeight = 400;
                    const scale = 1 - (pos * 0.08);
                    const offsetX = isLeft ? -(172 + (pos * 90)) : (172 + (pos * 90));
                    const offsetY = 0;
                    const zIndex = 15 - pos;
                    const transitionDelay = pos * 80;
                    
                    // Opacidade total (1) garantida
                    const opacityValue = 1; 

                    return (
                        <div
                            key={`current-${sideImg.side}-${pos}-${currentIndex}`}
                            className="absolute rounded-2xl overflow-hidden shadow-2xl border border-white/20"
                            style={{
                                width: `${baseWidth * scale}px`,
                                height: `${baseHeight * scale}px`,
                                transform: `translateX(${offsetX}px) translateY(${offsetY}px)`,
                                zIndex: zIndex,
                                opacity: opacityValue, // SEMPRE 1
                                transition: `all 1000ms ease-out`,
                                transitionDelay: isTransitioning ? `${transitionDelay}ms` : '0ms'
                            }}
                        >
                            <img
                                src={sideImg.image}
                                alt={`Side image ${pos}`}
                                className="w-full h-full object-cover object-top transition-all duration-1000 ease-out"
                                style={{
                                    transform: isTransitioning ? 'scale(0.95)' : 'scale(1)',
                                    transitionDelay: `${transitionDelay}ms`
                                }}
                            />
                            {/* Overlay escuro para garantir solidez e profundidade */}
                            <div 
                                className="absolute inset-0 bg-black transition-opacity duration-1000" // Alterado para bg-black (100% opaco)
                                style={{ opacity: 1 }}
                            ></div>
                        </div>
                    );
                })}
                
                {/* Banner central principal */}
                <div 
                    className="w-[700px] h-[450px] rounded-3xl overflow-hidden relative z-20 shadow-[0_0_80px_rgba(255,210,0,0.6)] border-4 border-yellow-400/30 cursor-pointer"
                    onClick={handleCenterCardClick}
                >
                    {/* Imagem atual */}
                    <img
                        src={currentBanner.image_url}
                        alt={currentBanner.headline}
                        className={`absolute inset-0 w-full h-full object-cover object-top transition-all duration-[1200ms] ease-out ${
                            isTransitioning ? 'opacity-0 scale-110 blur-sm' : 'opacity-100 scale-100 blur-0'
                        }`}
                    />
                    {/* Imagem seguinte para transição suave */}
                    {isTransitioning && (
                        <img
                            src={nextBanner.image_url}
                            alt={nextBanner.headline}
                            className="absolute inset-0 w-full h-full object-cover object-top transition-all duration-[1200ms] ease-out opacity-0 scale-95 animate-in"
                            style={{
                                animation: 'fadeInScale 1200ms ease-out forwards'
                            }}
                        />
                    )}
                    {/* Overlay escuro para o texto ser legível */}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent"></div>
                    
                    {/* Conteúdo do Banner */}
                    <div className="absolute bottom-0 left-0 right-0 p-8 text-white">
                        <h2 className="text-4xl font-serif font-bold mb-2 text-shadow-lg">
                            {currentBanner.headline}
                        </h2>
                        <p className="text-lg text-gray-200 mb-4 text-shadow-lg">
                            {currentBanner.subheadline}
                        </p>
                        
                        <div className="flex items-center space-x-4">
                            {currentBanner.type === 'event' && currentBanner.min_price !== null && (
                                <span className="text-2xl font-bold text-yellow-400">
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
                    
                    {/* Control buttons - Posicionados DENTRO do banner central */}
                    <button
                        onClick={(e) => {
                            e.stopPropagation(); // Previne o clique no card central
                            if (!isTransitioning) {
                                const prev = currentIndex === 0 ? banners.length - 1 : currentIndex - 1;
                                setIsTransitioning(true);
                                setTimeout(() => {
                                    setCurrentIndex(prev);
                                    setIsTransitioning(false);
                                }, 1000);
                            }
                        }}
                        // Alterado para bg-black e removido backdrop-blur-sm
                        className="absolute left-4 top-1/2 transform -translate-y-1/2 w-14 h-14 bg-black hover:bg-black/90 rounded-xl flex items-center justify-center transition-all duration-400 z-30 cursor-pointer border border-yellow-400/30 shadow-2xl"
                    >
                        <i className="fas fa-chevron-left text-white text-xl"></i>
                    </button>
                    <button
                        onClick={(e) => {
                            e.stopPropagation(); // Previne o clique no card central
                            if (!isTransitioning) {
                                updateSlide();
                            }
                        }}
                        // Alterado para bg-black e removido backdrop-blur-sm
                        className="absolute right-4 top-1/2 transform -translate-y-1/2 w-14 h-14 bg-black hover:bg-black/90 rounded-xl flex items-center justify-center transition-all duration-400 z-30 cursor-pointer border border-yellow-400/30 shadow-2xl"
                    >
                        <i className="fas fa-chevron-right text-white text-xl"></i>
                    </button>
                </div>
                
                {/* Navigation dots */}
                <div className="absolute left-1/2 transform -translate-x-1/2 flex space-x-6 z-30" style={{bottom: '-25px'}}>
                    {banners.map((_, index) => (
                        <button
                            key={index}
                            onClick={() => {
                                if (index !== currentIndex && !isTransitioning) {
                                    setIsTransitioning(true);
                                    setTimeout(() => {
                                        setCurrentIndex(index);
                                        setIsTransitioning(false);
                                    }, 1000);
                                }
                            }}
                            className={`w-5 h-5 rounded-full transition-all duration-400 cursor-pointer !rounded-button whitespace-nowrap ${
                                index === currentIndex
                                    ? 'bg-yellow-400 shadow-[0_0_20px_rgba(255,210,0,0.9)] scale-140'
                                    : 'bg-white/50 hover:bg-white/70 hover:scale-125'
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