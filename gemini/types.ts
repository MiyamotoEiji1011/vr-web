
export interface VRSettings {
  x: number;
  y: number;
  z: number;
  pitch: number;
  isSphere: boolean;
  opacity: number;
}

export interface RemoteParticipant {
  id: string;
  videoTrack?: any;
  audioTrack?: any;
  videoStream?: MediaStream;
}

export enum ConnectionState {
  DISCONNECTED = 'disconnected',
  CONNECTING = 'connecting',
  CONNECTED = 'connected',
}
