'use client';

import { useEffect } from 'react';
import { XMarkIcon } from '@heroicons/react/24/solid';
import VideoPlayer from '../VideoPlayer';

interface Channel {
  id: string;
  name: string;
  display_name: string;
  logo_url?: string;
  category_name?: string;
  stream_url: string;
  is_hls: boolean;
  description?: string;
}

interface VideoPlayerModalProps {
  channel: Channel | null;
  isOpen: boolean;
  onClose: () => void;
  relatedChannels?: Channel[];
  onChannelSelect?: (channel: Channel) => void;
}

export default function VideoPlayerModal({
  channel,
  isOpen,
  onClose,
}: VideoPlayerModalProps) {
  // Handle escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
      document.body.style.overflow = 'hidden';
    }

    return () => {
      document.removeEventListener('keydown', handleEscape);
      document.body.style.overflow = 'unset';
    };
  }, [isOpen, onClose]);

  if (!isOpen || !channel) return null;

  return (
    <div className="fixed inset-0 z-[100] flex flex-col bg-black animate-fade-in">
      {/* Close Button */}
      <button
        onClick={onClose}
        className="absolute right-4 top-4 z-20 flex h-12 w-12 items-center justify-center rounded-full bg-black/70 text-white backdrop-blur-sm transition-all hover:bg-black/90 hover:scale-110"
        aria-label="Fechar"
      >
        <XMarkIcon className="h-7 w-7" />
      </button>

      {/* Video Player - Tela Cheia */}
      <div className="relative flex-1 w-full h-full bg-black">
        <VideoPlayer
          url={channel.stream_url}
          title={channel.display_name || channel.name}
          autoplay={true}
          onError={(error) => console.error('Player error:', error)}
        />
      </div>

    </div>
  );
}
