import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

const FixedCarousel: React.FC = () => {
    const navigate = useNavigate();
    const [currentIndex, setCurrentIndex] = useState(0);
    const [isTransitioning, setIsTransitioning] = useState(false);
    const [nextIndex, setNextIndex] = useState(0);
    const images = [
        'https://readdy.ai/api/search-image?query=modern%20luxury%20sports%20car%20in%20elegant%20showroom%20with%20soft%20golden%20lighting%20and%20minimalist%20white%20background%20creating%20premium%20automotive%20photography%20atmosphere&width=700&height=450&seq=img1&orientation=landscape',
        'https://readdy.ai/api/search-image?query=sophisticated%20fashion%20model%20wearing%20designer%20clothing%20in%20contemporary%20studio%20setting%20with%20clean%20white%20backdrop%20and%20professional%20lighting%20setup&width=700&height=450&seq=img2&orientation=landscape',
        'https://readdy.ai/api/search-image?query=premium%20watch%20collection%20displayed%20on%20marble%20surface%20with%20elegant%20lighting%20and%20luxurious%20minimalist%20background%20showcasing%20fine%20craftsmanship%20and%20precision&width=700&height=450&seq=img3&orientation=landscape',
        'https://readdy.ai/api/search-image?query=high-end%20technology%20gadgets%20arranged%20artistically%20on%20clean%20white%20surface%20with%20modern%20lighting%20creating%20sleek%20product%20photography%20composition&width=700&height=450&seq=img4&orientation=landscape',
        'https://readdy.ai/api/search-image?query=elegant%20jewelry%20pieces%20displayed%20on%20sophisticated%20velvet%20surface%20with%20dramatic%20lighting%20and%20luxurious%20background%20creating%20premium%20product%20showcase&width=700&height=450&seq=img5&orientation=landscape',
        'https://readdy.ai/api/search-image?query=modern%20architectural%20interior%20with%20clean%20lines%20and%20minimalist%20design%20featuring%20natural%20lighting%20and%20contemporary%20furniture%20in%20neutral%20color%20palette&width=700&height=450&seq=img6&orientation=landscape',
        'https://readdy.ai/api/search-image?query=premium%20cosmetics%20and%20beauty%20products%20arranged%20on%20marble%20surface%20with%20soft%20lighting%20and%20elegant%20white%20background%20creating%20luxury%20brand%20photography&width=700&height=450&seq=img7&orientation=landscape',
        'https://readdy.ai/api/search-image?query=sophisticated%20home%20decor%20items%20displayed%20in%20modern%20living%20space%20with%20natural%20lighting%20and%20contemporary%20design%20elements%20in%20neutral%20tones&width=700&height=450&seq=img8&orientation=landscape'
    ];
    const updateSlide = () => {
        const next = (currentIndex + 1) % images.length;
        setNextIndex(next);
        setIsTransitioning(true);
        setTimeout(() => {
            setCurrentIndex(next);
            setIsTransitioning(false);
        }, 1000);
    };
    useEffect(() => {
        const interval = setInterval(updateSlide, 4000);
        return () => clearInterval(interval);
    }, [currentIndex]);

    const getSideImages = (indexToUse = currentIndex) => {
        const sideImages = [];
        // Lado esquerdo - 3 imagens
        for (let i = 1; i <= 3; i++) {
            const leftIndex = (indexToUse - i + images.length) % images.length;
            sideImages.push({
                image: images[leftIndex],
                side: 'left',
                position: i
            });
        }
        // Lado direito - 3 imagens
        for (let i = 1; i <= 3; i++) {
            const rightIndex = (indexToUse + i) % images.length;
            sideImages.push({
                image: images[rightIndex],
                side: 'right',
                position: i
            });
        }
        return sideImages;
    };

    const handleCenterCardClick = () => {
        // Implement navigation logic here if needed
        console.log("Center card clicked. Implement navigation here.");
    };

    return (
        <div className="min-h-[calc(100vh-80px)] bg-black flex justify-center items-center overflow-hidden font-sans">
            <div className="max-w-[1600px] w-full h-[600px] relative flex justify-center items-center px-4">
                {/* Banners laterais em escadinha - Imagens atuais */}
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
                    return (
                        <div
                            key={`current-${sideImg.side}-${pos}-${currentIndex}`}
                            className="absolute rounded-2xl overflow-hidden shadow-2xl border border-white/20"
                            style={{
                                width: `${baseWidth * scale}px`,
                                height: `${baseHeight * scale}px`,
                                transform: `translateX(${offsetX}px) translateY(${offsetY}px)`,
                                zIndex: zIndex,
                                opacity: isTransitioning ? 0 : (1 - (pos * 0.15)),
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
                                    filter: isTransitioning ? 'blur(2px)' : 'blur(0px)',
                                    transitionDelay: `${transitionDelay}ms`
                                }}
                            />
                            <div className="absolute inset-0 bg-gradient-to-t from-black/25 via-transparent to-transparent"></div>
                            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-yellow-400/5 to-transparent"></div>
                        </div>
                    );
                })}
                {/* Banners laterais em escadinha - Próximas imagens (durante transição) */}
                {isTransitioning && getSideImages(nextIndex).map((sideImg, index) => {
                    const isLeft = sideImg.side === 'left';
                    const pos = sideImg.position;
                    const baseWidth = 320;
                    const baseHeight = 400;
                    const scale = 1 - (pos * 0.08);
                    const offsetX = isLeft ? -(172 + (pos * 90)) : (172 + (pos * 90));
                    const offsetY = 0;
                    const zIndex = 15 - pos;
                    const transitionDelay = pos * 80;
                    return (
                        <div
                            key={`next-${sideImg.side}-${pos}-${nextIndex}`}
                            className="absolute rounded-2xl overflow-hidden shadow-2xl border border-white/20"
                            style={{
                                width: `${baseWidth * scale}px`,
                                height: `${baseHeight * scale}px`,
                                transform: `translateX(${offsetX}px) translateY(${offsetY}px)`,
                                zIndex: zIndex,
                                opacity: 0,
                                transition: `all 1000ms ease-out`,
                                transitionDelay: `${200 + transitionDelay}ms`,
                                animation: `fadeInSide 1000ms ease-out ${200 + transitionDelay}ms forwards`
                            }}
                        >
                            <img
                                src={sideImg.image}
                                alt={`Next side image ${pos}`}
                                className="w-full h-full object-cover object-top"
                                style={{
                                    transform: 'scale(0.9)',
                                    filter: 'blur(1px)',
                                    transition: 'all 1000ms ease-out',
                                    transitionDelay: `${200 + transitionDelay}ms`
                                }}
                            />
                            <div className="absolute inset-0 bg-gradient-to-t from-black/25 via-transparent to-transparent"></div>
                            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-yellow-400/5 to-transparent"></div>
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
                        src={images[currentIndex]}
                        alt="Carousel Image"
                        className={`absolute inset-0 w-full h-full object-cover object-top transition-all duration-[1200ms] ease-out ${
                            isTransitioning ? 'opacity-0 scale-110 blur-sm' : 'opacity-100 scale-100 blur-0'
                        }`}
                    />
                    {/* Imagem seguinte para transição suave */}
                    {isTransitioning && (
                        <img
                            src={images[nextIndex]}
                            alt="Next Carousel Image"
                            className="absolute inset-0 w-full h-full object-cover object-top transition-all duration-[1200ms] ease-out opacity-0 scale-95 animate-in"
                            style={{
                                animation: 'fadeInScale 1200ms ease-out forwards'
                            }}
                        />
                    )}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent"></div>
                    <div className="absolute inset-0 bg-gradient-to-r from-yellow-400/10 via-transparent to-yellow-400/10"></div>
                    
                    {/* Control buttons - Posicionados DENTRO do banner central */}
                    <button
                        onClick={(e) => {
                            e.stopPropagation(); // Previne o clique no card central
                            if (!isTransitioning) {
                                const prev = currentIndex === 0 ? images.length - 1 : currentIndex - 1;
                                setNextIndex(prev);
                                setIsTransitioning(true);
                                setTimeout(() => {
                                    setCurrentIndex(prev);
                                    setIsTransitioning(false);
                                }, 1000);
                            }
                        }}
                        className="absolute left-4 top-1/2 transform -translate-y-1/2 w-14 h-14 bg-black/40 hover:bg-black/60 rounded-xl flex items-center justify-center transition-all duration-400 z-30 cursor-pointer backdrop-blur-sm border border-yellow-400/30 shadow-2xl"
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
                        className="absolute right-4 top-1/2 transform -translate-y-1/2 w-14 h-14 bg-black/40 hover:bg-black/60 rounded-xl flex items-center justify-center transition-all duration-400 z-30 cursor-pointer backdrop-blur-sm border border-yellow-400/30 shadow-2xl"
                    >
                        <i className="fas fa-chevron-right text-white text-xl"></i>
                    </button>
                </div>
                
                {/* Navigation dots */}
                <div className="absolute left-1/2 transform -translate-x-1/2 flex space-x-6 z-30" style={{bottom: '-25px'}}>
                    {images.map((_, index) => (
                        <button
                            key={index}
                            onClick={() => {
                                if (index !== currentIndex && !isTransitioning) {
                                    setNextIndex(index);
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

export default FixedCarousel;