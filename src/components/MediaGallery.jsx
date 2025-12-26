/**
 * MediaGallery - Component for displaying and managing photos for a person
 */

import { useState, useEffect } from 'react';
import { useMedia } from '../data/useMedia';
import { useDatabase } from '../data/DatabaseContext';
import PhotoViewer from './PhotoViewer';
import './MediaGallery.css';

export function MediaGallery({ personId }) {
  const { isOpen } = useDatabase();
  const { getMediaForPerson, importAndCreateMedia, linkMedia } = useMedia();

  const [photos, setPhotos] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedPhoto, setSelectedPhoto] = useState(null);

  // Load photos for this person
  useEffect(() => {
    if (!personId || !isOpen) {
      setPhotos([]);
      return;
    }

    setLoading(true);
    getMediaForPerson(personId)
      .then(media => {
        // Filter to only photos
        const photoMedia = media.filter(m =>
          m.type === 'photo' ||
          m.mime_type?.startsWith('image/')
        );
        setPhotos(photoMedia);
      })
      .catch(err => console.error('Error loading photos:', err))
      .finally(() => setLoading(false));
  }, [personId, isOpen, getMediaForPerson]);

  // Import new photos
  const handleImportPhotos = async () => {
    try {
      const imported = await importAndCreateMedia('photos');
      if (imported && imported.length > 0) {
        // Link each imported photo to this person
        for (const photo of imported) {
          await linkMedia(photo.id, { person_id: personId });
        }
        // Refresh photos
        const media = await getMediaForPerson(personId);
        const photoMedia = media.filter(m =>
          m.type === 'photo' ||
          m.mime_type?.startsWith('image/')
        );
        setPhotos(photoMedia);
      }
    } catch (err) {
      console.error('Error importing photos:', err);
    }
  };

  // Open photo viewer
  const openPhotoViewer = (photo) => {
    setSelectedPhoto(photo);
  };

  if (!isOpen) {
    return null; // Don't show in legacy mode
  }

  return (
    <div className="media-gallery">
      <div className="media-gallery-header">
        <h3 className="media-gallery-title">Photos</h3>
        <button
          type="button"
          className="btn-secondary btn-small"
          onClick={handleImportPhotos}
        >
          + Add Photos
        </button>
      </div>

      {loading ? (
        <div className="media-gallery-loading">Loading...</div>
      ) : photos.length === 0 ? (
        <div className="media-gallery-empty">
          <p>No photos</p>
          <button
            type="button"
            className="btn-secondary"
            onClick={handleImportPhotos}
          >
            Import Photos
          </button>
        </div>
      ) : (
        <div className="media-gallery-grid">
          {photos.map(photo => (
            <button
              key={photo.id}
              type="button"
              className="media-gallery-item"
              onClick={() => openPhotoViewer(photo)}
            >
              <img
                src={photo.thumbnailFullPath || photo.fullPath}
                alt={photo.title || 'Photo'}
                loading="lazy"
              />
              {photo.face_count > 0 && (
                <span className="face-count-badge">{photo.face_count}</span>
              )}
            </button>
          ))}
        </div>
      )}

      {selectedPhoto && (
        <PhotoViewer
          mediaId={selectedPhoto.id}
          imageSrc={selectedPhoto.fullPath}
          mediaPath={selectedPhoto.path}
          onClose={() => setSelectedPhoto(null)}
        />
      )}
    </div>
  );
}

export default MediaGallery;
