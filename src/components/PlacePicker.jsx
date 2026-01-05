/**
 * PlacePicker - Searchable dropdown for selecting places with add option
 */

import { useState, useRef, useEffect } from 'react';
import './PlacePicker.css';

export function PlacePicker({
  value,
  placeId,
  places = [],
  onChange,
  onCreatePlace,
  placeholder = "Select or type place..."
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchText, setSearchText] = useState(value || '');
  const [highlightIndex, setHighlightIndex] = useState(-1);
  const [isCreating, setIsCreating] = useState(false);
  const containerRef = useRef(null);
  const inputRef = useRef(null);

  // Filter places based on search
  const filteredPlaces = places.filter(place =>
    place.name?.toLowerCase().includes(searchText.toLowerCase())
  ).slice(0, 10); // Limit to 10 results

  // Check if there's an exact match
  const hasExactMatch = filteredPlaces.some(
    place => place.name?.toLowerCase() === searchText.toLowerCase()
  );

  // Show "Add new place" option if text is entered and no exact match
  const showAddOption = searchText.trim() && !hasExactMatch && onCreatePlace;

  // Total items including add option
  const totalItems = filteredPlaces.length + (showAddOption ? 1 : 0);

  // Sync searchText with value prop
  useEffect(() => {
    setSearchText(value || '');
  }, [value]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleInputChange = (e) => {
    const text = e.target.value;
    setSearchText(text);
    setIsOpen(true);
    setHighlightIndex(-1);
    // When typing, clear place_id but keep the text
    onChange({ place: text, placeId: null });
  };

  const handleSelectPlace = (place) => {
    setSearchText(place.name);
    setIsOpen(false);
    onChange({ place: place.name, placeId: place.id });
  };

  const handleAddNewPlace = async () => {
    if (!searchText.trim() || !onCreatePlace) return;

    setIsCreating(true);
    try {
      const newPlace = await onCreatePlace(searchText.trim());
      if (newPlace) {
        setSearchText(newPlace.name);
        setIsOpen(false);
        onChange({ place: newPlace.name, placeId: newPlace.id });
      }
    } catch (err) {
      console.error('Error creating place:', err);
    } finally {
      setIsCreating(false);
    }
  };

  const handleKeyDown = (e) => {
    if (!isOpen && e.key === 'ArrowDown') {
      setIsOpen(true);
      return;
    }

    if (!isOpen) return;

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setHighlightIndex(prev =>
        prev < totalItems - 1 ? prev + 1 : prev
      );
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setHighlightIndex(prev => prev > 0 ? prev - 1 : 0);
    } else if (e.key === 'Enter' && highlightIndex >= 0) {
      e.preventDefault();
      if (highlightIndex < filteredPlaces.length) {
        handleSelectPlace(filteredPlaces[highlightIndex]);
      } else if (showAddOption) {
        handleAddNewPlace();
      }
    } else if (e.key === 'Escape') {
      setIsOpen(false);
    }
  };

  const handleFocus = () => {
    setIsOpen(true);
  };

  const showDropdown = isOpen && (filteredPlaces.length > 0 || showAddOption);

  return (
    <div className="place-picker" ref={containerRef}>
      <input
        ref={inputRef}
        type="text"
        value={searchText}
        onChange={handleInputChange}
        onKeyDown={handleKeyDown}
        onFocus={handleFocus}
        placeholder={placeholder}
        className="text-input place-picker-input"
      />
      {placeId && (
        <span className="place-picker-linked" title="Linked to place library">
          📍
        </span>
      )}
      {showDropdown && (
        <div className="place-picker-dropdown">
          {filteredPlaces.map((place, index) => (
            <button
              key={place.id}
              type="button"
              className={`place-picker-option ${index === highlightIndex ? 'highlighted' : ''}`}
              onClick={() => handleSelectPlace(place)}
              onMouseEnter={() => setHighlightIndex(index)}
            >
              <span className="place-picker-name">{place.name}</span>
              {place.type && (
                <span className="place-picker-type">{place.type}</span>
              )}
            </button>
          ))}
          {showAddOption && (
            <button
              type="button"
              className={`place-picker-option place-picker-add ${highlightIndex === filteredPlaces.length ? 'highlighted' : ''}`}
              onClick={handleAddNewPlace}
              onMouseEnter={() => setHighlightIndex(filteredPlaces.length)}
              disabled={isCreating}
            >
              <span className="place-picker-add-icon">+</span>
              <span className="place-picker-add-text">
                {isCreating ? 'Adding...' : `Add "${searchText.trim()}" to places`}
              </span>
            </button>
          )}
        </div>
      )}
    </div>
  );
}

export default PlacePicker;
