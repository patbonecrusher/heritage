/**
 * PersonPicker - Searchable autocomplete dropdown for selecting people
 * Based on PlacePicker pattern, optimized for large datasets
 */

import { useState, useRef, useEffect } from 'react';
import './PersonPicker.css';

export function PersonPicker({
  value,           // The selected person ID
  people = [],     // Array of all available people
  onChange,        // Callback: (personId) => void
  placeholder = "Search or select person...",
  excludeIds = [], // IDs to exclude from the list (e.g., current person)
  filterFn,        // Optional additional filter function
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchText, setSearchText] = useState('');
  const [highlightIndex, setHighlightIndex] = useState(-1);
  const containerRef = useRef(null);
  const inputRef = useRef(null);
  const listRef = useRef(null);

  // Get the display name for a person
  const getPersonName = (person) => {
    if (!person) return '';
    return [person.firstName, person.lastName].filter(Boolean).join(' ') || 'Unknown';
  };

  // Get the currently selected person
  const selectedPerson = people.find(p => p.id === value);

  // Filter and search people
  const filteredPeople = people
    .filter(person => {
      // Exclude specified IDs
      if (excludeIds.includes(person.id)) return false;
      // Apply custom filter if provided
      if (filterFn && !filterFn(person)) return false;
      // Search filter
      if (searchText) {
        const name = getPersonName(person).toLowerCase();
        const query = searchText.toLowerCase();
        // Search by first name, last name, or full name
        return name.includes(query) ||
               person.firstName?.toLowerCase().includes(query) ||
               person.lastName?.toLowerCase().includes(query);
      }
      return true;
    })
    .slice(0, 15); // Limit to 15 results for performance

  // Update display text when value changes
  useEffect(() => {
    if (!isOpen) {
      setSearchText(selectedPerson ? getPersonName(selectedPerson) : '');
    }
  }, [value, selectedPerson, isOpen]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setIsOpen(false);
        // Reset to selected person name
        setSearchText(selectedPerson ? getPersonName(selectedPerson) : '');
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [selectedPerson]);

  // Scroll highlighted item into view
  useEffect(() => {
    if (highlightIndex >= 0 && listRef.current) {
      const item = listRef.current.children[highlightIndex];
      if (item) {
        item.scrollIntoView({ block: 'nearest' });
      }
    }
  }, [highlightIndex]);

  const handleInputChange = (e) => {
    const text = e.target.value;
    setSearchText(text);
    setIsOpen(true);
    setHighlightIndex(-1);
  };

  const handleSelectPerson = (person) => {
    setSearchText(getPersonName(person));
    setIsOpen(false);
    onChange(person.id);
  };

  const handleClear = () => {
    setSearchText('');
    setIsOpen(false);
    onChange(null);
    inputRef.current?.focus();
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
        prev < filteredPeople.length - 1 ? prev + 1 : prev
      );
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setHighlightIndex(prev => prev > 0 ? prev - 1 : 0);
    } else if (e.key === 'Enter' && highlightIndex >= 0) {
      e.preventDefault();
      handleSelectPerson(filteredPeople[highlightIndex]);
    } else if (e.key === 'Escape') {
      setIsOpen(false);
      setSearchText(selectedPerson ? getPersonName(selectedPerson) : '');
    }
  };

  const handleFocus = () => {
    setIsOpen(true);
    // Select all text for easy replacement
    if (inputRef.current) {
      inputRef.current.select();
    }
  };

  // Format dates for display
  const formatDates = (person) => {
    const parts = [];
    if (person.birthDate?.year) {
      parts.push(`b. ${person.birthDate.year}`);
    }
    if (person.deathDate?.year) {
      parts.push(`d. ${person.deathDate.year}`);
    }
    return parts.join(' ');
  };

  return (
    <div className="person-picker" ref={containerRef}>
      <input
        ref={inputRef}
        type="text"
        value={searchText}
        onChange={handleInputChange}
        onKeyDown={handleKeyDown}
        onFocus={handleFocus}
        placeholder={placeholder}
        className="text-input person-picker-input"
      />
      {value && (
        <button
          type="button"
          className="person-picker-clear"
          onClick={handleClear}
          title="Clear selection"
        >
          ×
        </button>
      )}
      {isOpen && (
        <div className="person-picker-dropdown" ref={listRef}>
          {filteredPeople.length === 0 ? (
            <div className="person-picker-empty">
              {searchText ? 'No matches found' : 'No people available'}
            </div>
          ) : (
            filteredPeople.map((person, index) => (
              <button
                key={person.id}
                type="button"
                className={`person-picker-option ${index === highlightIndex ? 'highlighted' : ''} ${person.id === value ? 'selected' : ''}`}
                onMouseDown={(e) => {
                  e.preventDefault(); // Prevent input blur
                }}
                onClick={() => handleSelectPerson(person)}
                onMouseEnter={() => setHighlightIndex(index)}
              >
                <span className="person-picker-name">{getPersonName(person)}</span>
                <span className="person-picker-info">
                  {person.gender && (
                    <span className={`person-picker-gender ${person.gender}`}>
                      {person.gender === 'male' ? '♂' : person.gender === 'female' ? '♀' : '⚪'}
                    </span>
                  )}
                  <span className="person-picker-dates">{formatDates(person)}</span>
                </span>
              </button>
            ))
          )}
        </div>
      )}
    </div>
  );
}

export default PersonPicker;
