/**
 * AttachGQEventDialog - Main dialog for attaching GQ records to existing events
 *
 * Combines:
 * - PhotoGalleryPanel (left side)
 * - EventDetailsPanel (right side)
 * - WitnessManager (integrated)
 * - Save/Cancel buttons
 */

import React from 'react';
import { PhotoGalleryPanel } from './PhotoGalleryPanel';
import { EventDetailsPanel } from './EventDetailsPanel';
import { useAttachGQEvent } from '@/hooks/useAttachGQEvent';
import './AttachGQEventDialog.css';

export function AttachGQEventDialog({
  isOpen,
  onClose,
  person,
  eventType,
  existingEventData,
  onSave,
  allPeople = [],
  places = [],
  onCreatePlace,
  citations = [],
  onCreateCitation,
  onUpdateCitation,
}) {
  const {
    photos,
    formData,
    witnesses,
    mainPhoto,
    mainPhotoIndex,
    isSaving,
    error,
    isValid,
    photoPageRanges,
    addPhotos,
    removePhoto,
    updatePhotoMetadata,
    setMainPhoto,
    updateFormField,
    addWitness,
    removeWitness,
    updateWitness,
    saveEvent,
  } = useAttachGQEvent({
    personId: person.id,
    eventType,
    existingEventData,
    onSave: onSave,
    onRequestClose: onClose,
  });

  if (!isOpen) return null;

  const eventTypeLabel = {
    birth: 'Birth',
    baptism: 'Baptism',
    marriage: 'Marriage',
    death: 'Death',
    burial: 'Burial',
  }[eventType] || eventType;

  return (
    <div className="attach-gq-dialog-overlay" onClick={onClose}>
      <div className="attach-gq-dialog" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="dialog-header">
          <h2 className="dialog-title">
            Attach GénéalogieQuébec Records to {eventTypeLabel}
          </h2>
          <p className="dialog-subtitle">
            {person.firstName} {person.lastName}
          </p>
          <button
            className="dialog-close"
            onClick={onClose}
            title="Close dialog"
            disabled={isSaving}
          >
            ✕
          </button>
        </div>

        {/* Main Content */}
        <div className="dialog-content">
          <div className="content-panels">
            {/* Left: Photo Gallery */}
            <div className="gallery-panel">
              <PhotoGalleryPanel
                photos={photos}
                mainPhotoIndex={mainPhotoIndex}
                onAddPhotos={addPhotos}
                onRemovePhoto={removePhoto}
                onUpdatePhotoMetadata={updatePhotoMetadata}
                onSetMainPhoto={setMainPhoto}
              />
            </div>

            {/* Right: Form & Details */}
            <div className="form-panel">
              <div className="form-scroll">
                {/* Event Details */}
                <EventDetailsPanel
                  eventType={eventType}
                  person={person}
                  formData={formData}
                  photos={photos}
                  witnesses={witnesses}
                  allPeople={allPeople}
                  places={places}
                  citations={citations}
                  onUpdateField={updateFormField}
                  onAddWitness={addWitness}
                  onRemoveWitness={removeWitness}
                  onUpdateWitness={updateWitness}
                  onCreatePlace={onCreatePlace}
                  onCreateCitation={onCreateCitation}
                  onUpdateCitation={onUpdateCitation}
                  error={error}
                  disabled={isSaving}
                />

              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="dialog-footer">
          <div className="footer-info">
            {photos.length > 0 && (
              <span className="photo-count">
                📷 {photos.length} photo{photos.length !== 1 ? 's' : ''}
                {photoPageRanges && (
                  <span className="page-ranges"> • p. {photoPageRanges}</span>
                )}
              </span>
            )}
          </div>

          <div className="footer-actions">
            <button
              className="btn btn-secondary"
              onClick={onClose}
              disabled={isSaving}
            >
              Cancel
            </button>
            <button
              className="btn btn-primary"
              onClick={saveEvent}
              disabled={isSaving || !isValid}
              title={!isValid ? 'Please fill required fields' : ''}
            >
              {isSaving ? 'Saving...' : 'Save'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default AttachGQEventDialog;
