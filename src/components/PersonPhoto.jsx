/**
 * PersonPhoto - Displays a person's photo cropped from a face tag
 */

import { useState, useEffect } from 'react';
import { useMedia } from '../data/useMedia';
import { useDatabase } from '../data/DatabaseContext';
import './PersonPhoto.css';

export function PersonPhoto({ personId, width = 80, height = 100, className = '' }) {
  const { isOpen, refreshTrigger } = useDatabase();
  const { getMediaWithPerson } = useMedia();

  const [photoData, setPhotoData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!personId || !isOpen) {
      setPhotoData(null);
      setLoading(false);
      return;
    }

    setLoading(true);
    getMediaWithPerson(personId)
      .then(media => {
        if (media && media.length > 0) {
          // Use the first tagged photo
          const photo = media[0];
          setPhotoData({
            src: photo.fullPath,
            path: photo.path,
            // Face tag coordinates as percentages
            x: photo.x,
            y: photo.y,
            width: photo.width,
            height: photo.height,
          });
        } else {
          setPhotoData(null);
        }
      })
      .catch(err => {
        console.error('Error loading person photo:', err);
        setPhotoData(null);
      })
      .finally(() => setLoading(false));
  }, [personId, isOpen, getMediaWithPerson, refreshTrigger]);

  if (loading) {
    return (
      <div
        className={`person-photo person-photo-loading ${className}`}
        style={{ width, height }}
      />
    );
  }

  if (!photoData) {
    return (
      <div
        className={`person-photo person-photo-empty ${className}`}
        style={{ width, height }}
      >
        <span className="person-photo-placeholder">?</span>
      </div>
    );
  }

  // Use object-fit and object-position to crop to the face region
  // Face coordinates are percentages (0-100) of the original image

  // Face center position (as percentage of original image)
  const faceCenterX = photoData.x + photoData.width / 2;
  const faceCenterY = photoData.y + photoData.height / 2;

  // object-position with percentages: X% Y% means align the X% point of the image
  // with the X% point of the container. So if face center is at 30% 40% of image,
  // we use object-position: 30% 40% to center that point in the container.

  // Scale: we want the face to fill the container
  // If face is 20% of image width and container is 70px,
  // image should be 70 / 0.20 = 350px wide to make face = container width
  // As a percentage of container: 350 / 70 * 100 = 500%
  const scaleX = 100 / photoData.width;
  const scaleY = 100 / photoData.height;

  // Use the larger scale for "cover" behavior (fill container)
  const scale = Math.max(scaleX, scaleY);
  const imgWidthPercent = scale * 100;

  return (
    <div
      className={`person-photo ${className}`}
      style={{ width, height }}
    >
      <img
        src={photoData.src}
        alt="Person"
        style={{
          width: `${imgWidthPercent}%`,
          height: 'auto',
          position: 'absolute',
          left: '50%',
          top: '50%',
          transform: `translate(-${faceCenterX}%, -${faceCenterY}%)`,
        }}
      />
    </div>
  );
}

export default PersonPhoto;
