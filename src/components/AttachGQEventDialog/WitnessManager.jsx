/**
 * WitnessManager - Manages witnesses and godparents for events
 *
 * Supports:
 * - Birth/Baptism: Godparents (parrain/marraine)
 * - Marriage: Witnesses
 * - Death: Witnesses at deathbed (optional)
 * - All events: Custom witnesses
 */

import React, { useState } from 'react';
import './WitnessManager.css';

export function WitnessManager({
  eventType,
  witnesses = [],
  onAddWitness = () => {},
  onRemoveWitness = () => {},
  onUpdateWitness = () => {},
  allPeople = [],
  disabled = false,
}) {
  const [isAddingWitness, setIsAddingWitness] = useState(false);
  const [newWitness, setNewWitness] = useState({
    name: '',
    role: getDefaultRoleForEventType(eventType),
    personId: null,
    isNewPerson: false,
  });

  const witnessLabel = getWitnessLabelForEventType(eventType);
  const roleOptions = getRoleOptionsForEventType(eventType);

  const handleAddClick = () => {
    setIsAddingWitness(true);
    setNewWitness({
      name: '',
      role: getDefaultRoleForEventType(eventType),
      personId: null,
      isNewPerson: false,
    });
  };

  const handleCancelAdd = () => {
    setIsAddingWitness(false);
  };

  const handleSaveWitness = () => {
    if (!newWitness.name.trim()) {
      return;
    }

    const witness = {
      id: `witness-${Date.now()}`,
      name: newWitness.name.trim(),
      role: newWitness.role,
      personId: newWitness.personId || null,
      isNewPerson: newWitness.isNewPerson,
    };

    onAddWitness(witness);
    setIsAddingWitness(false);
  };

  const handleUpdateWitness = (witnessId, field, value) => {
    onUpdateWitness(witnessId, field, value);
  };

  const handleRemoveWitness = (witnessId) => {
    onRemoveWitness(witnessId);
  };

  const handleNameChange = (e) => {
    setNewWitness(prev => ({ ...prev, name: e.target.value }));
  };

  const handleRoleChange = (e) => {
    setNewWitness(prev => ({ ...prev, role: e.target.value }));
  };

  const handlePersonLinkChange = (e) => {
    const personId = e.target.value;
    setNewWitness(prev => ({
      ...prev,
      personId: personId || null,
      isNewPerson: !personId,
    }));
  };

  const handlePersonLinkForExisting = (witnessId, personId) => {
    handleUpdateWitness(witnessId, 'personId', personId || null);
  };

  return (
    <div className="witnesses-section">
      <div className="witnesses-header">
        <h4>{witnessLabel}s</h4>
        <span className="witness-count">{witnesses.length}</span>
      </div>

      {witnesses.length === 0 && !isAddingWitness && (
        <p className="no-witnesses">No {witnessLabel.toLowerCase()}s yet</p>
      )}

      <div className="witnesses-list">
        {witnesses.map(witness => (
          <div key={witness.id} className="witness-item">
            <div className="witness-content">
              <div className="witness-name">{witness.name}</div>
              <div className="witness-role">{witness.role}</div>
              {witness.personId && (
                <div className="witness-linked">
                  Linked to person
                </div>
              )}
            </div>

            <div className="witness-actions">
              {!witness.personId && (
                <select
                  className="link-select"
                  defaultValue=""
                  onChange={(e) => handlePersonLinkForExisting(witness.id, e.target.value)}
                  disabled={disabled}
                  title="Link this witness to an existing person"
                >
                  <option value="">Link to person...</option>
                  {allPeople.map(person => (
                    <option key={person.id} value={person.id}>
                      {person.firstName} {person.lastName}
                    </option>
                  ))}
                </select>
              )}

              <button
                className="btn-remove-witness"
                onClick={() => handleRemoveWitness(witness.id)}
                disabled={disabled}
                title={`Remove ${witness.name}`}
              >
                ✕
              </button>
            </div>
          </div>
        ))}
      </div>

      {isAddingWitness && (
        <div className="witness-form">
          <div className="form-group">
            <label>Name</label>
            <input
              type="text"
              className="form-input"
              placeholder={`${witnessLabel} name`}
              value={newWitness.name}
              onChange={handleNameChange}
              disabled={disabled}
              autoFocus
            />
          </div>

          <div className="form-group">
            <label>Role</label>
            <select
              className="form-input"
              value={newWitness.role}
              onChange={handleRoleChange}
              disabled={disabled}
            >
              {roleOptions.map(role => (
                <option key={role} value={role}>
                  {role}
                </option>
              ))}
            </select>
          </div>

          <div className="form-group">
            <label>Link to Existing Person (Optional)</label>
            <select
              className="form-input"
              value={newWitness.personId || ''}
              onChange={handlePersonLinkChange}
              disabled={disabled}
            >
              <option value="">Create as new person</option>
              {allPeople.map(person => (
                <option key={person.id} value={person.id}>
                  {person.firstName} {person.lastName}
                </option>
              ))}
            </select>
          </div>

          <div className="witness-form-actions">
            <button
              className="btn btn-primary"
              onClick={handleSaveWitness}
              disabled={!newWitness.name.trim() || disabled}
            >
              Add {witnessLabel}
            </button>
            <button
              className="btn btn-secondary"
              onClick={handleCancelAdd}
              disabled={disabled}
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {!isAddingWitness && (
        <button
          className="btn-add-witness"
          onClick={handleAddClick}
          disabled={disabled}
        >
          + Add {witnessLabel}
        </button>
      )}
    </div>
  );
}

/**
 * Helper functions
 */

function getWitnessLabelForEventType(eventType) {
  switch (eventType) {
    case 'baptism':
      return 'Godparent';
    case 'marriage':
      return 'Witness';
    case 'death':
      return 'Witness';
    default:
      return 'Witness';
  }
}

function getDefaultRoleForEventType(eventType) {
  switch (eventType) {
    case 'baptism':
      return 'Godparent';
    case 'marriage':
      return 'Witness';
    case 'death':
      return 'Witness';
    default:
      return 'Witness';
  }
}

function getRoleOptionsForEventType(eventType) {
  switch (eventType) {
    case 'baptism':
      return ['Godfather', 'Godmother', 'Godparent'];
    case 'marriage':
      return ['Best Man', 'Bridesmaid', 'Witness'];
    case 'death':
      return ['Witness', 'Attendant', 'Pallbearer'];
    default:
      return ['Witness', 'Other'];
  }
}
