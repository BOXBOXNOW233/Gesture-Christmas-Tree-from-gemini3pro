import React, { useState, useEffect, useRef } from 'react';
import Scene3D from './components/Scene3D';
import Overlay from './components/Overlay';
import { TreeState, GestureType } from './types';

const App: React.FC = () => {
  const [appState, setAppState] = useState<TreeState>(TreeState.CLOSED);
  const [gesture, setGesture] = useState<GestureType>(GestureType.NONE);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<boolean>(false);
  const audioRef = useRef<HTMLAudioElement>(null);

  useEffect(() => {
    // Attempt to play audio on load, but browsers might block it.
    // We add a listener to the document to play on first click as a fallback.
    const attemptPlay = async () => {
        if(audioRef.current) {
            try {
                await audioRef.current.play();
            } catch(e) {
                console.log("Autoplay blocked, waiting for interaction");
            }
        }
    };
    
    const handleInteraction = () => {
        attemptPlay();
        document.removeEventListener('click', handleInteraction);
        document.removeEventListener('touchstart', handleInteraction);
        document.removeEventListener('keydown', handleInteraction);
    };

    attemptPlay();
    document.addEventListener('click', handleInteraction);
    document.addEventListener('touchstart', handleInteraction);
    document.addEventListener('keydown', handleInteraction);

    return () => {
        document.removeEventListener('click', handleInteraction);
        document.removeEventListener('touchstart', handleInteraction);
        document.removeEventListener('keydown', handleInteraction);
    };
  }, []);

  return (
    <div className="relative w-full h-screen overflow-hidden bg-matte-green text-white font-sans selection:bg-gold selection:text-black">
      
      {/* Background Music: Public Domain Christmas Song (We Wish You a Merry Christmas) */}
      <audio 
        ref={audioRef} 
        src="https://upload.wikimedia.org/wikipedia/commons/e/e6/We_Wish_You_a_Merry_Christmas.ogg" 
        loop 
      />

      {/* 3D Canvas Layer */}
      <Scene3D 
        onStateChange={setAppState} 
        onGestureChange={setGesture}
        onLoadingChange={setLoading}
        onError={setError}
      />

      {/* UI Overlay Layer */}
      <Overlay 
        isLoading={loading} 
        currentState={appState} 
        detectedGesture={gesture} 
        cameraError={error}
      />
      
      {/* Vignette Overlay for Cinematic Effect */}
      <div className="absolute inset-0 pointer-events-none bg-[radial-gradient(circle_at_center,transparent_0%,rgba(0,0,0,0.6)_100%)] z-5"></div>
    </div>
  );
};

export default App;