/**
 * useAttachGQEvent - Hook for attaching GénéalogieQuébec records to existing events
 *
 * Handles:
 * - Photo upload and management
 * - Form data for event details
 * - Creating/updating events
 * - Attaching photos to events
 * - Generating citations
 * - Witness/godparent management
 */

import { useState, useCallback, useMemo, useEffect } from 'react';
import { parseGQDate, normalizeQCPlace } from '@/integrations/genealogieQuebec/dataMapper';
import { useDatabase } from '@/data/DatabaseContext';

export function useAttachGQEvent({
  personId,
  eventType,
  existingEventData = null,
  onSave = async () => {},
  onRequestClose = () => {},
}) {
  const { query, resolveMediaPath } = useDatabase();


  // ============================================
  // State: Photos
  // ============================================
  const [photos, setPhotos] = useState([]);

  // ============================================
  // State: Form Data
  // ============================================
  const [formData, setFormData] = useState({
    // Common fields
    date: existingEventData?.date || '',
    place: existingEventData?.place || '',
    confidence: existingEventData?.confidence || 'probable',
    notes: existingEventData?.notes || '',

    // Event-specific fields
    ...getInitialFieldsForEventType(eventType, existingEventData),
  });

  // ============================================
  // State: Witnesses/Godparents
  // ============================================
  const [witnesses, setWitnesses] = useState(existingEventData?.witnesses || []);

  // ============================================
  // State: UI
  // ============================================
  const [mainPhotoIndex, setMainPhotoIndex] = useState(0);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState(null);

  // ============================================
  // Load Existing Photos
  // ============================================

  useEffect(() => {
    // If editing existing event with photos, load them from media database
    if (existingEventData?.photoIds && existingEventData.photoIds.length > 0) {
      // Try to load photos from the event's media references
      const loadExistingPhotos = async () => {
        try {
          const loadedPhotos = [];

          for (const photoId of existingEventData.photoIds) {
            try {
              // Query the media database for this photo
              const mediaRecords = await query(
                'SELECT * FROM media WHERE id = ?',
                [photoId]
              );

              if (mediaRecords && mediaRecords.length > 0) {
                const media = mediaRecords[0];
                const previewUrl = media.path ? await resolveMediaPath(media.path) : null;

                loadedPhotos.push({
                  id: photoId,
                  file: null, // Already saved, no File object needed
                  label: media.title || `Photo ${loadedPhotos.length + 1}`,
                  pageRange: '',
                  type: 'image',
                  preview: previewUrl || `heritage-media://media/photos/${photoId}`,
                  isExisting: true, // Mark as existing so we don't re-save it
                });
              } else {
                // Fallback if media not found in database
                loadedPhotos.push({
                  id: photoId,
                  file: null,
                  label: `Photo ${loadedPhotos.length + 1}`,
                  pageRange: '',
                  type: 'image',
                  preview: `heritage-media://media/photos/${photoId}`,
                  isExisting: true,
                });
              }
            } catch (photoErr) {
              console.error(`Error loading photo ${photoId}:`, photoErr);
              // Continue with fallback
              loadedPhotos.push({
                id: photoId,
                file: null,
                label: `Photo ${loadedPhotos.length + 1}`,
                pageRange: '',
                type: 'image',
                preview: `heritage-media://media/photos/${photoId}`,
                isExisting: true,
              });
            }
          }

          if (loadedPhotos.length > 0) {
            console.log('Loading existing photos:', loadedPhotos);
            setPhotos(loadedPhotos);
          }
        } catch (err) {
          console.error('Error loading existing photos:', err);
        }
      };

      loadExistingPhotos();
    } else if (!existingEventData?.photoIds) {
      // Clear photos if no existing data
      setPhotos([]);
    }
  }, [existingEventData, query, resolveMediaPath]);

  // ============================================
  // Photo Methods
  // ============================================

  const addPhotos = useCallback((files) => {
    const newPhotos = Array.from(files).map((file) => {
      // Use filename without extension as label
      const filename = file.name.substring(0, file.name.lastIndexOf('.')) || file.name;
      return {
        id: `photo-${Date.now()}-${Math.random()}`,
        file,
        label: filename,
        pageRange: '',
        type: 'image',
        preview: URL.createObjectURL(file),
      };
    });

    setPhotos((prev) => [...prev, ...newPhotos]);
  }, []);

  const removePhoto = useCallback((photoId) => {
    setPhotos((prev) => {
      const filtered = prev.filter((p) => p.id !== photoId);
      // Adjust main photo index if needed
      if (mainPhotoIndex >= filtered.length && filtered.length > 0) {
        setMainPhotoIndex(filtered.length - 1);
      }
      return filtered;
    });
  }, [mainPhotoIndex]);

  const updatePhotoMetadata = useCallback((photoId, label, pageRange) => {
    setPhotos((prev) =>
      prev.map((p) =>
        p.id === photoId
          ? { ...p, label, pageRange }
          : p
      )
    );
  }, []);

  const setMainPhoto = useCallback((index) => {
    if (index >= 0 && index < photos.length) {
      setMainPhotoIndex(index);
    }
  }, [photos.length]);

  // ============================================
  // Form Methods
  // ============================================

  const updateFormField = useCallback((field, value) => {
    setFormData((prev) => ({
      ...prev,
      [field]: value,
    }));
    setError(null); // Clear error on field change
  }, []);

  const updateArrayField = useCallback((field, index, value) => {
    setFormData((prev) => {
      const updated = [...prev[field]];
      updated[index] = value;
      return { ...prev, [field]: updated };
    });
  }, []);

  // ============================================
  // Witness Methods
  // ============================================

  const addWitness = useCallback((witness) => {
    setWitnesses((prev) => [
      ...prev,
      {
        id: `witness-${Date.now()}`,
        name: witness.name,
        personId: witness.personId || null, // Link to existing person if available
        role: witness.role || 'witness',
        notes: witness.notes || '',
      },
    ]);
  }, []);

  const removeWitness = useCallback((witnessId) => {
    setWitnesses((prev) => prev.filter((w) => w.id !== witnessId));
  }, []);

  const updateWitness = useCallback((witnessId, updates) => {
    setWitnesses((prev) =>
      prev.map((w) =>
        w.id === witnessId
          ? { ...w, ...updates }
          : w
      )
    );
  }, []);

  // ============================================
  // Validation
  // ============================================

  const validateForm = useCallback(() => {
    const errors = [];

    // Check required fields
    if (!formData.date || formData.date.trim() === '') {
      errors.push('Event date is required');
    }

    if (!formData.place || formData.place.trim() === '') {
      errors.push('Event place is required');
    }

    // Check photos
    if (photos.length === 0) {
      errors.push('At least one photo is required');
    }

    // Event-specific validation
    if (eventType === 'marriage') {
      if (!formData.spouse_id && !formData.spouse_name) {
        errors.push('Spouse information is required for marriage');
      }
    }

    return errors;
  }, [formData, photos, eventType]);

  // ============================================
  // Save
  // ============================================

  const saveEvent = useCallback(async () => {
    try {
      setIsSaving(true);
      setError(null);

      // Validate
      const errors = validateForm();
      if (errors.length > 0) {
        setError(errors[0]); // Show first error
        return;
      }

      // Prepare event data
      const eventData = {
        type: eventType,
        date: parseGQDate(formData.date),
        place: normalizeQCPlace(formData.place) || formData.place,
        confidence: formData.confidence,
        notes: formData.notes,
        // Event-specific fields
        ...(eventType === 'marriage' && {
          spouse_id: formData.spouse_id,
          spouse_name: formData.spouse_name,
        }),
        ...(eventType === 'death' && {
          cause: formData.cause,
        }),
        ...(witnesses.length > 0 && {
          witnesses: witnesses,
        }),
      };

      // Prepare photo data - only include new photos (skip existing ones)
      const photoData = photos
        .filter(photo => !photo.isExisting || photo.file) // Skip existing photos without files
        .map((photo) => ({
          id: photo.id,
          file: photo.file,
          label: photo.label,
          pageRange: photo.pageRange,
          type: photo.type,
        }));

      // Call parent save handler
      await onSave({
        personId,
        eventData,
        photoData,
      });

      onRequestClose();
    } catch (err) {
      console.error('Failed to save event:', err);
      setError(err.message || 'Failed to save event');
    } finally {
      setIsSaving(false);
    }
  }, [
    formData,
    photos,
    witnesses,
    eventType,
    personId,
    validateForm,
    onSave,
    onRequestClose,
  ]);

  // ============================================
  // Computed Values
  // ============================================

  const mainPhoto = useMemo(
    () => (photos.length > 0 ? photos[mainPhotoIndex] : null),
    [photos, mainPhotoIndex]
  );

  const photoPageRanges = useMemo(() => {
    const ranges = photos
      .map((p) => p.pageRange)
      .filter((range) => range && range.trim() !== '');

    if (ranges.length === 0) return '';

    // Combine page ranges: "p.21-22" or "p.21, p.23-24"
    return ranges.join(', ');
  }, [photos]);

  const isValid = useMemo(() => {
    return validateForm().length === 0;
  }, [validateForm]);

  // ============================================
  // Return
  // ============================================

  return {
    // State
    photos,
    formData,
    witnesses,
    mainPhoto,
    mainPhotoIndex,
    isSaving,
    error,
    isValid,
    photoPageRanges,

    // Photo methods
    addPhotos,
    removePhoto,
    updatePhotoMetadata,
    setMainPhoto,

    // Form methods
    updateFormField,
    updateArrayField,

    // Witness methods
    addWitness,
    removeWitness,
    updateWitness,

    // Save
    saveEvent,
  };
}

// ============================================
// Helper Functions
// ============================================

/**
 * Get initial form fields based on event type
 */
function getInitialFieldsForEventType(eventType, existingData = null) {
  const base = {};

  switch (eventType) {
    case 'baptism':
      return {
        ...base,
        godparents: existingData?.godparents || [],
      };

    case 'marriage':
      return {
        ...base,
        spouse_id: existingData?.spouse_id || null,
        spouse_name: existingData?.spouse_name || '',
        witnesses: existingData?.witnesses || [],
      };

    case 'death':
    case 'burial':
      return {
        ...base,
        cause: existingData?.cause || '',
      };

    default:
      return base;
  }
}

/**
 * Detect photo type from filename
 */
function detectPhotoType(filename) {
  const lower = filename.toLowerCase();

  if (lower.includes('gq') || lower.includes('screenshot')) {
    return {
      type: 'gq_screenshot',
      label: 'GQ Screenshot',
      pageRange: '',
    };
  }

  if (lower.includes('drouin') || lower.includes('original')) {
    return {
      type: 'drouin_original',
      label: 'Drouin Original',
      pageRange: '',
    };
  }

  if (lower.includes('scan') || lower.includes('full')) {
    return {
      type: 'full_scan',
      label: 'Full Scan',
      pageRange: '',
    };
  }

  if (lower.includes('church') || lower.includes('register')) {
    return {
      type: 'church_record',
      label: 'Church Record',
      pageRange: '',
    };
  }

  return {
    type: 'other',
    label: 'Document',
    pageRange: '',
  };
}
