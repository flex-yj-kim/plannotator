import React from 'react';
import spriteSheet from '../sprite_package_pulluphang/sprite.png';

// Sprite specs: 96x96 native, 24 frames, 3 seconds
const NATIVE_SIZE = 96;
const DISPLAY_SIZE = 56;
const FRAMES = 24;
const SCALE = DISPLAY_SIZE / NATIVE_SIZE;
const TOTAL_WIDTH = NATIVE_SIZE * FRAMES * SCALE;

export const TaterSpritePullup: React.FC = () => {
  return (
    <div
      className="absolute pointer-events-none hidden lg:block"
      style={{
        top: 56, // Hangs from bottom of dialog header
        left: 8,
        width: DISPLAY_SIZE,
        height: DISPLAY_SIZE,
        backgroundImage: `url(${spriteSheet})`,
        backgroundSize: `${TOTAL_WIDTH}px ${DISPLAY_SIZE}px`,
        animation: 'tater-pullup 3.5s steps(24) infinite',
        imageRendering: 'pixelated',
      }}
    >
      <style>{`
        @keyframes tater-pullup {
          to { background-position: -${TOTAL_WIDTH}px 0; }
        }
      `}</style>
    </div>
  );
};
