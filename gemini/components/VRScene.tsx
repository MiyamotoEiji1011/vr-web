
import React, { useEffect, useRef } from 'react';
import { VRSettings, RemoteParticipant } from '../types';

interface VRSceneProps {
  activeParticipant?: RemoteParticipant;
  settings: VRSettings;
  isVrMode: boolean;
}

const VRScene: React.FC<VRSceneProps> = ({ activeParticipant, settings, isVrMode }) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const assetRef = useRef<HTMLElement>(null);

  useEffect(() => {
    if (activeParticipant?.videoTrack && videoRef.current) {
      activeParticipant.videoTrack.attach(videoRef.current);
      videoRef.current.play().catch(console.error);
    }
  }, [activeParticipant]);

  return (
    <div className={`w-full h-full ${isVrMode ? 'block' : 'opacity-0 pointer-events-none'}`}>
      <a-scene
        embedded
        background="color: #0b0f17"
        renderer="antialias: true; colorManagement: true"
        vr-mode-ui="enabled: true"
      >
        <a-assets ref={assetRef}>
          <video 
            id="remote-video-asset" 
            ref={videoRef}
            autoPlay 
            playsInline 
            crossOrigin="anonymous"
          ></video>
        </a-assets>

        {/* Environment */}
        <a-plane rotation="-90 0 0" width="100" height="100" color="#101827" metalness="0.5" roughness="0.5"></a-plane>
        <a-grid-helper size="50" divisions="50" color="#1e293b"></a-grid-helper>

        {/* Camera Rig */}
        <a-entity id="camera-rig" position="0 1.6 0">
          <a-camera id="vr-camera" wasd-controls-enabled="false" look-controls="pointerLockEnabled: false">
            {/* The Tracked Screen - Following the Head (HUD style if attached to camera) */}
            <a-entity 
                id="hud-container" 
                position={`${settings.x} ${settings.y} ${-settings.z}`} 
                rotation={`${settings.pitch} 0 0`}
            >
                {settings.isSphere ? (
                    <a-sphere
                        src="#remote-video-asset"
                        radius="10"
                        segments-width="64"
                        segments-height="64"
                        phi-start="0"
                        phi-length="360"
                        theta-start="0"
                        theta-length="180"
                        scale="-1 1 1"
                        material="shader: flat; opacity: 1.0"
                    ></a-sphere>
                ) : (
                    <>
                        <a-video
                            src="#remote-video-asset"
                            width="3.2"
                            height="1.8"
                            material="shader: flat; transparent: true; opacity: 1.0"
                        ></a-video>
                        {/* Decorative frame */}
                        <a-plane 
                            width="3.3" 
                            height="1.9" 
                            position="0 0 -0.01" 
                            color="#000000" 
                            material="opacity: 0.8"
                        ></a-plane>
                    </>
                )}
            </a-entity>
          </a-camera>
        </a-entity>

        <a-entity light="type: ambient; intensity: 0.7"></a-entity>
        <a-entity light="type: directional; intensity: 0.8" position="2 4 4"></a-entity>
      </a-scene>
    </div>
  );
};

export default VRScene;
