"use client";

import React, { useState } from "react";
import "./RotatingFixedCarousel.css";
import { ImageOff } from "lucide-react";

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

    if (dist === 0)
      return { scale: 1, x: 0, y: 0, opacity: 1, zIndex: 10 };

    const map: { [key: number]: { scale: number; x: number; y: number; zIndex: number } } = {
      1: { scale: 0.85, x: 150, y: 30, zIndex: 9 },
      2: { scale: 0.75, x: 250, y: 60, zIndex: 8 },
      3: { scale: 0.65, x: 350, y: 90, zIndex: 7 },
    };

    if (dist <= 3) {
        const { zIndex, ...rest } = map[dist];
        return { ...rest, zIndex, opacity: 0.9 };
    }

    const leftDist = total - dist;
    if (leftDist <= 3) {
      const m = map[leftDist];
      return { scale: m.scale, x: -m.x, y: m.y, zIndex: m.zIndex, opacity: 0.9 };
    }

    return { scale: 0.6, x: 0, y: 120, opacity: 0, zIndex: 1 };
  };
  
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
            <img 
                src={item} 
                alt={`Carousel item ${i + 1}`} 
                onError={(e) => {
                    // Substitui a imagem por um placeholder visual em caso de erro
                    e.currentTarget.onerror = null; 
                    e.currentTarget.style.display = 'none';
                    const parent = e.currentTarget.parentElement;
                    if (parent) {
                        parent.style.backgroundColor = '#333';
                        parent.style.display = 'flex';
                        parent.style.alignItems = 'center';
                        parent.style.justifyContent = 'center';
                        parent.innerHTML = `<div style="color: #FFC400; text-align: center;"><svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-image-off"><line x1="2" x2="22" y1="2" y2="22"/><path d="M10.5 5H20a2 2 0 0 1 2 2v10a2 2 0 0 1-.5 1.37"/><path d="M9.5 3.5a1.5 1.5 0 1 0 0 3 1.5 1.5 0 0 0 0-3z"/><path d="M2 20h17.5"/><path d="M15 10l4.5 4.5"/><path d="M10 10l-5 5"/></svg><span style="font-size: 10px; display: block; margin-top: 4px;">Falha ao carregar</span></div>`;
                    }
                }}
            />
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