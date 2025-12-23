import React from 'react';
import { TreeState, GestureType } from '../types';

interface OverlayProps {
  isLoading: boolean;
  currentState: TreeState;
  detectedGesture: GestureType;
  cameraError: boolean;
}

const Overlay: React.FC<OverlayProps> = ({ isLoading, currentState, detectedGesture, cameraError }) => {
  return (
    <div className="absolute inset-0 pointer-events-none z-10 flex flex-col justify-between p-6">
      
      {/* Header */}
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-3xl font-bold text-gold drop-shadow-[0_0_10px_rgba(255,215,0,0.8)] tracking-wider uppercase font-serif">
            Holo-Xmas
          </h1>
          <p className="text-white/70 text-sm tracking-widest mt-1">Interactive 3D Particle Cloud</p>
        </div>
        
        {/* Status Badge */}
        <div className={`px-4 py-2 rounded-full border ${
          detectedGesture !== GestureType.NONE ? 'border-gold bg-gold/20' : 'border-white/20 bg-black/20'
        } backdrop-blur-md transition-colors duration-300`}>
          <span className="text-xs font-mono text-white">
            GESTURE: <span className="font-bold text-gold">{detectedGesture}</span>
          </span>
        </div>
      </div>

      {/* Center Messages */}
      <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 text-center w-full">
        {isLoading && (
          <div className="flex flex-col items-center gap-3">
             <div className="w-12 h-12 border-4 border-gold border-t-transparent rounded-full animate-spin"></div>
             <p className="text-gold font-light tracking-widest animate-pulse">INITIALIZING VISION ENGINE...</p>
          </div>
        )}

        {cameraError && (
          <div className="bg-red-900/80 border border-red-500 p-6 rounded-lg max-w-md">
            <h2 className="text-white font-bold text-xl mb-2">Camera Access Required</h2>
            <p className="text-white/80">Please enable camera access to interact with the experience.</p>
          </div>
        )}
      </div>

      {/* Footer / Instructions */}
      <div className="flex justify-center pb-4">
         <div className="grid grid-cols-2 md:grid-cols-4 gap-4 bg-black/40 backdrop-blur-md p-4 rounded-xl border border-white/10">
            <InstructionItem 
              icon="✊" 
              label="Fist" 
              action="Assemble Tree" 
              active={detectedGesture === GestureType.FIST || currentState === TreeState.CLOSED} 
            />
            <InstructionItem 
              icon="🖐️" 
              label="Open Hand" 
              action="Scatter Cloud" 
              active={detectedGesture === GestureType.OPEN_PALM || currentState === TreeState.OPEN} 
            />
            <InstructionItem 
              icon="🤏" 
              label="Pinch" 
              action="Focus Memory" 
              active={detectedGesture === GestureType.PINCH || currentState === TreeState.ZOOMED} 
            />
            <InstructionItem 
              icon="↔️" 
              label="Move" 
              action="Rotate View" 
              active={detectedGesture === GestureType.ROTATE} 
            />
         </div>
      </div>
    </div>
  );
};

const InstructionItem: React.FC<{ icon: string; label: string; action: string; active: boolean }> = ({ icon, label, action, active }) => (
  <div className={`flex flex-col items-center text-center transition-opacity duration-300 ${active ? 'opacity-100' : 'opacity-40'}`}>
    <span className="text-2xl mb-1 filter drop-shadow-lg">{icon}</span>
    <span className="text-[10px] uppercase text-gold font-bold">{label}</span>
    <span className="text-[10px] text-white/80">{action}</span>
  </div>
);

export default Overlay;