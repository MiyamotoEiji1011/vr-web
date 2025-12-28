
import React from 'react';
import { ConnectionState, RemoteParticipant } from '../types';

interface UIOverlayProps {
  connState: ConnectionState;
  myId: string;
  roomName: string;
  setRoomName: (val: string) => void;
  onJoin: () => void;
  onLeave: () => void;
  onToggleVr: () => void;
  localVideoRef: React.RefObject<HTMLVideoElement>;
  participants: RemoteParticipant[];
  activeIndex: number;
  onCycle: () => void;
  isMuted: boolean;
  onToggleMute: () => void;
}

const UIOverlay: React.FC<UIOverlayProps> = ({
  connState,
  myId,
  roomName,
  setRoomName,
  onJoin,
  onLeave,
  onToggleVr,
  localVideoRef,
  participants,
  activeIndex,
  onCycle,
  isMuted,
  onToggleMute
}) => {
  return (
    <div className="absolute inset-0 z-10 flex flex-col p-6 pointer-events-none">
      <header className="flex items-center justify-between bg-gray-900/40 backdrop-blur-md p-4 rounded-2xl border border-white/5 pointer-events-auto shadow-xl">
        <div className="flex items-center gap-4">
          <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-emerald-500 rounded-xl flex items-center justify-center text-xl shadow-lg shadow-purple-500/20">
            ☁️
          </div>
          <div>
            <h1 className="text-lg font-black tracking-tight text-white">SKYWAY VR</h1>
            <p className="text-[10px] text-gray-400 font-mono uppercase tracking-widest">P2P Spatial Comms</p>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <div className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${
            connState === ConnectionState.CONNECTED ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/20' : 
            connState === ConnectionState.CONNECTING ? 'bg-amber-500/20 text-amber-400 border border-amber-500/20 animate-pulse' : 
            'bg-gray-500/20 text-gray-400 border border-gray-500/20'
          }`}>
            {connState}
          </div>
          <div className="text-[10px] text-gray-500 font-mono">ID: <span className="text-gray-200">{myId}</span></div>
          <button 
            onClick={onToggleVr}
            disabled={connState !== ConnectionState.CONNECTED}
            className="bg-purple-600 hover:bg-purple-500 disabled:opacity-50 text-white px-5 py-2 rounded-xl text-sm font-bold shadow-lg shadow-purple-600/30 transition-all active:scale-95"
          >
            Enter VR
          </button>
        </div>
      </header>

      <main className="flex-1 grid grid-cols-1 md:grid-cols-12 gap-6 mt-6 min-h-0">
        {/* Connection & Local Card */}
        <div className="md:col-span-4 flex flex-col gap-6 pointer-events-auto">
          <section className="bg-gray-900/60 backdrop-blur-md p-5 rounded-3xl border border-white/10 shadow-2xl">
            <h2 className="text-sm font-bold mb-4 text-gray-300">Room Settings</h2>
            <div className="space-y-4">
              <div className="flex flex-col gap-1">
                <label className="text-[10px] text-gray-500 font-bold uppercase">Room Name</label>
                <input 
                  type="text" 
                  value={roomName}
                  onChange={e => setRoomName(e.target.value)}
                  disabled={connState === ConnectionState.CONNECTED}
                  className="bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-purple-500/50 transition-colors w-full"
                />
              </div>
              <div className="flex gap-2">
                {connState === ConnectionState.CONNECTED ? (
                  <button onClick={onLeave} className="flex-1 bg-rose-600/80 hover:bg-rose-600 text-white py-3 rounded-xl text-sm font-bold transition-all">Leave</button>
                ) : (
                  <button onClick={onJoin} className="flex-1 bg-emerald-600 hover:bg-emerald-500 text-white py-3 rounded-xl text-sm font-bold transition-all">Join Room</button>
                )}
              </div>
            </div>
          </section>

          <section className="bg-gray-900/60 backdrop-blur-md p-5 rounded-3xl border border-white/10 shadow-2xl flex-1 flex flex-col min-h-[300px]">
            <h2 className="text-sm font-bold mb-4 text-gray-300">Local Preview</h2>
            <div className="flex-1 relative bg-black/40 rounded-2xl overflow-hidden border border-white/5">
              <video ref={localVideoRef} muted playsInline className="w-full h-full object-cover" />
              <div className="absolute top-3 left-3 bg-black/60 backdrop-blur-md px-2 py-1 rounded-lg text-[10px] text-white/80 border border-white/10">You (Local)</div>
            </div>
            <button 
                onClick={onToggleMute}
                className={`mt-4 w-full py-2 rounded-xl text-xs font-bold transition-all border ${isMuted ? 'bg-rose-500/20 text-rose-400 border-rose-500/20' : 'bg-gray-800 text-gray-300 border-white/5'}`}
            >
                {isMuted ? 'Unmute' : 'Mute Video/Audio'}
            </button>
          </section>
        </div>

        {/* Remote Grid */}
        <div className="md:col-span-8 flex flex-col gap-6 pointer-events-auto min-h-0">
          <section className="bg-gray-900/60 backdrop-blur-md p-5 rounded-3xl border border-white/10 shadow-2xl flex-1 flex flex-col overflow-hidden">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-sm font-bold text-gray-300">Remote Participants ({participants.length})</h2>
              {participants.length > 1 && (
                <button onClick={onCycle} className="text-[10px] text-purple-400 hover:text-purple-300 font-bold uppercase tracking-wider transition-colors">Switch Active View</button>
              )}
            </div>

            {participants.length === 0 ? (
              <div className="flex-1 flex flex-col items-center justify-center text-gray-500 border-2 border-dashed border-white/5 rounded-2xl">
                <div className="text-4xl mb-2 opacity-20">📡</div>
                <p className="text-xs">Waiting for others to join...</p>
              </div>
            ) : (
              <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 gap-4 overflow-y-auto pr-2 custom-scrollbar">
                {participants.map((p, idx) => (
                  <div 
                    key={p.id} 
                    className={`relative rounded-2xl overflow-hidden border-2 transition-all group ${
                      idx === activeIndex ? 'border-purple-500/50 ring-4 ring-purple-500/10' : 'border-white/5'
                    }`}
                  >
                    <ParticipantView participant={p} isActive={idx === activeIndex} />
                    <div className="absolute bottom-3 left-3 flex flex-col gap-1">
                      <span className="bg-black/60 backdrop-blur-md px-2 py-1 rounded-lg text-[10px] text-white/80 border border-white/10 truncate max-w-[150px]">{p.id}</span>
                      {idx === activeIndex && <span className="bg-purple-600 text-white text-[8px] font-bold px-2 py-0.5 rounded-full uppercase self-start">Active VR</span>}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>
        </div>
      </main>

      <footer className="mt-6 text-center text-[10px] text-gray-600 pointer-events-none font-mono">
        SKYWAY v3 WEBXR ENGINE • P2P ENCRYPTION ACTIVE • LATENCY OPTIMIZED
      </footer>
    </div>
  );
};

const ParticipantView: React.FC<{ participant: RemoteParticipant; isActive: boolean }> = ({ participant }) => {
  const videoRef = React.useRef<HTMLVideoElement>(null);

  React.useEffect(() => {
    if (participant.videoTrack && videoRef.current) {
      participant.videoTrack.attach(videoRef.current);
      videoRef.current.play().catch(console.error);
    }
  }, [participant.videoTrack]);

  return <video ref={videoRef} playsInline autoPlay className="w-full h-full aspect-video object-cover bg-black" />;
};

export default UIOverlay;
