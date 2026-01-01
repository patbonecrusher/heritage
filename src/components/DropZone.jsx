/**
 * DropZone components for drag-and-drop from Library Panel
 * - PlaceDropZone: Accepts place drops for place fields
 * - MediaDropZone: Accepts media drops for linking to person/events
 */

import React, { useState } from 'react';
import PlacePicker from './PlacePicker';
import { useMedia } from '../data/useMedia';
import './DropZone.css';

/**
 * PlaceDropZone - Wraps PlacePicker and accepts place drops
 */
export function PlaceDropZone({
  value,
  placeId,
  places = [],
  onChange,
  placeholder,
  className = '',
}) {
  const [isOver, setIsOver] = useState(false);

  const handleDragOver = (e) => {
    // Check if the dragged item is a place
    if (e.dataTransfer.types.includes('application/heritage-place')) {
      e.preventDefault();
      e.dataTransfer.dropEffect = 'copy';
      setIsOver(true);
    }
  };

  const handleDragLeave = (e) => {
    // Only set false if we're actually leaving the drop zone
    if (!e.currentTarget.contains(e.relatedTarget)) {
      setIsOver(false);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsOver(false);

    const data = e.dataTransfer.getData('application/heritage-place');
    if (data) {
      try {
        const place = JSON.parse(data);
        onChange({ place: place.name, placeId: place.id });
      } catch (err) {
        console.error('Error parsing dropped place:', err);
      }
    }
  };

  return (
    <div
      className={`place-drop-zone ${isOver ? 'drop-active' : ''} ${className}`}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      <PlacePicker
        value={value}
        placeId={placeId}
        places={places}
        onChange={onChange}
        placeholder={placeholder}
      />
      {isOver && (
        <div className="drop-indicator">
          <span>Drop place here</span>
        </div>
      )}
    </div>
  );
}

/**
 * MediaDropZone - Wraps content and accepts media drops
 * Can link media to a person or event
 */
export function MediaDropZone({
  personId,
  eventId,
  onMediaLinked,
  children,
  className = '',
  label = 'Drop media here',
}) {
  const [isOver, setIsOver] = useState(false);
  const { linkMedia, getMediaForPerson } = useMedia();

  const handleDragOver = (e) => {
    // Check if the dragged item is media
    if (e.dataTransfer.types.includes('application/heritage-media')) {
      e.preventDefault();
      e.dataTransfer.dropEffect = 'copy';
      setIsOver(true);
    }
  };

  const handleDragLeave = (e) => {
    if (!e.currentTarget.contains(e.relatedTarget)) {
      setIsOver(false);
    }
  };

  const handleDrop = async (e) => {
    e.preventDefault();
    setIsOver(false);

    const data = e.dataTransfer.getData('application/heritage-media');
    if (data) {
      try {
        const media = JSON.parse(data);

        // Check for duplicates if linking to a person
        if (personId && getMediaForPerson) {
          const existingMedia = await getMediaForPerson(personId);
          const alreadyLinked = existingMedia.some(m => m.id === media.id);
          if (alreadyLinked) {
            console.log('Photo already linked to this person');
            return; // Don't link again
          }
        }

        // Link media to person or event
        if (linkMedia) {
          await linkMedia(media.id, {
            person_id: personId || null,
            event_id: eventId || null,
          });
        }

        // Notify parent component
        onMediaLinked?.({
          mediaId: media.id,
          personId,
          eventId,
          media,
        });
      } catch (err) {
        console.error('Error handling dropped media:', err);
      }
    }
  };

  return (
    <div
      className={`media-drop-zone ${isOver ? 'drop-active' : ''} ${className}`}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      {children}
      {isOver && (
        <div className="drop-overlay">
          <span>{label}</span>
        </div>
      )}
    </div>
  );
}
