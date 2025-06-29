import React, { useState, useRef, useCallback, useEffect } from "react";
import { motion, useMotionValue, useTransform, PanInfo } from "framer-motion";
import { MapPoint } from "./MapPoint";
import { playBarrierCollisionSound } from "../../utils/soundManager";
import { PlayerShip } from "./PlayerShip";

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
    description: "Uma estação espacial comercial movimentada",
    image:
      "https://images.pexels.com/photos/586063/pexels-photo-586063.jpeg",
  },
  {
    id: "nebulosa-crimson",
    x: 80,
    y: 70,
    name: "Nebulosa Crimson",
    type: "nebula",
    description: "Uma nebulosa misteriosa com energia estranha",
    image:
      "https://images.pexels.com/photos/1169754/pexels-photo-1169754.jpeg",
  },
  {
    id: "mundo-gelado",
    x: 15,
    y: 75,
    name: "Mundo Gelado",
    type: "planet",
    description: "Um planeta congelado com cristais de gelo",
    image:
      "https://images.pexels.com/photos/1169754/pexels-photo-1169754.jpeg",
  },
  {
    id: "planeta-limite",
    x: 85,
    y: 25,
    name: "Planeta Limite",
    type: "planet",
    description: "Um planeta na fronteira do espaço conhecido",
    image:
      "https://images.pexels.com/photos/87651/earth-blue-planet-globe-planet-87651.jpeg",
  },
  {
    id: "estacao-borda",
    x: 40,
    y: 80,
    name: "Estação da Borda",
    type: "station",
    description: "Uma estação de pesquisa isolada",
    image:
      "https://images.pexels.com/photos/586063/pexels-photo-586063.jpeg",
  },
  {
    id: "campo-asteroides",
    x: 70,
    y: 50,
    name: "Campo de Asteroides",
    type: "asteroid",
    description: "Um campo denso de asteroides ricos em minerais",
    image:
      "https://images.pexels.com/photos/1169754/pexels-photo-1169754.jpeg",
  },
];

export const GalaxyMap: React.FC<GalaxyMapProps> = ({ onPointClick }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isDecelerating, setIsDecelerating] = useState(false);
  const [nearbyPoint, setNearbyPoint] = useState<string | null>(null);

  // Motion values for ship position
  const shipX = useMotionValue(50);
  const shipY = useMotionValue(50);

  // Transform ship position to rotation based on movement
  const shipRotation = useTransform([shipX, shipY], ([x, y]) => {
    const centerX = 50;
    const centerY = 50;
    const angle = Math.atan2(y - centerY, x - centerX) * (180 / Math.PI);
    return angle + 90; // Adjust for ship sprite orientation
  });

  // Check proximity to points
  const checkProximity = useCallback((x: number, y: number) => {
    const threshold = 8; // Proximity threshold
    let closestPoint: string | null = null;
    let minDistance = Infinity;

    GALAXY_POINTS.forEach((point) => {
      const distance = Math.sqrt(
        Math.pow(x - point.x, 2) + Math.pow(y - point.y, 2),
      );
      if (distance < threshold && distance < minDistance) {
        minDistance = distance;
        closestPoint = point.id;
      }
    });

    if (closestPoint !== nearbyPoint) {
      setNearbyPoint(closestPoint);
    }
  }, [nearbyPoint]);

  // Enhanced boundary checking with collision sound
  const checkBoundaries = useCallback((x: number, y: number) => {
    const margin = 5;
    let newX = x;
    let newY = y;
    let hitBoundary = false;

    if (x < margin) {
      newX = margin;
      hitBoundary = true;
    } else if (x > 100 - margin) {
      newX = 100 - margin;
      hitBoundary = true;
    }

    if (y < margin) {
      newY = margin;
      hitBoundary = true;
    } else if (y > 100 - margin) {
      newY = 100 - margin;
      hitBoundary = true;
    }

    if (hitBoundary) {
      playBarrierCollisionSound().catch(() => {
        // Ignore sound errors
      });
    }

    return { x: newX, y: newY, hitBoundary };
  }, []);

  // Enhanced pan handler with better touch support
  const handlePan = useCallback(
    (event: any, info: PanInfo) => {
      if (!containerRef.current) return;

      const rect = containerRef.current.getBoundingClientRect();
      const containerWidth = rect.width;
      const containerHeight = rect.height;

      // Get current position
      const currentX = shipX.get();
      const currentY = shipY.get();

      // Calculate movement delta as percentage
      const deltaXPercent = (info.delta.x / containerWidth) * 100;
      const deltaYPercent = (info.delta.y / containerHeight) * 100;

      // Apply movement with sensitivity adjustment for mobile
      const sensitivity = 1.2; // Increased sensitivity for better mobile experience
      const newX = currentX + deltaXPercent * sensitivity;
      const newY = currentY + deltaYPercent * sensitivity;

      // Check boundaries and apply constraints
      const { x: constrainedX, y: constrainedY } = checkBoundaries(newX, newY);

      // Update ship position
      shipX.set(constrainedX);
      shipY.set(constrainedY);

      // Check proximity to points
      checkProximity(constrainedX, constrainedY);
    },
    [shipX, shipY, checkBoundaries, checkProximity],
  );

  // Handle pan start
  const handlePanStart = useCallback(() => {
    setIsDragging(true);
    setIsDecelerating(false);
  }, []);

  // Enhanced pan end with momentum
  const handlePanEnd = useCallback(
    (event: any, info: PanInfo) => {
      setIsDragging(false);

      // Apply momentum/inertia effect
      const velocityX = info.velocity.x;
      const velocityY = info.velocity.y;
      const speed = Math.sqrt(velocityX * velocityX + velocityY * velocityY);

      if (speed > 100) {
        // Only apply momentum if there's significant velocity
        setIsDecelerating(true);

        const currentX = shipX.get();
        const currentY = shipY.get();

        // Calculate momentum distance (reduced for better control)
        const momentumFactor = 0.1;
        const momentumX = (velocityX * momentumFactor) / 10;
        const momentumY = (velocityY * momentumFactor) / 10;

        const targetX = currentX + momentumX;
        const targetY = currentY + momentumY;

        // Apply boundaries to target position
        const { x: finalX, y: finalY } = checkBoundaries(targetX, targetY);

        // Animate to final position with momentum
        const controls = {
          x: finalX,
          y: finalY,
          transition: {
            type: "tween",
            ease: "easeOut",
            duration: 0.8,
          },
        };

        // Apply the momentum animation
        shipX.set(finalX);
        shipY.set(finalY);

        // Check final proximity
        checkProximity(finalX, finalY);

        // Reset deceleration state
        setTimeout(() => setIsDecelerating(false), 800);
      }
    },
    [shipX, shipY, checkBoundaries, checkProximity],
  );

  // Handle point clicks
  const handlePointClick = useCallback(
    (pointId: string) => {
      if (isDragging) return; // Prevent clicks during drag

      const point = GALAXY_POINTS.find((p) => p.id === pointId);
      if (point) {
        onPointClick(pointId, point);
      }
    },
    [isDragging, onPointClick],
  );

  // Touch event handlers for better mobile support
  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    e.preventDefault(); // Prevent scrolling
  }, []);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    e.preventDefault(); // Prevent scrolling
  }, []);

  return (
    <div
      ref={containerRef}
      className="relative w-full h-80 bg-gradient-to-br from-indigo-900 via-purple-900 to-black rounded-2xl overflow-hidden border-2 border-purple-300 shadow-2xl"
      style={{
        backgroundImage: `
          radial-gradient(circle at 20% 30%, rgba(255, 255, 255, 0.1) 1px, transparent 1px),
          radial-gradient(circle at 60% 70%, rgba(255, 255, 255, 0.08) 1px, transparent 1px),
          radial-gradient(circle at 80% 20%, rgba(255, 255, 255, 0.06) 1px, transparent 1px),
          radial-gradient(circle at 30% 80%, rgba(255, 255, 255, 0.04) 1px, transparent 1px),
          radial-gradient(circle at 90% 60%, rgba(255, 255, 255, 0.05) 1px, transparent 1px)
        `,
        backgroundSize: "100px 100px, 150px 150px, 200px 200px, 120px 120px, 180px 180px",
        touchAction: "none", // Prevent default touch behaviors
      }}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
    >
      {/* Background stars animation */}
      <div className="absolute inset-0 overflow-hidden">
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
              scale: [0.8, 1.2, 0.8],
            }}
            transition={{
              duration: 2 + Math.random() * 3,
              repeat: Infinity,
              delay: Math.random() * 2,
            }}
          />
        ))}
      </div>

      {/* Galaxy points */}
      {GALAXY_POINTS.map((point) => (
        <MapPoint
          key={point.id}
          point={point}
          isNearby={nearbyPoint === point.id}
          onClick={() => handlePointClick(point.id)}
          isDragging={isDragging}
          style={{
            left: `${point.x}%`,
            top: `${point.y}%`,
            transform: "translate(-50%, -50%)",
          }}
        />
      ))}

      {/* Player ship with enhanced touch controls */}
      <motion.div
        className="absolute z-20 cursor-grab active:cursor-grabbing"
        style={{
          left: useTransform(shipX, (x) => `${x}%`),
          top: useTransform(shipY, (y) => `${y}%`),
          transform: "translate(-50%, -50%)",
          touchAction: "none", // Prevent default touch behaviors
        }}
        drag
        dragMomentum={false} // We handle momentum manually
        dragElastic={0.1}
        dragConstraints={{
          left: 0,
          right: 0,
          top: 0,
          bottom: 0,
        }}
        onPan={handlePan}
        onPanStart={handlePanStart}
        onPanEnd={handlePanEnd}
        whileDrag={{ scale: 1.1 }}
        // Enhanced touch event handling
        onTouchStart={(e) => e.stopPropagation()}
        onTouchMove={(e) => e.stopPropagation()}
      >
        <PlayerShip
          rotation={shipRotation}
          isNearPoint={!!nearbyPoint}
          isDragging={isDragging}
          isDecelerating={isDecelerating}
        />
      </motion.div>

      {/* Proximity indicator */}
      {nearbyPoint && (
        <motion.div
          className="absolute bottom-4 left-1/2 transform -translate-x-1/2 bg-black/80 text-white px-4 py-2 rounded-full text-sm font-medium backdrop-blur-sm border border-white/20"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 20 }}
        >
          <div className="flex items-center space-x-2">
            <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
            <span>
              Próximo a{" "}
              {GALAXY_POINTS.find((p) => p.id === nearbyPoint)?.name}
            </span>
          </div>
        </motion.div>
      )}

      {/* Touch instructions for mobile */}
      <div className="absolute top-4 left-4 text-white/70 text-xs bg-black/50 px-3 py-2 rounded-lg backdrop-blur-sm border border-white/20">
        <div className="flex items-center space-x-2">
          <span>📱</span>
          <span>Arraste para navegar</span>
        </div>
      </div>
    </div>
  );
};