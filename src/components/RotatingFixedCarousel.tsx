"use client";

import React, { useState, useCallback, useMemo } from 'react';
import './RotatingFixedCarousel.css';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';

interface RotatingFixedCarouselProps {
    items: string[]; // Array de URLs de imagens
}

// Define as 9 posições fixas no carrossel (4 esquerda, 1 centro, 4 direita)
const POSITIONS = [
    'position-center',
    'position-right-1',
    'position-right-2',
    'position-right-3',
    'position-right-4', // NOVO
    'position-left-4',  // NOVO
    'position-left-3',
    'position-left-2',
    'position-left-1',
] as const;

type PositionClass = typeof POSITIONS[number];

// Mapeia o índice do item para a classe de posição no carrossel
const getPositionClass = (itemIndex: number, activeIndex: number, totalItems: number): PositionClass | null => {
    const diff = (itemIndex - activeIndex + totalItems) % totalItems;
    
    // O carrossel tem 9 slots visíveis (4 esquerda, 1 centro, 4 direita)
    if (diff === 0) return 'position-center';
    if (diff === 1) return 'position-right-1';
    if (diff === 2) return 'position-right-2';
    if (diff === 3) return 'position-right-3';
    if (diff === 4) return 'position-right-4'; // NOVO
    
    // Para a rotação circular, os itens mais distantes à esquerda
    if (diff === totalItems - 1) return 'position-left-1';
    if (diff === totalItems - 2) return 'position-left-2';
    if (diff === totalItems - 3) return 'position-left-3';
    if (diff === totalItems - 4) return 'position-left-4'; // NOVO

    // Se o item estiver fora das 9 posições visíveis, ele não recebe classe de posição
    return null;
};

// Define o z-index baseado na posição para garantir a sobreposição correta
const getZIndex = (positionClass: PositionClass | null): number => {
    if (positionClass === 'position-center') return 100;
    if (positionClass?.includes('1')) return 90;
    if (positionClass?.includes('2')) return 80;
    if (positionClass?.includes('3')) return 70;
    if (positionClass?.includes('4')) return 60; // NOVO
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
    
    // O carrossel agora requer um mínimo de 9 itens para preencher todas as posições (4+1+4)
    if (totalItems < 9) {
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