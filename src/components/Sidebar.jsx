import React, { useState, useMemo } from 'react';
import { groupBySurname } from '../utils/dataModel';
import { useDatabase, usePersons } from '../data';

export default function Sidebar({
  data,
  selectedPersonId,
  onSelectPerson,
  onEditPerson,
  onAddPerson,
  storageMode,
}) {
  const [searchQuery, setSearchQuery] = useState('');
  const [collapsedGroups, setCollapsedGroups] = useState(new Set());

  // Use database hook when in bundle mode
  const { isOpen } = useDatabase();
  const { persons, getPersonsBySurname, loading: dbLoading } = usePersons();

  // Group people by surname - use database or props based on mode
  const groups = useMemo(() => {
    if (storageMode === 'bundle' && isOpen) {
      // Convert database format to display format
      return getPersonsBySurname().map(group => ({
        surname: group.surname,
        people: group.persons.map(p => ({
          id: p.id,
          firstName: p.given_names,
          lastName: p.surname,
          nickname: null, // TODO: get from person_name table
          birthDate: null, // TODO: get from events
          deathDate: null, // TODO: get from events
        }))
      }));
    }
    // Legacy mode - use props
    return groupBySurname(data);
  }, [storageMode, isOpen, getPersonsBySurname, data]);

  // Filter by search query
  const filteredGroups = useMemo(() => {
    if (!searchQuery.trim()) return groups;

    const query = searchQuery.toLowerCase();
    return groups
      .map(group => ({
        ...group,
        people: group.people.filter(person => {
          const fullName = [person.firstName, person.lastName, person.nickname]
            .filter(Boolean).join(' ').toLowerCase();
          return fullName.includes(query);
        })
      }))
      .filter(group => group.people.length > 0);
  }, [groups, searchQuery]);

  const toggleGroup = (surname) => {
    setCollapsedGroups(prev => {
      const next = new Set(prev);
      if (next.has(surname)) {
        next.delete(surname);
      } else {
        next.add(surname);
      }
      return next;
    });
  };

  const formatDates = (person) => {
    const birth = person.birthDate;
    const death = person.deathDate;

    let birthYear = '';
    let deathYear = '';

    if (birth?.year) birthYear = birth.year;
    else if (birth?.display) {
      const match = birth.display.match(/\d{4}/);
      if (match) birthYear = match[0];
    }

    if (death?.type === 'alive') {
      return birthYear ? `b. ${birthYear}` : '';
    }

    if (death?.year) deathYear = death.year;
    else if (death?.display) {
      const match = death.display.match(/\d{4}/);
      if (match) deathYear = match[0];
    }

    if (birthYear && deathYear) return `${birthYear} - ${deathYear}`;
    if (birthYear) return `b. ${birthYear}`;
    if (deathYear) return `d. ${deathYear}`;
    return '';
  };

  const totalPeople = groups.reduce((sum, g) => sum + g.people.length, 0);
  const isLoading = storageMode === 'bundle' && dbLoading;

  return (
    <div className="sidebar">
      <div className="sidebar-header">
        <h2>People</h2>
        <span className="sidebar-count">
          {isLoading ? '...' : totalPeople}
        </span>
      </div>

      <div className="sidebar-search">
        <input
          type="text"
          placeholder="Search..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="sidebar-search-input"
        />
        {searchQuery && (
          <button
            className="sidebar-search-clear"
            onClick={() => setSearchQuery('')}
          >
            ×
          </button>
        )}
      </div>

      <div className="sidebar-list">
        {filteredGroups.length === 0 ? (
          <div className="sidebar-empty">
            {searchQuery ? 'No matches found' : 'No people yet'}
          </div>
        ) : (
          filteredGroups.map(group => (
            <div key={group.surname} className="sidebar-group">
              <button
                className="sidebar-group-header"
                onClick={() => toggleGroup(group.surname)}
              >
                <span className="sidebar-group-arrow">
                  {collapsedGroups.has(group.surname) ? '▶' : '▼'}
                </span>
                <span className="sidebar-group-name">{group.surname}</span>
                <span className="sidebar-group-count">{group.people.length}</span>
              </button>

              {!collapsedGroups.has(group.surname) && (
                <div className="sidebar-group-people">
                  {group.people.map(person => (
                    <button
                      key={person.id}
                      className={`sidebar-person ${selectedPersonId === person.id ? 'selected' : ''}`}
                      onClick={() => onSelectPerson(person.id)}
                      onDoubleClick={() => onEditPerson && onEditPerson(person.id)}
                    >
                      <div className="sidebar-person-name">
                        {person.firstName || 'Unknown'}
                        {person.nickname && ` "${person.nickname}"`}
                      </div>
                      <div className="sidebar-person-dates">
                        {formatDates(person)}
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          ))
        )}
      </div>

      <div className="sidebar-footer">
        <button className="sidebar-add-btn" onClick={onAddPerson}>
          + Add Person
        </button>
      </div>
    </div>
  );
}
