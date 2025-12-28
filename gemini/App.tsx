
import React, { useState, useEffect, useCallback, useRef } from 'react';
// @ts-ignore
const { nowInSec, SkyWayAuthToken, SkyWayContext, SkyWayRoom, SkyWayStreamFactory } = window.skyway_room || {};
import { SKYWAY_CONFIG, DEFAULT_VR_SETTINGS } from './constants';
import { VRSettings, RemoteParticipant, ConnectionState } from './types';
import VRScene from './components/VRScene';
import UIOverlay from './components/UIOverlay';

const App: React.FC = () => {
  const [connState, setConnState] = useState<ConnectionState>(ConnectionState.DISCONNECTED);
  const [myId, setMyId] = useState<string>('-');
  const [roomName, setRoomName] = useState<string>('vr-demo-room');
  const [participants, setParticipants] = useState<RemoteParticipant[]>([]);
  const [activeParticipantIndex, setActiveParticipantIndex] = useState<number>(-1);
  const [vrSettings, setVrSettings] = useState<VRSettings>(DEFAULT_VR_SETTINGS);
  const [isVrMode, setIsVrMode] = useState<boolean>(false);
  const [isMuted, setIsMuted] = useState<boolean>(false);

  const contextRef = useRef<any>(null);
  const roomRef = useRef<any>(null);
  const meRef = useRef<any>(null);
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const localStreamRef = useRef<{ video: any; audio: any } | null>(null);

  // Generate SkyWay Token
  const generateToken = useCallback(() => {
    const jti = crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).substring(2);
    return new SkyWayAuthToken({
      jti,
      iat: nowInSec(),
      exp: nowInSec() + 60 * 60 * 24,
      version: 3,
      scope: {
        appId: SKYWAY_CONFIG.appId,
        rooms: [
          {
            name: "*",
            methods: ["create", "close", "updateMetadata"],
            member: {
              name: "*",
              methods: ["publish", "subscribe", "updateMetadata"],
            },
          },
        ],
      },
    }).encode(SKYWAY_CONFIG.secret);
  }, []);

  const joinRoom = async () => {
    if (!roomName) return;
    try {
      setConnState(ConnectionState.CONNECTING);
      const token = generateToken();
      const context = await SkyWayContext.Create(token);
      contextRef.current = context;

      const room = await SkyWayRoom.FindOrCreate(context, { name: roomName, type: "p2p" });
      roomRef.current = room;

      const me = await room.join();
      meRef.current = me;
      setMyId(me.id);
      setConnState(ConnectionState.CONNECTED);

      // Create and publish local streams
      const { audio, video } = await SkyWayStreamFactory.createMicrophoneAudioAndCameraStream();
      localStreamRef.current = { audio, video };
      
      if (localVideoRef.current) {
        video.attach(localVideoRef.current);
        localVideoRef.current.play().catch(console.error);
      }

      await me.publish(audio);
      await me.publish(video);

      // Handle new publications
      const handlePublication = async (publication: any) => {
        if (publication.publisher.id === me.id) return;
        
        const { stream } = await me.subscribe(publication.id);
        
        setParticipants(prev => {
          const existing = prev.find(p => p.id === publication.publisher.id);
          if (existing) {
            return prev.map(p => p.id === publication.publisher.id 
              ? { ...p, [stream.track.kind === 'video' ? 'videoTrack' : 'audioTrack']: stream }
              : p
            );
          }
          return [...prev, { 
            id: publication.publisher.id, 
            [stream.track.kind === 'video' ? 'videoTrack' : 'audioTrack']: stream 
          }];
        });
      };

      room.publications.forEach(handlePublication);
      room.onStreamPublished.add((e: any) => handlePublication(e.publication));
      room.onStreamUnpublished.add((e: any) => {
        setParticipants(prev => prev.filter(p => p.id !== e.publication.publisher.id));
      });

    } catch (error) {
      console.error("Join failed:", error);
      setConnState(ConnectionState.DISCONNECTED);
      alert("Failed to join room.");
    }
  };

  const leaveRoom = async () => {
    if (meRef.current) await meRef.current.leave();
    if (roomRef.current) await roomRef.current.dispose();
    
    contextRef.current = null;
    roomRef.current = null;
    meRef.current = null;
    localStreamRef.current = null;
    
    setParticipants([]);
    setMyId('-');
    setConnState(ConnectionState.DISCONNECTED);
    setActiveParticipantIndex(-1);
    if (localVideoRef.current) {
        localVideoRef.current.srcObject = null;
    }
  };

  const toggleMute = () => {
    if (!localStreamRef.current) return;
    const newState = !isMuted;
    localStreamRef.current.audio.track.enabled = !newState;
    localStreamRef.current.video.track.enabled = !newState;
    setIsMuted(newState);
  };

  const cycleParticipant = () => {
    if (participants.length === 0) return;
    setActiveParticipantIndex(prev => (prev + 1) % participants.length);
  };

  // Set initial participant if none active
  useEffect(() => {
    if (activeParticipantIndex === -1 && participants.length > 0) {
      setActiveParticipantIndex(0);
    } else if (participants.length === 0) {
      setActiveParticipantIndex(-1);
    }
  }, [participants, activeParticipantIndex]);

  return (
    <div className="relative w-full h-screen bg-[#0b0f17] text-gray-100 overflow-hidden">
      {/* VR Scene Container */}
      <VRScene 
        activeParticipant={participants[activeParticipantIndex]}
        settings={vrSettings}
        isVrMode={isVrMode}
      />

      {/* UI Overlay */}
      {!isVrMode && (
        <UIOverlay 
          connState={connState}
          myId={myId}
          roomName={roomName}
          setRoomName={setRoomName}
          onJoin={joinRoom}
          onLeave={leaveRoom}
          onToggleVr={() => setIsVrMode(true)}
          localVideoRef={localVideoRef}
          participants={participants}
          activeIndex={activeParticipantIndex}
          onCycle={cycleParticipant}
          isMuted={isMuted}
          onToggleMute={toggleMute}
        />
      )}

      {/* VR HUD Controls (Only visible in VR or as persistent floating UI) */}
      <div className={`fixed bottom-0 left-0 right-0 p-4 transition-transform duration-300 z-50 ${isVrMode ? 'translate-y-0' : 'translate-y-full'}`}>
        <div className="max-w-4xl mx-auto bg-gray-900/80 backdrop-blur-xl border border-gray-700/50 rounded-2xl p-4 shadow-2xl flex flex-wrap items-center justify-between gap-4">
          <div className="flex flex-col">
            <h3 className="text-sm font-bold text-white">VR Fine-Tuning</h3>
            <p className="text-[10px] text-gray-400">Adjust spatial offset and tracking behavior.</p>
          </div>
          
          <div className="flex flex-wrap gap-4 items-center">
            <div className="flex flex-col gap-1">
              <label className="text-[10px] text-gray-400">Distance (Z)</label>
              <input 
                type="range" min="0.5" max="5" step="0.1" 
                value={vrSettings.z} 
                onChange={e => setVrSettings(s => ({ ...s, z: parseFloat(e.target.value) }))}
                className="w-24 h-1 bg-gray-700 rounded-lg appearance-none cursor-pointer"
              />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-[10px] text-gray-400">Height (Y)</label>
              <input 
                type="range" min="-2" max="2" step="0.1" 
                value={vrSettings.y} 
                onChange={e => setVrSettings(s => ({ ...s, y: parseFloat(e.target.value) }))}
                className="w-24 h-1 bg-gray-700 rounded-lg appearance-none cursor-pointer"
              />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-[10px] text-gray-400">Angle (Pitch)</label>
              <input 
                type="range" min="-90" max="90" step="1" 
                value={vrSettings.pitch} 
                onChange={e => setVrSettings(s => ({ ...s, pitch: parseFloat(e.target.value) }))}
                className="w-24 h-1 bg-gray-700 rounded-lg appearance-none cursor-pointer"
              />
            </div>
            <div className="flex items-center gap-2">
                <button 
                  onClick={() => setVrSettings(s => ({ ...s, isSphere: !s.isSphere }))}
                  className={`px-3 py-1 rounded text-xs transition-colors ${vrSettings.isSphere ? 'bg-purple-600 text-white' : 'bg-gray-700 text-gray-300'}`}
                >
                  {vrSettings.isSphere ? '360° Sphere' : 'Flat Panel'}
                </button>
                <button 
                    onClick={cycleParticipant}
                    className="bg-emerald-600 hover:bg-emerald-500 px-3 py-1 rounded text-xs font-bold transition-colors"
                    disabled={participants.length < 2}
                >
                    Switch User
                </button>
            </div>
          </div>

          <button 
            onClick={() => setIsVrMode(false)}
            className="bg-rose-600 hover:bg-rose-500 text-white px-4 py-2 rounded-xl text-sm font-bold shadow-lg transition-all"
          >
            Exit VR
          </button>
        </div>
      </div>
    </div>
  );
};

export default App;
