import { render } from '@testing-library/react';
import React from 'react';

/**
 * Custom render function that wraps components with necessary providers
 * Add more providers as needed (Redux, Theme, etc.)
 */
export function renderWithProviders(component, options = {}) {
  function Wrapper({ children }) {
    return React.createElement(React.Fragment, null, children);
  }

  return render(component, { wrapper: Wrapper, ...options });
}

/**
 * Create mock person object for testing
 */
export function createMockPerson(overrides = {}) {
  return {
    id: 'person-1',
    firstName: 'John',
    lastName: 'Doe',
    middleName: '',
    maidenName: '',
    nickname: '',
    title: '',
    gender: 'male',
    birthDate: { type: 'unknown' },
    deathDate: { type: 'unknown' },
    birthPlace: '',
    deathPlace: '',
    notes: '',
    image: '',
    events: [],
    ...overrides,
  };
}

/**
 * Create mock union object for testing
 */
export function createMockUnion(overrides = {}) {
  return {
    id: 'union-1',
    partner1Id: 'person-1',
    partner2Id: 'person-2',
    type: 'marriage',
    startDate: null,
    startPlace: '',
    endDate: null,
    endReason: '',
    childIds: [],
    sources: [],
    ...overrides,
  };
}

/**
 * Create mock event object for testing
 */
export function createMockEvent(overrides = {}) {
  return {
    id: 'event-1',
    type: 'birth',
    date: { type: 'unknown' },
    place: '',
    placeId: null,
    description: '',
    ...overrides,
  };
}

/**
 * Create mock citation object for testing
 */
export function createMockCitation(overrides = {}) {
  return {
    id: 'citation-1',
    person_id: null,
    event_id: null,
    union_id: null,
    media_id: null,
    source_id: 'source-1',
    page: '',
    text: '',
    ...overrides,
  };
}

/**
 * Create mock bundle data for testing
 */
export function createMockBundleData(overrides = {}) {
  return {
    info: {
      name: 'Test Family',
      createdDate: new Date().toISOString(),
      ...overrides.info,
    },
    persons: [],
    unions: [],
    events: [],
    citations: [],
    sources: {},
    media: [],
    places: [],
  };
}

/**
 * Create mock legacy data for testing
 */
export function createMockLegacyData(overrides = {}) {
  return {
    people: [createMockPerson()],
    unions: [createMockUnion()],
    sources: {},
    ...overrides,
  };
}
