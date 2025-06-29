import React, { useState, useRef, useCallback } from "react";
import { motion, useMotionValue, useTransform, PanInfo } from "framer-motion";
import { MapPoint } from "./MapPoint";
import { playBarrierCollisionSound } from "../../utils/soundManager";

interface MapPointData {
  id: string;
  x: number;
  y: number;
  name: string;
  type: "planet" | "station" | "nebula" | "asteroid";
  description: string;
  image?: string;
}

interface GalaxyMapProps {
  onPointClick: (pointId: string, pointData: MapPointData) => void;
}

const GALAXY_POINTS: MapPointData[] = [
  {
    id: "terra-nova",
    x: 20,
    y: 30,
    name: "Terra Nova",
    type: "planet",
    description: "Um planeta verdejante cheio de vida",
    image:
      "https://images.pexels.com/photos/87651/earth-blue-planet-globe-planet-87651.jpeg",
  },
  {
    id: "estacao-omega",
    x: 60,
    y: 20,
    name: "Estação Omega",
    type: "station",
    description: "Uma estação espacial avançada",
    image:
      "https://images.pexels.com/photos/586063/pexels-photo-586063.jpeg",
  },
  {
    id: "nebulosa-crimson",
    x: 80,
    y: 70,
    name: "Nebulosa Crimson",
    type: "nebula",
    description: "Uma nebulosa misteriosa de cor vermelha",
    image:
      "https://images.pexels.com/photos/1169754/pexels-photo-1169754.jpeg",
  },
  {
    id: "mundo-gelado",
    x: 15,
    y: 75,
    name: "Mundo Gelado",
    type: "planet",
    description: "Um planeta coberto de gelo eterno",
    image:
      "https://images.pexels.com/photos/1169754/pexels-photo-1169754.jpeg",
  },
  {
    id: "planeta-limite",
    x: 85,
    y: 25,
    name: "Planeta Limite",
    type: "planet",
    description: "O último planeta conhecido na galáxia",
    image:
      "https://images.pexels.com/photos/87651/earth-blue-planet-globe-planet-87651.jpeg",
  },
  {
    id: "estacao-borda",
    x: 40,
    y: 85,
    name: "Estação da Borda",
    type: "station",
    description: "Uma estação na fronteira do espaço conhecido",
    image:
      "https://images.pexels.com/photos/586063/pexels-photo-586063.jpeg",
  },
  {
    id: "campo-asteroides",
    x: 70,
    y: 50,
    name: "Campo de Asteroides",
    type: "asteroid",
    description: "Uma região perigosa cheia de asteroides",
    image:
      "https://images.pexels.com/photos/1169754/pexels-photo-1169754.jpeg",
  },
];

export const GalaxyMap: React.FC<GalaxyMapProps> = ({ onPointClick }) => {
  const [shipPosition, setShipPosition] = useState({ x: 50, y: 50 });
  const [isDragging, setIsDragging] = useState(false);
  const [isDecelerating, setIsDecelerating] = useState(false);
  const constraintsRef = useRef<HTMLDivElement>(null);

  const shipX = useMotionValue(shipPosition.x);
  const shipY = useMotionValue(shipPosition.y);

  const shipRotation = useTransform(
    [shipX, shipY],
    ([x, y]) => {
      const deltaX = x - shipPosition.x;
      const deltaY = y - shipPosition.y;
      return Math.atan2(deltaY, deltaX) * (180 / Math.PI) + 90;
    },
  );

  const checkCollisionWithBoundaries = useCallback(
    (x: number, y: number): { x: number; y: number } => {
      const margin = 5;
      let newX = x;
      let newY = y;
      let collided = false;

      if (x < margin) {
        newX = margin;
        collided = true;
      } else if (x > 100 - margin) {
        newX = 100 - margin;
        collided = true;
      }

      if (y < margin) {
        newY = margin;
        collided = true;
      } else if (y > 100 - margin) {
        newY = 100 - margin;
        collided = true;
      }

      if (collided) {
        playBarrierCollisionSound().catch(() => {});
      }

      return { x: newX, y: newY };
    },
    [],
  );

  const isNearPoint = useCallback((pointData: MapPointData): boolean => {
    const distance = Math.sqrt(
      Math.pow(shipPosition.x - pointData.x, 2) +
        Math.pow(shipPosition.y - pointData.y, 2),
    );
    return distance < 8;
  }, [shipPosition]);

  const handleDragStart = useCallback(() => {
    setIsDragging(true);
    setIsDecelerating(false);
  }, []);

  const handleDrag = useCallback(
    (event: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) => {
      if (!constraintsRef.current) return;

      const rect = constraintsRef.current.getBoundingClientRect();
      const x = ((info.point.x - rect.left) / rect.width) * 100;
      const y = ((info.point.y - rect.top) / rect.height) * 100;

      const constrainedPosition = checkCollisionWithBoundaries(x, y);
      
      shipX.set(constrainedPosition.x);
      shipY.set(constrainedPosition.y);
      setShipPosition(constrainedPosition);
    },
    [checkCollisionWithBoundaries, shipX, shipY],
  );

  const handleDragEnd = useCallback(
    (event: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) => {
      setIsDragging(false);
      setIsDecelerating(true);

      // Check if near any point for interaction
      const nearbyPoint = GALAXY_POINTS.find((point) => isNearPoint(point));
      if (nearbyPoint) {
        onPointClick(nearbyPoint.id, nearbyPoint);
      }

      // Deceleration effect
      setTimeout(() => {
        setIsDecelerating(false);
      }, 500);
    },
    [isNearPoint, onPointClick],
  );

  // Touch event handlers for mobile support
  const handleTouchStart = useCallback((event: React.TouchEvent) => {
    event.preventDefault();
    handleDragStart();
  }, [handleDragStart]);

  const handleTouchMove = useCallback((event: React.TouchEvent) => {
    event.preventDefault();
    if (!isDragging || !constraintsRef.current) return;

    const touch = event.touches[0];
    const rect = constraintsRef.current.getBoundingClientRect();
    const x = ((touch.clientX - rect.left) / rect.width) * 100;
    const y = ((touch.clientY - rect.top) / rect.height) * 100;

    const constrainedPosition = checkCollisionWithBoundaries(x, y);
    
    shipX.set(constrainedPosition.x);
    shipY.set(constrainedPosition.y);
    setShipPosition(constrainedPosition);
  }, [isDragging, checkCollisionWithBoundaries, shipX, shipY]);

  const handleTouchEnd = useCallback((event: React.TouchEvent) => {
    event.preventDefault();
    setIsDragging(false);
    setIsDecelerating(true);

    // Check if near any point for interaction
    const nearbyPoint = GALAXY_POINTS.find((point) => isNearPoint(point));
    if (nearbyPoint) {
      onPointClick(nearbyPoint.id, nearbyPoint);
    }

    // Deceleration effect
    setTimeout(() => {
      setIsDecelerating(false);
    }, 500);
  }, [isNearPoint, onPointClick]);

  return (
    <div className="relative w-full h-96 overflow-hidden">
      {/* Galaxy Background */}
      <div
        ref={constraintsRef}
        className="absolute inset-0 bg-gradient-to-br from-indigo-900 via-purple-900 to-black"
        style={{
          backgroundImage: `
            radial-gradient(2px 2px at 20px 30px, #eee, transparent),
            radial-gradient(2px 2px at 40px 70px, rgba(255,255,255,0.8), transparent),
            radial-gradient(1px 1px at 90px 40px, #fff, transparent),
            radial-gradient(1px 1px at 130px 80px, rgba(255,255,255,0.6), transparent),
            radial-gradient(2px 2px at 160px 30px, #ddd, transparent)
          `,
          backgroundRepeat: "repeat",
          backgroundSize: "200px 100px",
        }}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        {/* Animated stars */}
        {[...Array(50)].map((_, i) => (
          <motion.div
            key={i}
            className="absolute w-1 h-1 bg-white rounded-full opacity-60"
            style={{
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`,
            }}
            animate={{
              opacity: [0.3, 0.8, 0.3],
              scale: [0.8, 1, 0.8],
            }}
            transition={{
              duration: 2 + Math.random() * 3,
              repeat: Infinity,
              delay: Math.random() * 2,
            }}
          />
        ))}

        {/* Galaxy Points */}
        {GALAXY_POINTS.map((point) => (
          <div
            key={point.id}
            className="absolute transform -translate-x-1/2 -translate-y-1/2"
            style={{
              left: `${point.x}%`,
              top: `${point.y}%`,
            }}
          >
            <MapPoint
              point={point}
              isNearby={isNearPoint(point)}
              onClick={() => onPointClick(point.id, point)}
              isDragging={isDragging}
            />
          </div>
        ))}

        {/* Player Ship */}
        <motion.div
          className="absolute transform -translate-x-1/2 -translate-y-1/2 cursor-grab active:cursor-grabbing touch-none"
          style={{
            left: `${shipPosition.x}%`,
            top: `${shipPosition.y}%`,
          }}
          drag
          dragConstraints={constraintsRef}
          dragElastic={0}
          dragMomentum={false}
          onDragStart={handleDragStart}
          onDrag={handleDrag}
          onDragEnd={handleDragEnd}
          whileDrag={{ scale: 1.1 }}
        >
          <motion.div
            className="relative w-10 h-10 z-20"
            style={{ rotate: shipRotation }}
            animate={{
              scale: isDragging ? 1.1 : 1,
              y: isDragging ? [0, -0.5, 0, 0.5, 0] : [0, -2, 0, 2, 0],
              x: isDragging ? [0, 0.5, 0, -0.5, 0] : [0, 1.5, 0, -1.5, 0],
            }}
            transition={{
              scale: { type: "spring", stiffness: 300, damping: 30 },
              y: {
                duration: isDragging ? 0.15 : 2.2,
                repeat: Infinity,
                ease: isDragging ? "linear" : "easeInOut",
              },
              x: {
                duration: isDragging ? 0.12 : 2.8,
                repeat: Infinity,
                ease: isDragging ? "linear" : "easeInOut",
              },
            }}
          >
            <motion.img
              src="https://cdn.builder.io/api/v1/image/assets%2F4d288afc418148aaaf0f73eedbc53e2b%2F01991177d397420f9f7b55d6a6283724?format=webp&width=800"
              alt="Spaceship"
              className="w-full h-full object-contain drop-shadow-lg"
            />

            {/* Ship trails - apenas quando arrastando */}
            {isDragging && (
              <>
                <motion.div
                  className="absolute w-0.5 h-6 bg-gradient-to-t from-transparent to-blue-400 transform -translate-x-1/2"
                  style={{
                    top: "calc(100% - 12px)",
                    left: "calc(50% - 1px)",
                    zIndex: -1,
                  }}
                  animate={{
                    opacity: [0.3, 0.8, 0.3],
                    scaleY: [0.5, 1, 0.5],
                  }}
                  transition={{
                    duration: 0.5,
                    repeat: Infinity,
                    ease: "easeInOut",
                  }}
                />
                <motion.div
                  className="absolute w-0.5 h-5 bg-gradient-to-t from-transparent to-cyan-300 transform -translate-x-1/2"
                  style={{
                    top: "calc(100% - 8px)",
                    left: "calc(50% - 1px)",
                    zIndex: -1,
                  }}
                  animate={{
                    opacity: [0.2, 0.6, 0.2],
                    scaleY: [0.3, 1, 0.3],
                  }}
                  transition={{
                    duration: 0.3,
                    repeat: Infinity,
                    ease: "easeInOut",
                    delay: 0.1,
                  }}
                />
              </>
            )}
          </motion.div>
        </motion.div>

        {/* Navigation Instructions */}
        <div className="absolute bottom-4 left-4 right-4 text-center">
          <motion.p
            className="text-white/80 text-sm bg-black/30 backdrop-blur-sm rounded-lg px-3 py-2"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 1 }}
          >
            {isDragging
              ? "Navegando pelo espaço..."
              : "Arraste a nave para navegar • Toque nos planetas para explorar"}
          </motion.p>
        </div>
      </div>
    </div>
  );
};