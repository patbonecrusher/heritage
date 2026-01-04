import React from 'react';
import PersonPhoto from './PersonPhoto';
import './PersonTooltip.css';

/**
 * PersonTooltip - A rich tooltip displaying person details
 *
 * Usage:
 *   <div className="has-person-tooltip">
 *     <span>Person Name</span>
 *     <PersonTooltip person={person} spouses={spouses} position="above" />
 *   </div>
 */
export default function PersonTooltip({
  person,
  spouses = [],
  position = 'above', // 'above' or 'below'
  align = 'center' // 'left', 'center', 'right'
}) {
  if (!person) return null;

  const name = [person.firstName, person.lastName].filter(Boolean).join(' ') || 'Unknown';

  // Extract dates - use same pattern as PersonView.jsx
  const birthYear = person.birthDate?.year;
  const deathYear = person.deathDate?.year;
  const birthPlace = person.birthPlace;
  const deathPlace = person.deathPlace;

  // Format lifespan
  const getLifespan = () => {
    if (birthYear && deathYear) {
      return `${birthYear} – ${deathYear}`;
    } else if (birthYear) {
      return `b. ${birthYear}`;
    } else if (deathYear) {
      return `d. ${deathYear}`;
    }
    return null;
  };

  const lifespan = getLifespan();

  return (
    <div className={`person-tooltip person-tooltip-${position} person-tooltip-align-${align}`}>
      <div className="person-tooltip-arrow" />
      <div className="person-tooltip-content">
        {/* Photo and Name */}
        <div className="person-tooltip-header">
          <PersonPhoto
            personId={person.id}
            width={48}
            height={48}
            className="person-tooltip-photo"
          />
          <div className="person-tooltip-name-section">
            <div className="person-tooltip-name">{name}</div>
            {lifespan && (
              <div className="person-tooltip-lifespan">{lifespan}</div>
            )}
          </div>
        </div>

        {/* Details */}
        <div className="person-tooltip-details">
          {/* Birth */}
          <div className="person-tooltip-row">
            <span className="person-tooltip-icon">★</span>
            <span className="person-tooltip-label">Birth</span>
            <span className="person-tooltip-value">
              {birthYear || birthPlace ? (
                <>
                  {birthYear && <span>{birthYear}</span>}
                  {birthPlace && <span className="person-tooltip-place">{birthPlace}</span>}
                </>
              ) : (
                <span className="person-tooltip-unknown">Unknown</span>
              )}
            </span>
          </div>

          {/* Death */}
          <div className="person-tooltip-row">
            <span className="person-tooltip-icon">†</span>
            <span className="person-tooltip-label">Death</span>
            <span className="person-tooltip-value">
              {deathYear || deathPlace ? (
                <>
                  {deathYear && <span>{deathYear}</span>}
                  {deathPlace && <span className="person-tooltip-place">{deathPlace}</span>}
                </>
              ) : (
                <span className="person-tooltip-unknown">Unknown</span>
              )}
            </span>
          </div>

          {/* Spouses */}
          {spouses.length > 0 && spouses.map((spouse, idx) => {
            const spouseName = [spouse.firstName, spouse.lastName].filter(Boolean).join(' ');
            return (
              <div key={spouse.id || idx} className="person-tooltip-row">
                <span className="person-tooltip-icon">⚭</span>
                <span className="person-tooltip-label">Spouse</span>
                <span className="person-tooltip-value">{spouseName}</span>
              </div>
            );
          })}
        </div>

        {/* Click hint */}
        <div className="person-tooltip-hint">Click to view</div>
      </div>
    </div>
  );
}
