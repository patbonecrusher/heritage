/**
 * PlacePicker - Searchable dropdown for selecting places
 */

import { useState, useRef, useEffect } from 'react';
import './PlacePicker.css';

export function PlacePicker({
  value,
  placeId,
  places = [],
  onChange,
  placeholder = "Select or type place..."
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchText, setSearchText] = useState(value || '');
  const [highlightIndex, setHighlightIndex] = useState(-1);
  const containerRef = useRef(null);
  const inputRef = useRef(null);

  // Filter places based on search
  const filteredPlaces = places.filter(place =>
    place.name?.toLowerCase().includes(searchText.toLowerCase())
  ).slice(0, 10); // Limit to 10 results

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

  const handleKeyDown = (e) => {
    if (!isOpen && e.key === 'ArrowDown') {
      setIsOpen(true);
      return;
    }

    if (!isOpen) return;

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setHighlightIndex(prev =>
        prev < filteredPlaces.length - 1 ? prev + 1 : prev
      );
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setHighlightIndex(prev => prev > 0 ? prev - 1 : 0);
    } else if (e.key === 'Enter' && highlightIndex >= 0) {
      e.preventDefault();
      handleSelectPlace(filteredPlaces[highlightIndex]);
    } else if (e.key === 'Escape') {
      setIsOpen(false);
    }
  };

  const handleFocus = () => {
    if (places.length > 0) {
      setIsOpen(true);
    }
  };

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
      {isOpen && filteredPlaces.length > 0 && (
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
        </div>
      )}
    </div>
  );
}

export default PlacePicker;
