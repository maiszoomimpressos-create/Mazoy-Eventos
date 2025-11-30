"use client";

import React, { useState } from "react";
import "./RotatingFixedCarousel.css";

interface RotatingFixedCarouselProps {
  items: string[];
}

interface Position {
  scale: number;
  x: number;
  y: number;
  zIndex: number;
  opacity: number;
}

export default function RotatingFixedCarousel({ items }: RotatingFixedCarouselProps) {
  const [index, setIndex] = useState(0);

  const rotateRight = () => {
    setIndex((prev) => (prev + 1) % items.length);
  };

  const rotateLeft = () => {
    setIndex((prev) => (prev - 1 + items.length) % items.length);
  };

  const getPosition = (i: number): Position => {
    const total = items.length;
    if (total === 0) return { scale: 0, x: 0, y: 0, zIndex: 1, opacity: 0 };
    
    const dist = (i - index + total) % total;

    // 0 é o central / ativo
    if (dist === 0) return { scale: 1, x: 0, y: 0, zIndex: 10, opacity: 1 };

    // laterais
    // Requisitos: 1° lateral: offset Y = 30px, 2°: 60px, 3°: 90px
    const map: { [key: number]: { scale: number; x: number; y: number; z: number } } = {
      1: { scale: 0.85, x: 150, y: 30, z: 9 },
      2: { scale: 0.75, x: 250, y: 60, z: 8 },
      3: { scale: 0.65, x: 350, y: 90, z: 7 },
    };

    // lado direito
    if (dist <= 3) {
      const { scale, x, y, z } = map[dist];
      return { scale, x, y, zIndex: z, opacity: 0.9 };
    }

    // lado esquerdo (rota reversa)
    const leftDist = total - dist;
    if (leftDist <= 3) {
      const { scale, x, y, z } = map[leftDist];
      return { scale, x: -x, y, zIndex: z, opacity: 0.9 };
    }

    // itens muito atrás
    return { scale: 0.6, x: 0, y: 120, zIndex: 1, opacity: 0 };
  };
  
  // Ensure we have enough items for the effect to look right (at least 7)
  const canRotate = items.length >= 7;

  return (
    <div className="rfc-container">
      {canRotate && (
        <button className="rfc-btn left" onClick={rotateLeft} aria-label="Previous">
          ◀
        </button>
      )}

      {items.map((item, i) => {
        const pos = getPosition(i);
        
        // Only render items that are visible or transitioning (opacity > 0)
        if (pos.opacity === 0 && pos.zIndex === 1 && i !== index) return null;

        return (
          <div
            key={i}
            className="rfc-item"
            style={{
              transform: `translateX(${pos.x}px) translateY(${pos.y}px) scale(${pos.scale})`,
              zIndex: pos.zIndex,
              opacity: pos.opacity,
              // Allow clicking only on visible items
              pointerEvents: pos.opacity > 0.1 ? 'auto' : 'none',
              cursor: pos.opacity > 0.1 ? 'pointer' : 'default',
            }}
            onClick={() => {
                // If clicking a side item, rotate to make it central
                if (i !== index) {
                    setIndex(i);
                }
            }}
          >
            <img src={item} alt={`Carousel item ${i + 1}`} />
          </div>
        );
      })}

      {canRotate && (
        <button className="rfc-btn right" onClick={rotateRight} aria-label="Next">
          ▶
        </button>
      )}
    </div>
  );
}