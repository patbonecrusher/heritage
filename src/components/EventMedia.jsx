/**
 * EventMedia - Displays media linked to an event (birth, death, baptism, etc.)
 * Shows thumbnails that can be clicked to open PhotoViewer
 */

import { useState, useEffect } from 'react';
import { useMedia } from '../data/useMedia';
import { useDatabase } from '../data/DatabaseContext';
import PhotoViewer from './PhotoViewer';
import './EventMedia.css';

export function EventMedia({ eventId, compact = false }) {
  const { isOpen, refreshTrigger } = useDatabase();
  const { getMediaForEvent, unlinkMedia } = useMedia();

  const [media, setMedia] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedMedia, setSelectedMedia] = useState(null);

  // Load media for this event
  useEffect(() => {
    if (!eventId || !isOpen) {
      setMedia([]);
      return;
    }

    setLoading(true);
    getMediaForEvent(eventId)
      .then(items => setMedia(items || []))
      .catch(err => console.error('Error loading event media:', err))
      .finally(() => setLoading(false));
  }, [eventId, isOpen, getMediaForEvent, refreshTrigger]);

  // Unlink media from event
  const handleUnlink = async (e, item) => {
    e.stopPropagation();
    try {
      await unlinkMedia(item.id, 'event', eventId);
      // Refresh the list
      const items = await getMediaForEvent(eventId);
      setMedia(items || []);
    } catch (err) {
      console.error('Error unlinking media from event:', err);
    }
  };

  if (!isOpen || !eventId) {
    return null;
  }

  if (loading) {
    return <div className="event-media-loading">...</div>;
  }

  if (media.length === 0) {
    return null; // Don't show anything if no media
  }

  // Compact mode: just show count badge
  if (compact) {
    return (
      <span
        className="event-media-badge"
        title={`${media.length} media item${media.length > 1 ? 's' : ''}`}
        onClick={(e) => {
          e.stopPropagation();
          if (media.length > 0) setSelectedMedia(media[0]);
        }}
      >
        📷 {media.length}
      </span>
    );
  }

  return (
    <div className="event-media">
      <div className="event-media-grid">
        {media.map(item => (
          <div key={item.id} className="event-media-item-wrapper">
            <button
              type="button"
              className="event-media-item"
              onClick={() => setSelectedMedia(item)}
              title={item.title || item.filename || 'View media'}
            >
              <img
                src={item.thumbnailFullPath || item.fullPath}
                alt={item.title || 'Media'}
                loading="lazy"
              />
            </button>
            <button
              type="button"
              className="event-media-unlink"
              onClick={(e) => handleUnlink(e, item)}
              title="Unlink from event"
            >
              ×
            </button>
          </div>
        ))}
      </div>

      {selectedMedia && (
        <PhotoViewer
          mediaId={selectedMedia.id}
          imageSrc={selectedMedia.fullPath}
          mediaPath={selectedMedia.path}
          onClose={() => setSelectedMedia(null)}
          hasNext={media.findIndex(m => m.id === selectedMedia.id) < media.length - 1}
          hasPrevious={media.findIndex(m => m.id === selectedMedia.id) > 0}
          onNext={() => {
            const currentIndex = media.findIndex(m => m.id === selectedMedia.id);
            if (currentIndex < media.length - 1) {
              setSelectedMedia(media[currentIndex + 1]);
            }
          }}
          onPrevious={() => {
            const currentIndex = media.findIndex(m => m.id === selectedMedia.id);
            if (currentIndex > 0) {
              setSelectedMedia(media[currentIndex - 1]);
            }
          }}
        />
      )}
    </div>
  );
}

export default EventMedia;
