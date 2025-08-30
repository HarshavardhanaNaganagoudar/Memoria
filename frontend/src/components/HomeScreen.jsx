import React, { useEffect, useState } from 'react';

const HomeScreen = ({ onLogMemory, onTestMemory, onTrackMemory }) => {
  const [isHovering, setIsHovering] = useState(false);

  useEffect(() => {
    // Load Zen Loop font
    const link = document.createElement('link');
    link.href = 'https://fonts.googleapis.com/css2?family=Zen+Loop:ital@0;1&display=swap';
    link.rel = 'stylesheet';
    document.head.appendChild(link);
  }, []);

  const handleLogMemory = () => {
    console.log('Navigate to Log Memory');
    if (onLogMemory) {
      onLogMemory();
    }
  };

  const handleTestMemory = () => {
    console.log('Navigate to Test Memory');
    if (onTestMemory) {
      onTestMemory();
    }
  };

  const handleTrackMemory = () => {
    console.log('Navigate to Track Memory');
    if (onTrackMemory) {
      onTrackMemory();
    }
  };

  return (
    <div className="min-h-screen w-full bg-gray-50 flex flex-col items-center justify-center">
      {/* Brain Image with Video Hover */}
      <div 
        className="mb-8 relative cursor-pointer"
        onMouseEnter={() => setIsHovering(true)}
        onMouseLeave={() => setIsHovering(false)}
      >
        <img 
          src="/images/brain-art.png"
          alt="Brain Art"
          className={`w-45 h-45 object-contain transition-transform duration-300 ${
            isHovering ? 'scale-105' : ''
          }`}
        />
        
        {/* Video Overlay */}
        {isHovering && (
          <div className="absolute top-1/2 left-full ml-4 transform -translate-x-1/2 -translate-y-1/2 w-48 h-36 rounded-xl overflow-hidden shadow-2xl border-2 border-white animate-fade-in z-10">
            <video
              autoPlay
              muted
              loop
              className="w-full h-full object-cover"
              src="/videos/zen_stones.mp4" // Update this path to your video file
            >
              Your browser does not support the video tag.
            </video>
          </div>
        )}
      </div>

      {/* App Title */}
      <h1 className="text-8xl text-gray-800 mb-12 tracking-wide" style={{ fontFamily: '"Zen Loop", cursive' }}>
        Memoria
      </h1>

      {/* Action Buttons */}
      <div className="flex flex-col sm:flex-row gap-6 w-full max-w-4xl px-4">
        <button
          onClick={handleLogMemory}
          className="flex-1 px-8 py-4 bg-white text-gray-700 border border-gray-300 rounded-full hover:bg-gray-50 hover:border-gray-400 transition-all duration-200 shadow-sm font-medium text-center text-lg"
        >
          Log Your Memory
        </button>
                
        <button
          onClick={handleTestMemory}
          className="flex-1 px-8 py-4 bg-white text-gray-700 border border-gray-300 rounded-full hover:bg-gray-50 hover:border-gray-400 transition-all duration-200 shadow-sm font-medium text-center text-lg"
        >
          Test Your Memory
        </button>
                
        <button
          onClick={handleTrackMemory}
          className="flex-1 px-8 py-4 bg-white text-gray-700 border border-gray-300 rounded-full hover:bg-gray-50 hover:border-gray-400 transition-all duration-200 shadow-sm font-medium text-center text-lg"
        >
          Track Your Memory
        </button>
      </div>

      {/* Custom styles for fade-in animation */}
      <style jsx>{`
        .animate-fade-in {
          animation: fadeIn 0.3s ease-in-out;
        }
        
        @keyframes fadeIn {
          from {
            opacity: 0;
            transform: translate(-50%, -50%) scale(0.8);
          }
          to {
            opacity: 1;
            transform: translate(-50%, -50%) scale(1);
          }
        }
      `}</style>
    </div>
  );
};

export default HomeScreen;