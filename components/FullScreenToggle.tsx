
import React, { useState, useEffect } from 'react';

export const FullScreenToggle: React.FC = () => {
  const [isFullscreen, setIsFullscreen] = useState(!!document.fullscreenElement);

  useEffect(() => {
    const handleChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener('fullscreenchange', handleChange);
    return () => document.removeEventListener('fullscreenchange', handleChange);
  }, []);

  const handleToggle = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch((err) => {
        console.error(`Error attempting to enable fullscreen: ${err.message}`);
      });
    } else {
      document.exitFullscreen();
    }
  };
  
  return (
    <button 
      onClick={handleToggle}
      className="fixed top-2.5 left-2.5 z-[7000] px-4 py-2 bg-slate-600 text-white rounded-md cursor-pointer hover:bg-slate-500"
    >
      {isFullscreen ? 'Exit Fullscreen' : 'Enter Fullscreen'}
    </button>
  );
};
