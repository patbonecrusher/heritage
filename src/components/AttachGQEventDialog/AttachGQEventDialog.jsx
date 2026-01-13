/**
 * AttachGQEventDialog - Main dialog for attaching GQ records to existing events
 *
 * Combines:
 * - PhotoGalleryPanel (left side)
 * - EventDetailsPanel (right side)
 * - WitnessManager (integrated)
 * - Save/Cancel buttons
 */

import React, { useState, useEffect } from 'react';
import { PhotoGalleryPanel } from './PhotoGalleryPanel';
import { EventDetailsPanel } from './EventDetailsPanel';
import { useAttachGQEvent } from '@/hooks/useAttachGQEvent';
import Dialog from '../Dialog/Dialog';
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
  const [showCloseConfirm, setShowCloseConfirm] = useState(false);

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

  // Check if there are unsaved changes
  const hasChanges =
    photos.length > 0 ||
    Object.values(formData).some((value) => value && value !== '') ||
    witnesses.length > 0;

  // Override onClose to handle unsaved changes (Dialog handles Escape key)
  const handleDialogClose = () => {
    if (hasChanges) {
      setShowCloseConfirm(true);
    } else {
      onClose();
    }
  };

  // Handle close button click
  const handleCloseClick = () => {
    if (hasChanges) {
      setShowCloseConfirm(true);
    } else {
      onClose();
    }
  };

  // Confirm close without saving
  const handleConfirmClose = () => {
    setShowCloseConfirm(false);
    onClose();
  };

  const eventTypeLabel = {
    birth: 'Birth',
    baptism: 'Baptism',
    marriage: 'Marriage',
    death: 'Death',
    burial: 'Burial',
  }[eventType] || eventType;

  return (
    <Dialog isOpen={isOpen} onClose={handleDialogClose} size="large" closeOnEscape={!hasChanges}>
      <Dialog.Header>
        <div>
          <Dialog.Title>
            Attach GénéalogieQuébec Records to {eventTypeLabel}
          </Dialog.Title>
          <p className="dialog-subtitle">
            {person.firstName} {person.lastName}
          </p>
        </div>
      </Dialog.Header>

      <Dialog.Content>
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
      </Dialog.Content>

      <Dialog.Footer>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
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

          <Dialog.Actions>
            <button
              className="btn btn-secondary"
              onClick={handleCloseClick}
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
          </Dialog.Actions>
        </div>
      </Dialog.Footer>

      {/* Close Confirmation Modal */}
      {showCloseConfirm && (
        <div className="dialog-overlay-modal">
          <div className="confirmation-modal">
            <h3 className="modal-title">Discard Changes?</h3>
            <p className="modal-message">
              You have unsaved changes. Are you sure you want to close without saving?
            </p>
            <div className="modal-actions">
              <button
                className="btn btn-secondary"
                onClick={() => setShowCloseConfirm(false)}
              >
                Keep Editing
              </button>
              <button
                className="btn btn-primary"
                onClick={handleConfirmClose}
                style={{ background: 'var(--color-accent)' }}
              >
                Discard
              </button>
            </div>
          </div>
        </div>
      )}
    </Dialog>
  );
}

export default AttachGQEventDialog;
