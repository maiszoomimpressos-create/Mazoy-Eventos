"use client";

import React, { useState, useCallback, useMemo } from 'react';
import './RotatingFixedCarousel.css';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';

interface RotatingFixedCarouselProps {
    items: string[]; // Array de URLs de imagens
}

// Define as 7 posições fixas no carrossel
const POSITIONS = [
    'position-center',
    'position-right-1',
    'position-right-2',
    'position-right-3',
    'position-left-3',
    'position-left-2',
    'position-left-1',
] as const;

type PositionClass = typeof POSITIONS[number];

// Mapeia o índice do item para a classe de posição no carrossel
const getPositionClass = (itemIndex: number, activeIndex: number, totalItems: number): PositionClass | null => {
    const diff = (itemIndex - activeIndex + totalItems) % totalItems;
    
    // O carrossel tem 7 slots visíveis (3 esquerda, 1 centro, 3 direita)
    if (diff === 0) return 'position-center';
    if (diff === 1) return 'position-right-1';
    if (diff === 2) return 'position-right-2';
    if (diff === 3) return 'position-right-3';
    
    // Para a rotação circular, os itens mais distantes à esquerda
    // são mapeados para os índices mais altos (totalItems - 1, totalItems - 2, etc.)
    if (diff === totalItems - 1) return 'position-left-1';
    if (diff === totalItems - 2) return 'position-left-2';
    if (diff === totalItems - 3) return 'position-left-3';

    // Se o item estiver fora das 7 posições visíveis, ele não recebe classe de posição
    return null;
};

// Define o z-index baseado na posição para garantir a sobreposição correta
const getZIndex = (positionClass: PositionClass | null): number => {
    if (positionClass === 'position-center') return 100;
    if (positionClass?.includes('1')) return 90;
    if (positionClass?.includes('2')) return 80;
    if (positionClass?.includes('3')) return 70;
    return 1;
};


const RotatingFixedCarousel: React.FC<RotatingFixedCarouselProps> = ({ items }) => {
    const [activeIndex, setActiveIndex] = useState(0);
    const totalItems = items.length;

    const handlePrev = useCallback(() => {
        setActiveIndex(prevIndex => (prevIndex - 1 + totalItems) % totalItems);
    }, [totalItems]);

    const handleNext = useCallback(() => {
        setActiveIndex(prevIndex => (prevIndex + 1) % totalItems);
    }, [totalItems]);
    
    if (totalItems === 0) {
        return <div className="rotating-carousel-container text-gray-400 justify-center">Nenhum item para exibir no carrossel.</div>;
    }
    
    // Se houver menos de 7 itens, o carrossel não funcionará corretamente com 3 camadas de cada lado.
    // Para simplificar, vamos garantir que haja pelo menos 7 itens para preencher todas as posições.
    if (totalItems < 7) {
        // Renderiza apenas o item central se não houver itens suficientes
        return (
            <div className="rotating-carousel-container">
                <div className="carousel-item position-center">
                    <img src={items[0]} alt="Item Central" />
                </div>
            </div>
        );
    }

    return (
        <div className="rotating-carousel-container">
            
            {/* Botões de Navegação */}
            <button 
                onClick={handlePrev} 
                className="carousel-nav-button prev"
                aria-label="Anterior"
            >
                <ChevronLeft className="h-6 w-6" />
            </button>
            
            <button 
                onClick={handleNext} 
                className="carousel-nav-button next"
                aria-label="Próximo"
            >
                <ChevronRight className="h-6 w-6" />
            </button>

            {/* Renderiza todos os itens e aplica a classe de posição correta */}
            {items.map((itemUrl, index) => {
                const positionClass = getPositionClass(index, activeIndex, totalItems);
                
                // Se o item não tiver uma posição visível, ele não é renderizado com a classe de posição
                if (!positionClass) return null;

                return (
                    <div
                        key={index}
                        className={cn("carousel-item", positionClass)}
                        style={{ zIndex: getZIndex(positionClass) }}
                        onClick={() => {
                            // Se clicar em um item lateral, ele se torna o item central
                            if (index !== activeIndex) {
                                setActiveIndex(index);
                            }
                        }}
                    >
                        <img src={itemUrl} alt={`Item ${index + 1}`} />
                    </div>
                );
            })}
        </div>
    );
};

export default RotatingFixedCarousel;