import React, { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import { AppState, Coordinates, DeviceOrientation, MoonPosition } from './types';
import { getMoonBlessing } from './services/geminiService';

// Declare SunCalc for TypeScript since it's loaded from a script tag
declare const SunCalc: any;

const VIEW_THRESHOLD = 5; // degrees within which the moon is considered "in view"
const HORIZONTAL_FOV = 60; // Approximate horizontal field of view for a mobile camera
const VERTICAL_FOV = 80;   // Approximate vertical field of view

const CrosshairIcon: React.FC = () => (
  <svg width="60" height="60" viewBox="0 0 100 100" className="absolute text-black/40 dark:text-white/50">
    <circle cx="50" cy="50" r="40" stroke="currentColor" strokeWidth="2" fill="none" />
    <line x1="50" y1="0" x2="50" y2="20" stroke="currentColor" strokeWidth="2" />
    <line x1="50" y1="80" x2="50" y2="100" stroke="currentColor" strokeWidth="2" />
    <line x1="0" y1="50" x2="20" y2="50" stroke="currentColor" strokeWidth="2" />
    <line x1="80" y1="50" x2="100" y2="50" stroke="currentColor" strokeWidth="2" />
  </svg>
);

const MoonTargetIcon: React.FC<{ isFound: boolean }> = ({ isFound }) => (
  <div className={`
    w-16 h-16 rounded-full transition-all duration-500
    ${isFound 
      ? 'bg-yellow-300 shadow-[0_0_30px_10px_rgba(251,191,36,0.6)] dark:bg-white dark:shadow-[0_0_30px_10px_rgba(255,255,255,0.7)]' 
      : 'bg-black/10 dark:bg-white/30 border-2 border-dashed border-black/30 dark:border-white/50'}
  `}></div>
);

const SunIcon: React.FC = () => (<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="5"></circle><line x1="12" y1="1" x2="12" y2="3"></line><line x1="12" y1="21" x2="12" y2="23"></line><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"></line><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"></line><line x1="1" y1="12" x2="3" y2="12"></line><line x1="21" y1="12" x2="23" y2="12"></line><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"></line><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"></line></svg>);
const MoonIcon: React.FC = () => (<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"></path></svg>);
const CloseIcon: React.FC = () => (<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>);

const App: React.FC = () => {
  const [appState, setAppState] = useState<AppState>(AppState.REQUESTING_PERMISSIONS);
  const [error, setError] = useState<string | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const [orientation, setOrientation] = useState<DeviceOrientation>({ alpha: null, beta: null, gamma: null });
  const [location, setLocation] = useState<Coordinates | null>(null);
  const [moonPosition, setMoonPosition] = useState<MoonPosition | null>(null);
  const [blessing, setBlessing] = useState<string | null>(null);
  const [isFetchingBlessing, setIsFetchingBlessing] = useState(false);
  const [theme, setTheme] = useState<'light' | 'dark'>(() => (localStorage.getItem('lunar-guide-theme') as 'light' | 'dark') || 'dark');
  const geoWatchId = useRef<number | null>(null);

  useEffect(() => {
    const root = document.documentElement;
    if (theme === 'dark') {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
    localStorage.setItem('lunar-guide-theme', theme);
  }, [theme]);

  const handleFinishSearch = useCallback(() => {
    if (videoRef.current && videoRef.current.srcObject) {
      (videoRef.current.srcObject as MediaStream).getTracks().forEach(track => track.stop());
      videoRef.current.srcObject = null;
    }
    if (geoWatchId.current !== null) {
      navigator.geolocation.clearWatch(geoWatchId.current);
      geoWatchId.current = null;
    }
    setAppState(AppState.REQUESTING_PERMISSIONS);
    setLocation(null);
    setOrientation({ alpha: null, beta: null, gamma: null });
    setMoonPosition(null);
    setBlessing(null);
    setError(null);
  }, []);

  const handlePermissions = useCallback(async () => {
    setAppState(AppState.LOADING);
    try {
      const streamPromise = navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment' },
        audio: false,
      });

      const locationPromise = new Promise<Coordinates>((resolve, reject) => {
        geoWatchId.current = navigator.geolocation.watchPosition(
          (position) => {
            const newLocation = {
              latitude: position.coords.latitude,
              longitude: position.coords.longitude,
            };
            setLocation(newLocation);
            resolve(newLocation); // Resolves on the first successful read
          },
          reject,
          { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 }
        );
      });

      const [stream] = await Promise.all([streamPromise, locationPromise]);

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
      setAppState(AppState.READY);
    } catch (err) {
      if (geoWatchId.current !== null) navigator.geolocation.clearWatch(geoWatchId.current);
      console.error(err);
      if (err instanceof GeolocationPositionError) {
        setError('Could not get your location. Please enable location services.');
      } else if (err instanceof Error && (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError')) {
        setError('Camera and location access are required. Please grant permissions and refresh.');
      } else {
        setError('An unexpected error occurred. Please refresh the page.');
      }
      setAppState(AppState.ERROR);
    }
  }, []);

  useEffect(() => {
    const handleOrientation = (event: DeviceOrientationEvent) => setOrientation({ alpha: event.alpha, beta: event.beta, gamma: event.gamma });
    const eventName = 'deviceorientationabsolute' in window ? 'deviceorientationabsolute' : 'deviceorientation';
    window.addEventListener(eventName, handleOrientation);
    return () => window.removeEventListener(eventName, handleOrientation);
  }, []);

  useEffect(() => {
    if (location) {
      const pos = SunCalc.getMoonPosition(new Date(), location.latitude, location.longitude);
      const azimuthDegrees = (pos.azimuth * 180 / Math.PI + 180) % 360;
      const altitudeDegrees = pos.altitude * 180 / Math.PI;
      setMoonPosition({ azimuth: azimuthDegrees, altitude: altitudeDegrees });
    }
  }, [location]);

  const guidance = useMemo(() => {
    if (!orientation.alpha || !orientation.beta || !moonPosition) {
      return { deltaAz: 0, deltaAlt: 0, isMoonInView: false, screenPos: { x: '50%', y: '50%' } };
    }
    let deltaAz = moonPosition.azimuth - orientation.alpha;
    if (deltaAz > 180) deltaAz -= 360;
    if (deltaAz < -180) deltaAz += 360;
    const deviceAltitude = orientation.beta - 90;
    let deltaAlt = moonPosition.altitude - deviceAltitude;
    const isMoonInView = Math.abs(deltaAz) < VIEW_THRESHOLD && Math.abs(deltaAlt) < VIEW_THRESHOLD;
    const x = 50 + (deltaAz / (HORIZONTAL_FOV / 2)) * 50;
    const y = 50 - (deltaAlt / (VERTICAL_FOV / 2)) * 50;
    const screenX = `${Math.max(5, Math.min(95, x))}%`;
    const screenY = `${Math.max(5, Math.min(95, y))}%`;
    return { deltaAz, deltaAlt, isMoonInView, screenPos: { x: screenX, y: screenY } };
  }, [orientation, moonPosition]);
  
  const handleGetBlessing = useCallback(async () => {
    setIsFetchingBlessing(true);
    const text = await getMoonBlessing();
    setBlessing(text);
    setIsFetchingBlessing(false);
  }, []);

  const renderContent = () => {
    switch (appState) {
      case AppState.REQUESTING_PERMISSIONS:
        return (
          <div className="flex flex-col items-center justify-center h-full text-center p-4 relative">
             <button onClick={() => setTheme(t => t === 'dark' ? 'light' : 'dark')} className="absolute top-4 right-4 p-2 rounded-full bg-gray-500/20 hover:bg-gray-500/40 transition-colors">
              {theme === 'dark' ? <SunIcon /> : <MoonIcon />}
            </button>
            <h1 className="text-4xl font-bold mb-2">Lunar Guide AR</h1>
            <p className="text-lg text-gray-600 dark:text-gray-300 mb-8">Find the moon in the night sky.</p>
            <button onClick={handlePermissions} className="px-8 py-4 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xl font-semibold transition-transform transform hover:scale-105">
              Begin Search
            </button>
          </div>
        );
      case AppState.LOADING:
        return (
          <div className="flex flex-col items-center justify-center h-full">
            <div className="w-16 h-16 border-4 border-dashed rounded-full animate-spin border-indigo-500 dark:border-indigo-400"></div>
            <p className="mt-4 text-lg">Calibrating sensors...</p>
          </div>
        );
      case AppState.ERROR:
        return (
          <div className="flex flex-col items-center justify-center h-full text-center p-4">
            <h2 className="text-2xl text-red-500 dark:text-red-400 font-bold mb-4">Error</h2>
            <p className="text-lg">{error}</p>
            <button onClick={handleFinishSearch} className="mt-6 px-4 py-2 bg-indigo-600 text-white rounded-lg">Try Again</button>
          </div>
        );
      case AppState.READY:
        if (!moonPosition || orientation.alpha === null) {
          return (
             <div className="flex flex-col items-center justify-center h-full">
              <div className="w-16 h-16 border-4 border-dashed rounded-full animate-spin border-indigo-500 dark:border-indigo-400"></div>
              <p className="mt-4 text-lg">Waiting for sensor data...</p>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">Please move your device around slowly.</p>
            </div>
          )
        }
        return (
          <div className="relative w-full h-full flex items-center justify-center">
            <div className="absolute top-4 left-4 text-xs font-mono bg-black/30 dark:bg-black/50 p-2 rounded-md text-white">
              {location ? `LAT: ${location.latitude.toFixed(4)} | LON: ${location.longitude.toFixed(4)}` : 'Acquiring location...'}
            </div>
            <button onClick={handleFinishSearch} className="absolute top-2 right-2 p-2 rounded-full bg-black/20 hover:bg-black/40 text-white transition-colors z-20">
              <CloseIcon />
            </button>

            <CrosshairIcon />
            <div className="absolute transition-all duration-200" style={{left: guidance.isMoonInView ? '50%' : guidance.screenPos.x, top: guidance.isMoonInView ? '50%' : guidance.screenPos.y, transform: 'translate(-50%, -50%)'}}>
              <MoonTargetIcon isFound={guidance.isMoonInView} />
            </div>
            
            <div className="absolute bottom-10 left-1/2 -translate-x-1/2 w-full px-4 text-center">
              {guidance.isMoonInView ? (
                 <button onClick={handleGetBlessing} disabled={isFetchingBlessing} className="px-6 py-3 bg-green-600/80 backdrop-blur-sm rounded-lg text-white text-lg font-semibold transition-transform transform hover:scale-105 disabled:bg-gray-500 disabled:cursor-not-allowed">
                   {isFetchingBlessing ? 'Receiving...' : 'Receive Blessing'}
                 </button>
              ) : (
                <div className="bg-black/50 backdrop-blur-sm p-3 rounded-lg text-white">
                  <p className="text-lg font-semibold">
                    {Math.abs(guidance.deltaAz) > VIEW_THRESHOLD && (guidance.deltaAz > 0 ? 'Turn Right' : 'Turn Left')}
                    {Math.abs(guidance.deltaAz) > VIEW_THRESHOLD && Math.abs(guidance.deltaAlt) > VIEW_THRESHOLD && ' & '}
                    {Math.abs(guidance.deltaAlt) > VIEW_THRESHOLD && (guidance.deltaAlt > 0 ? 'Tilt Up' : 'Tilt Down')}
                  </p>
                </div>
              )}
            </div>

            {blessing && (
              <div className="absolute inset-0 bg-black/70 backdrop-blur-md flex items-center justify-center z-30" onClick={() => setBlessing(null)}>
                <div className="bg-gray-100/90 dark:bg-gray-800/90 p-8 rounded-xl shadow-2xl max-w-sm text-center mx-4">
                  <p className="text-2xl italic text-indigo-800 dark:text-indigo-200 font-serif">"{blessing}"</p>
                  <button onClick={() => setBlessing(null)} className="mt-6 text-sm text-gray-500 dark:text-gray-400 hover:text-black dark:hover:text-white">Close</button>
                </div>
              </div>
            )}
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <div className="w-screen h-screen overflow-hidden relative bg-gray-100 dark:bg-black text-black dark:text-white">
      <video ref={videoRef} autoPlay playsInline muted className="absolute top-0 left-0 w-full h-full object-cover z-0" />
      <div className="absolute top-0 left-0 w-full h-full z-10">
        {renderContent()}
      </div>
    </div>
  );
};

export default App;