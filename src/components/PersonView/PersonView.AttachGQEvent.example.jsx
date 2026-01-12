/**
 * PersonView Integration Example - Attach GQ Event Feature
 *
 * This file shows exactly how to integrate the AttachGQEventDialog
 * into your PersonView component.
 *
 * Copy the relevant sections into your actual PersonView component.
 *
 * STEP-BY-STEP INTEGRATION:
 * 1. Add imports at top of PersonView.jsx
 * 2. Add state for dialog (attachGQDialog)
 * 3. Add button to each event in the events list
 * 4. Render the dialog component before closing div
 * 5. Implement the handleAttachGQEvent save handler
 */

import React, { useState, useCallback } from 'react';
import { AttachGQEventDialog } from '@/components/AttachGQEventDialog/AttachGQEventDialog';
import { usePersonOperations } from '@/hooks/usePersonOperations';
import { useSources } from '@/hooks/useSources';
import { useCitationManager } from '@/hooks/useCitationManager';
import { useMediaLibrary } from '@/hooks/useMediaLibrary';

/**
 * ============================================
 * STEP 1: STATE MANAGEMENT
 * ============================================
 * Add this to your PersonView component
 */

const [attachGQDialog, setAttachGQDialog] = useState({
  isOpen: false,
  eventType: null,
  selectedEvent: null,
});

/**
 * ============================================
 * STEP 2: DIALOG CONTROL HANDLERS
 * ============================================
 * Add these helper functions
 */

const handleOpenAttachGQDialog = useCallback((event) => {
  setAttachGQDialog({
    isOpen: true,
    eventType: event.type,
    selectedEvent: event,
  });
}, []);

const handleCloseAttachGQDialog = useCallback(() => {
  setAttachGQDialog({
    isOpen: false,
    eventType: null,
    selectedEvent: null,
  });
}, []);

/**
 * ============================================
 * STEP 3: SAVE HANDLER (THE MAIN INTEGRATION)
 * ============================================
 * This is where the dialog data gets saved to your database
 */

const handleAttachGQEvent = useCallback(
  async (eventData) => {
    try {
      // Show saving indicator
      console.log('Saving GQ event attachment...', eventData);

      // ==================================================
      // 1. CREATE OR UPDATE EVENT
      // ==================================================
      let event;
      if (attachGQDialog.selectedEvent?.id) {
        // UPDATE existing event with additional data
        event = await updateEvent(attachGQDialog.selectedEvent.id, {
          type: eventData.eventType,
          date: eventData.eventData.date,
          place: eventData.eventData.place,
          notes: (attachGQDialog.selectedEvent.notes || '') +
            (eventData.eventData.notes ? '\n\nGQ: ' + eventData.eventData.notes : ''),
          confidence: eventData.eventData.confidence,
        });
      } else {
        // CREATE new event
        event = await createEvent(person.id, {
          type: eventData.eventType,
          date: eventData.eventData.date,
          place: eventData.eventData.place,
          notes: eventData.eventData.notes || '',
          confidence: eventData.eventData.confidence,
        });
      }

      console.log('Event created/updated:', event);

      // ==================================================
      // 2. HANDLE EVENT-TYPE SPECIFIC DATA
      // ==================================================

      // For marriage events, handle spouse
      if (eventData.eventType === 'marriage') {
        if (eventData.eventData.spouse_id) {
          // Link to existing person as spouse
          await linkSpouseToEvent(event.id, eventData.eventData.spouse_id);
        } else if (eventData.eventData.spouse_name) {
          // Create new person as spouse
          const spouseName = eventData.eventData.spouse_name.split(' ');
          const spouse = await createPerson({
            firstName: spouseName[0],
            lastName: spouseName.slice(1).join(' '),
            is_living: 0, // Assume deceased (matching event person)
          });
          await linkSpouseToEvent(event.id, spouse.id);
        }
      }

      // For death events, handle cause
      if (eventData.eventType === 'death' && eventData.eventData.cause) {
        await updateEvent(event.id, {
          cause_of_death: eventData.eventData.cause,
        });
      }

      // ==================================================
      // 3. UPLOAD AND ATTACH PHOTOS
      // ==================================================
      console.log('Uploading photos...', eventData.photoData.length);

      const attachedPhotos = [];
      for (const photoData of eventData.photoData) {
        try {
          // Upload photo to media library
          const photo = await uploadPhoto(photoData.file, {
            label: photoData.label,
            pageRange: photoData.pageRange,
          });

          // Attach photo to event
          await attachPhotoToEvent(event.id, photo.id, {
            pageRange: photoData.pageRange,
            label: photoData.label,
          });

          attachedPhotos.push(photo);
          console.log('Photo attached:', photo.id);
        } catch (photoError) {
          console.warn('Failed to attach photo:', photoError);
          // Continue with other photos even if one fails
        }
      }

      // ==================================================
      // 4. CREATE WITNESSES/GODPARENTS
      // ==================================================
      if (eventData.witnesses.length > 0) {
        console.log('Creating witnesses...', eventData.witnesses.length);

        for (const witness of eventData.witnesses) {
          let witnessPersonId = witness.personId;

          // Create new person for witness if needed
          if (witness.isNewPerson && !witnessPersonId) {
            const witnessName = witness.name.split(' ');
            const newWitness = await createPerson({
              firstName: witnessName[0],
              lastName: witnessName.slice(1).join(' '),
              is_living: 0, // Assume historical person
            });
            witnessPersonId = newWitness.id;
            console.log('Created witness person:', newWitness.id);
          }

          // Link witness to event with role
          if (witnessPersonId) {
            await linkWitnessToEvent(event.id, witnessPersonId, {
              role: witness.role,
            });
            console.log('Linked witness:', witnessPersonId, witness.role);
          }
        }
      }

      // ==================================================
      // 5. CREATE GQ SOURCE (if not already exists)
      // ==================================================
      let sourceId = null;
      try {
        // Check if GQ source already exists
        sourceId = await getOrCreateSource({
          name: 'GénéalogieQuébec',
          type: 'website',
          url: 'https://genealogiequebec.com',
          notes: 'GénéalogieQuébec - Quebec Genealogy Records',
        });
        console.log('GQ Source ID:', sourceId);
      } catch (sourceError) {
        console.warn('Could not create source:', sourceError);
        // Continue without source - citation can be created manually
      }

      // ==================================================
      // 6. CREATE CITATION WITH GQ METADATA
      // ==================================================
      if (sourceId) {
        try {
          const citation = await createCitation({
            source_id: sourceId,
            person_id: person.id,
            event_id: event.id,
            entry_number: `GQ-${eventData.citationMetadata?.recordId || 'import-' + Date.now()}`,
            url: eventData.citationMetadata?.recordUrl || '',
            accessed_date: new Date().toISOString(),
            confidence: eventData.eventData.confidence,
            abstract: `${eventData.eventType.toUpperCase()}: ${eventData.eventData.date || '?'} in ${eventData.eventData.place || '?'}`,
            notes: `Collection: ${eventData.citationMetadata?.collectionName || 'GénéalogieQuébec Records'}
Record Type: ${eventData.citationMetadata?.recordType || 'Unknown'}
Photos: ${eventData.photoData.length}`,
          });
          console.log('Citation created:', citation.id);
        } catch (citationError) {
          console.warn('Failed to create citation:', citationError);
          // Citation is optional, continue even if it fails
        }
      }

      // ==================================================
      // 7. CLOSE DIALOG AND REFRESH UI
      // ==================================================
      console.log('All data saved successfully!');

      // Close dialog
      handleCloseAttachGQDialog();

      // Refresh person data to show new event
      await refreshPerson(person.id);

      // Show success message
      showSuccessNotification(
        `Event updated with ${attachedPhotos.length} photo(s) and ${eventData.witnesses.length} witness(es)`
      );

      // Optional: Scroll to event
      const eventElement = document.getElementById(`event-${event.id}`);
      if (eventElement) {
        eventElement.scrollIntoView({ behavior: 'smooth' });
      }
    } catch (error) {
      console.error('Failed to save GQ event:', error);
      showErrorNotification(
        'Failed to save event. Please try again.\n\n' + error.message
      );
      // Leave dialog open so user can retry or cancel
    }
  },
  [attachGQDialog.selectedEvent, person.id]
);

/**
 * ============================================
 * STEP 4: RENDER BUTTON IN EVENT LIST
 * ============================================
 * In your events rendering code, add this button
 */

{
  person.events?.map((event) => (
    <div key={event.id} id={`event-${event.id}`} className="event-item">
      <div className="event-header">
        <h4 className="event-type">
          {event.type.toUpperCase()}
        </h4>
        <p className="event-date">
          {event.date?.year || '?'}
          {event.date?.month && ` (${event.date.month})`}
        </p>
      </div>

      <div className="event-details">
        <p className="event-place">{event.place || 'Location unknown'}</p>
        {event.notes && (
          <p className="event-notes">{event.notes}</p>
        )}
      </div>

      <div className="event-actions">
        {/* ATTACH GQ RECORD BUTTON */}
        <button
          className="btn btn-secondary"
          onClick={() => handleOpenAttachGQDialog(event)}
          title={`Attach GénéalogieQuébec records to this ${event.type}`}
        >
          📎 Attach GQ Record
        </button>

        {/* Other event actions */}
        <button
          className="btn btn-secondary"
          onClick={() => handleEditEvent(event)}
        >
          Edit
        </button>

        <button
          className="btn btn-danger"
          onClick={() => handleDeleteEvent(event.id)}
        >
          Delete
        </button>
      </div>
    </div>
  ))
}

/**
 * ============================================
 * STEP 5: RENDER THE DIALOG COMPONENT
 * ============================================
 * Add this before the closing tag of your PersonView component
 */

<AttachGQEventDialog
  isOpen={attachGQDialog.isOpen}
  onClose={handleCloseAttachGQDialog}
  person={person}
  eventType={attachGQDialog.eventType}
  existingEventData={attachGQDialog.selectedEvent}
  allPeople={allPeople}  // Pass your list of all people for witness linking
  onSave={handleAttachGQEvent}
/>

/**
 * ============================================
 * HELPER FUNCTIONS
 * ============================================
 * These are examples - implement based on your data layer
 */

// Event Operations
async function createEvent(personId, eventData) {
  // TODO: Implement based on your backend/database
  // Should return { id, type, date, place, notes, ... }
  const response = await fetch(`/api/persons/${personId}/events`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(eventData),
  });
  return response.json();
}

async function updateEvent(eventId, eventData) {
  // TODO: Implement based on your backend/database
  const response = await fetch(`/api/events/${eventId}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(eventData),
  });
  return response.json();
}

// Person Operations
async function createPerson(personData) {
  // TODO: Implement based on your backend/database
  const response = await fetch('/api/persons', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(personData),
  });
  return response.json();
}

async function refreshPerson(personId) {
  // TODO: Reload person data from database
  // This could be Redux dispatch, state update, or hook callback
  const response = await fetch(`/api/persons/${personId}`);
  const updatedPerson = await response.json();
  setPerson(updatedPerson);
}

// Photo Operations
async function uploadPhoto(file, metadata = {}) {
  // TODO: Upload to your media server or local storage
  const formData = new FormData();
  formData.append('file', file);
  formData.append('metadata', JSON.stringify(metadata));

  const response = await fetch('/api/media/upload', {
    method: 'POST',
    body: formData,
  });
  return response.json();
}

async function attachPhotoToEvent(eventId, photoId, metadata = {}) {
  // TODO: Link photo to event in database
  const response = await fetch(`/api/events/${eventId}/photos`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ photo_id: photoId, ...metadata }),
  });
  return response.json();
}

// Witness/Relationship Operations
async function linkWitnessToEvent(eventId, witnessPersonId, metadata = {}) {
  // TODO: Create relationship between witness and event
  const response = await fetch(`/api/events/${eventId}/witnesses`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ person_id: witnessPersonId, ...metadata }),
  });
  return response.json();
}

async function linkSpouseToEvent(eventId, spousePersonId) {
  // TODO: Link spouse to marriage event
  const response = await fetch(`/api/events/${eventId}/spouse`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ person_id: spousePersonId }),
  });
  return response.json();
}

// Source/Citation Operations
async function getOrCreateSource(sourceData) {
  // TODO: Check if GQ source exists, create if not
  const response = await fetch('/api/sources/genealogiequebec', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(sourceData),
  });
  const source = await response.json();
  return source.id;
}

async function createCitation(citationData) {
  // TODO: Create citation linking event to source
  const response = await fetch('/api/citations', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(citationData),
  });
  return response.json();
}

// UI Notifications
function showSuccessNotification(message) {
  // TODO: Show success toast/notification
  console.log('SUCCESS:', message);
  // Example: toast.success(message);
}

function showErrorNotification(message) {
  // TODO: Show error toast/notification
  console.error('ERROR:', message);
  // Example: toast.error(message);
}

/**
 * ============================================
 * COMPLETE PERSONVIEW COMPONENT STRUCTURE
 * ============================================
 *
 * Here's how it all fits together:
 *
 * export function PersonView({ person, allPeople, onSavePerson }) {
 *   // State
 *   const [attachGQDialog, setAttachGQDialog] = useState({...});
 *
 *   // Handlers
 *   const handleOpenAttachGQDialog = useCallback(...);
 *   const handleCloseAttachGQDialog = useCallback(...);
 *   const handleAttachGQEvent = useCallback(...);
 *
 *   // Render
 *   return (
 *     <div className="person-view">
 *       {/* Header */}
 *       <h2>{person.firstName} {person.lastName}</h2>
 *
 *       {/* Basic Info */}
 *       <div className="person-info">
 *         ...
 *       </div>
 *
 *       {/* Events Section */}
 *       <div className="events-section">
 *         <h3>Events</h3>
 *         {person.events?.map(event => (
 *           <div key={event.id} className="event-item">
 *             ...
 *             <button onClick={() => handleOpenAttachGQDialog(event)}>
 *               📎 Attach GQ Record
 *             </button>
 *           </div>
 *         ))}
 *       </div>
 *
 *       {/* Dialog */}
 *       <AttachGQEventDialog
 *         isOpen={attachGQDialog.isOpen}
 *         onClose={handleCloseAttachGQDialog}
 *         person={person}
 *         eventType={attachGQDialog.eventType}
 *         allPeople={allPeople}
 *         onSave={handleAttachGQEvent}
 *       />
 *     </div>
 *   );
 * }
 */
