declare module 'clappr' {
  export interface PlayerOptions {
    source: string;
    parentId: string;
    width?: string | number;
    height?: string | number;
    autoPlay?: boolean;
    mute?: boolean;
    plugins?: any[];
    playback?: {
      playInline?: boolean;
      recycleVideo?: boolean;
      crossOrigin?: string;
    };
    mediacontrol?: {
      seekbar?: string;
      buttons?: string;
    };
  }

  export class Player {
    constructor(options: PlayerOptions);
    destroy(): void;
    play(): void;
    pause(): void;
    stop(): void;
    on(event: string, callback: (...args: any[]) => void): void;
    off(event: string, callback: (...args: any[]) => void): void;
  }

  export const Events: {
    PLAYER_READY: string;
    PLAYER_PLAY: string;
    PLAYER_PAUSE: string;
    PLAYER_STOP: string;
    PLAYER_ERROR: string;
    PLAYER_TIMEUPDATE: string;
    PLAYER_ENDED: string;
    [key: string]: string;
  };

  const Clappr: {
    Player: typeof Player;
    Events: typeof Events;
  };

  export default Clappr;
}
