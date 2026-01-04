/**
 * MediaGallery - Renders top-level media cards by type for PersonView
 */

import { useState, useEffect, Fragment } from 'react';
import { useMedia, MEDIA_TYPES } from '../data/useMedia';
import { useDatabase } from '../data/DatabaseContext';
import PhotoViewer from './PhotoViewer';
import './MediaGallery.css';

// Icons for each media type
const MEDIA_ICONS = {
  photo: '📷',
  document: '📄',
  certificate: '📜',
  headstone: '🪦',
  newspaper: '📰',
  map: '🗺️',
  audio: '🎵',
  video: '🎬',
  other: '📎',
};

// Import folder mapping
const IMPORT_FOLDERS = {
  photo: 'photos',
  document: 'documents',
  certificate: 'documents',
  headstone: 'headstones',
  newspaper: 'documents',
  map: 'documents',
  audio: 'documents',
  video: 'documents',
  other: 'documents',
};

export function MediaGallery({
  personId,
  mediaCitations = {},
  onAddCitation,
  onEditCitation,
  onDeleteCitation,
  dbSources = [],
}) {
  const { isOpen, refreshTrigger } = useDatabase();
  const { getMediaForPerson, getMediaWithPerson, importAndCreateMedia, linkMedia, unlinkMedia } = useMedia();

  const [mediaByType, setMediaByType] = useState({});
  const [loading, setLoading] = useState(false);
  const [selectedMedia, setSelectedMedia] = useState(null);

  // Load all media for this person grouped by type
  useEffect(() => {
    if (!personId || !isOpen) {
      setMediaByType({});
      return;
    }

    setLoading(true);

    Promise.all([
      getMediaForPerson(personId),
      getMediaWithPerson(personId)
    ])
      .then(([linkedMedia, taggedMedia]) => {
        const linkedIds = new Set(linkedMedia.map(m => m.id));

        // Group by type
        const grouped = {};

        // Add linked media
        for (const media of linkedMedia) {
          const type = media.type || 'other';
          if (!grouped[type]) grouped[type] = [];
          grouped[type].push({ ...media, isLinked: true });
        }

        // Add tagged media (photos only) that aren't already linked
        for (const media of taggedMedia) {
          if (!linkedIds.has(media.id)) {
            const type = media.type || 'photo';
            if (!grouped[type]) grouped[type] = [];
            grouped[type].push({ ...media, isLinked: false, isTagged: true });
          }
        }

        setMediaByType(grouped);
      })
      .catch(err => console.error('Error loading media:', err))
      .finally(() => setLoading(false));
  }, [personId, isOpen, getMediaForPerson, getMediaWithPerson, refreshTrigger]);

  // Refresh media list
  const refreshMedia = async () => {
    const [linkedMedia, taggedMedia] = await Promise.all([
      getMediaForPerson(personId),
      getMediaWithPerson(personId)
    ]);
    const linkedIds = new Set(linkedMedia.map(m => m.id));

    const grouped = {};
    for (const media of linkedMedia) {
      const type = media.type || 'other';
      if (!grouped[type]) grouped[type] = [];
      grouped[type].push({ ...media, isLinked: true });
    }
    for (const media of taggedMedia) {
      if (!linkedIds.has(media.id)) {
        const type = media.type || 'photo';
        if (!grouped[type]) grouped[type] = [];
        grouped[type].push({ ...media, isLinked: false, isTagged: true });
      }
    }
    setMediaByType(grouped);
  };

  // Import media of a specific type
  const handleImport = async (mediaType) => {
    try {
      const folder = IMPORT_FOLDERS[mediaType] || 'documents';
      const imported = await importAndCreateMedia(folder, { type: mediaType });
      if (imported && imported.length > 0) {
        for (const media of imported) {
          await linkMedia(media.id, { person_id: personId });
        }
        await refreshMedia();
      }
    } catch (err) {
      console.error('Error importing media:', err);
    }
  };

  // Unlink media
  const handleUnlink = async (media) => {
    try {
      await unlinkMedia(media.id, 'person', personId);
      await refreshMedia();
    } catch (err) {
      console.error('Error unlinking media:', err);
    }
  };

  // Get all media as flat array for navigation
  const getAllMedia = () => {
    return Object.values(mediaByType).flat();
  };

  if (!isOpen) {
    return null;
  }

  if (loading) {
    return <div className="media-gallery-loading">Loading media...</div>;
  }

  // Types to show (photo first, then others that have items)
  const typesWithItems = Object.keys(mediaByType).filter(t => mediaByType[t]?.length > 0);
  const photoFirst = typesWithItems.includes('photo')
    ? ['photo', ...typesWithItems.filter(t => t !== 'photo')]
    : typesWithItems;

  // Always show photo card, even if empty
  const typesToShow = photoFirst.includes('photo') ? photoFirst : ['photo', ...photoFirst];

  return (
    <Fragment>
      {typesToShow.map(type => {
        const icon = MEDIA_ICONS[type] || MEDIA_ICONS.other;
        const label = MEDIA_TYPES[type] || 'Other';
        const items = mediaByType[type] || [];

        return (
          <div key={type} className="pv-card">
            <div className="pv-card-header">
              <span className="pv-card-icon">{icon}</span>
              <span className="pv-card-title">{label}s</span>
              <button
                type="button"
                className="pv-card-add-btn"
                onClick={() => handleImport(type)}
                title={`Add ${label}`}
              >
                +
              </button>
            </div>
            <div className="pv-card-body">
              {items.length === 0 ? (
                <div className="media-empty">No {label.toLowerCase()}s</div>
              ) : (
                <div className="media-grid">
                  {items.map(item => (
                    <div key={item.id} className="media-item-wrapper">
                      <button
                        type="button"
                        className="media-item"
                        onClick={() => setSelectedMedia(item)}
                      >
                        {item.mime_type?.startsWith('image/') ? (
                          <img
                            src={item.thumbnailFullPath || item.fullPath}
                            alt={item.title || label}
                            loading="lazy"
                          />
                        ) : (
                          <span className="media-item-icon">{icon}</span>
                        )}
                        {item.isTagged && !item.isLinked && (
                          <span className="media-tagged-badge" title="Tagged in photo">👤</span>
                        )}
                        {item.face_count > 0 && (
                          <span className="media-face-badge">{item.face_count}</span>
                        )}
                        {(mediaCitations[item.id]?.length > 0) && (
                          <span className="media-citation-badge" title="Citations">
                            {mediaCitations[item.id].length}
                          </span>
                        )}
                      </button>
                      {item.isLinked && (
                        <button
                          type="button"
                          className="media-unlink-btn"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleUnlink(item);
                          }}
                          title="Unlink"
                        >
                          ×
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        );
      })}

      {selectedMedia && (
        <PhotoViewer
          mediaId={selectedMedia.id}
          imageSrc={selectedMedia.fullPath}
          mediaPath={selectedMedia.path}
          onClose={() => setSelectedMedia(null)}
          citations={mediaCitations[selectedMedia.id] || []}
          onAddCitation={() => onAddCitation?.(selectedMedia.id)}
          onEditCitation={onEditCitation}
          onDeleteCitation={onDeleteCitation}
          dbSources={dbSources}
          hasNext={(() => {
            const all = getAllMedia();
            return all.findIndex(m => m.id === selectedMedia.id) < all.length - 1;
          })()}
          hasPrevious={(() => {
            const all = getAllMedia();
            return all.findIndex(m => m.id === selectedMedia.id) > 0;
          })()}
          onNext={() => {
            const all = getAllMedia();
            const idx = all.findIndex(m => m.id === selectedMedia.id);
            if (idx < all.length - 1) setSelectedMedia(all[idx + 1]);
          }}
          onPrevious={() => {
            const all = getAllMedia();
            const idx = all.findIndex(m => m.id === selectedMedia.id);
            if (idx > 0) setSelectedMedia(all[idx - 1]);
          }}
        />
      )}
    </Fragment>
  );
}

export default MediaGallery;
