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
  relatedChannels = [],
  onChannelSelect,
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
    <div className="fixed inset-0 z-[100] flex items-start justify-center overflow-y-auto bg-black/95 animate-fade-in">
      <div className="w-full max-w-6xl p-4 md:p-8 animate-scale-in">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute right-4 top-4 z-10 flex h-10 w-10 items-center justify-center rounded-full bg-netflix-darkGray/80 text-white backdrop-blur-sm transition-all hover:bg-netflix-mediumGray hover:scale-110"
          aria-label="Fechar"
        >
          <XMarkIcon className="h-6 w-6" />
        </button>

        {/* Video Player */}
        <div className="mb-8 aspect-video w-full overflow-hidden rounded-lg bg-black">
          <VideoPlayer
            url={channel.stream_url}
            title={channel.display_name || channel.name}
            autoplay={true}
            onError={(error) => console.error('Player error:', error)}
          />
        </div>

        {/* Channel Information */}
        <div className="mb-8 rounded-lg bg-netflix-darkGray p-6">
          <div className="mb-4 flex items-start justify-between">
            <div>
              <h2 className="mb-2 text-2xl font-bold text-white">
                {channel.display_name || channel.name}
              </h2>
              <div className="flex items-center gap-3">
                {channel.category_name && (
                  <span className="text-sm text-netflix-lightGray">
                    {channel.category_name}
                  </span>
                )}
                {channel.is_hls && (
                  <span className="rounded bg-green-600 px-2 py-0.5 text-xs font-semibold text-white">
                    HD
                  </span>
                )}
              </div>
            </div>
          </div>

          {channel.description && (
            <p className="text-netflix-lightGray">{channel.description}</p>
          )}
        </div>

        {/* Related Channels */}
        {relatedChannels.length > 0 && (
          <div>
            <h3 className="mb-4 text-xl font-semibold text-white">
              Canais Relacionados
            </h3>
            <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4">
              {relatedChannels.slice(0, 8).map((relatedChannel) => (
                <button
                  key={relatedChannel.id}
                  onClick={() => onChannelSelect?.(relatedChannel)}
                  className="group relative aspect-video overflow-hidden rounded bg-netflix-mediumGray transition-transform hover:scale-105"
                >
                  {relatedChannel.logo_url && relatedChannel.logo_url.startsWith('http') ? (
                    <img
                      src={relatedChannel.logo_url}
                      alt={relatedChannel.display_name || relatedChannel.name}
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-netflix-mediumGray to-netflix-darkGray p-2">
                      <span className="text-center text-xs text-netflix-dimGray line-clamp-2">
                        {relatedChannel.display_name || relatedChannel.name}
                      </span>
                    </div>
                  )}
                  <div className="absolute inset-0 bg-black/0 transition-colors group-hover:bg-black/40" />
                  <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-2 opacity-0 transition-opacity group-hover:opacity-100">
                    <p className="text-xs font-semibold text-white line-clamp-1">
                      {relatedChannel.display_name || relatedChannel.name}
                    </p>
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
