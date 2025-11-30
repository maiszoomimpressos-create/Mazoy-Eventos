"use client";

import React, { useEffect } from 'react';
import './FixedCenterCarousel.css';

const FixedCenterCarousel: React.FC = () => {
    
    useEffect(() => {
        // Array de URLs de imagens estáticas
        const imgs = [
            "https://picsum.photos/id/1003/900/500",
            "https://picsum.photos/id/1011/900/500",
            "https://picsum.photos/id/1020/900/500",
            "https://picsum.photos/id/1043/900/500",
            "https://picsum.photos/id/1060/900/500",
            "https://picsum.photos/id/1074/900/500",
            "https://picsum.photos/id/1081/900/500"
        ];

        let index = 0;

        const render = () => {
            const mainImage = document.getElementById("main-image") as HTMLImageElement;
            if (!mainImage) return;

            // 1. Card Central
            mainImage.src = imgs[index];

            // 2. Cards Laterais (Esquerda)
            const left1 = document.getElementById("left-1") as HTMLImageElement;
            const left2 = document.getElementById("left-2") as HTMLImageElement;
            const left3 = document.getElementById("left-3") as HTMLImageElement;

            if (left1) left1.src = imgs[(index - 1 + imgs.length) % imgs.length];
            if (left2) left2.src = imgs[(index - 2 + imgs.length) % imgs.length];
            if (left3) left3.src = imgs[(index - 3 + imgs.length) % imgs.length];

            // 3. Cards Laterais (Direita)
            const right1 = document.getElementById("right-1") as HTMLImageElement;
            const right2 = document.getElementById("right-2") as HTMLImageElement;
            const right3 = document.getElementById("right-3") as HTMLImageElement;

            if (right1) right1.src = imgs[(index + 1) % imgs.length];
            if (right2) right2.src = imgs[(index + 2) % imgs.length];
            if (right3) right3.src = imgs[(index + 3) % imgs.length];
        };

        // 4. Botões de Navegação
        const prevButton = document.querySelector(".nav.prev") as HTMLButtonElement;
        const nextButton = document.querySelector(".nav.next") as HTMLButtonElement;

        const handlePrev = () => {
            index = (index - 1 + imgs.length) % imgs.length;
            render();
        };

        const handleNext = () => {
            index = (index + 1) % imgs.length;
            render();
        };

        if (prevButton) prevButton.addEventListener('click', handlePrev);
        if (nextButton) nextButton.addEventListener('click', handleNext);

        // Renderização inicial
        render();

        // Cleanup function para remover event listeners
        return () => {
            if (prevButton) prevButton.removeEventListener('click', handlePrev);
            if (nextButton) nextButton.removeEventListener('click', handleNext);
        };
    }, []);

    return (
        <div className="carousel-container">
            
            <div className="side-left">
                <img className="side-card" id="left-1" alt="Previous 1" />
                <img className="side-card" id="left-2" alt="Previous 2" />
                <img className="side-card" id="left-3" alt="Previous 3" />
            </div>

            <button className="nav prev">◀</button>

            <div className="center-card">
                <img id="main-image" src="" alt="Main Carousel Image" />
            </div>

            <button className="nav next">▶</button>

            <div className="side-right">
                <img className="side-card" id="right-1" alt="Next 1" />
                <img className="side-card" id="right-2" alt="Next 2" />
                <img className="side-card" id="right-3" alt="Next 3" />
            </div>

        </div>
    );
};

export default FixedCenterCarousel;