# Test Suite for Heritage App

This directory contains the unit tests for the Heritage genealogy application.

## Directory Structure

```
test/
├── setup.js              - Global test setup and mock configuration
├── testUtils.js          - Shared test utilities and mock data factories
├── hooks/                - Hook unit tests
│   ├── useToast.test.js
│   ├── useDialogs.test.js
│   ├── usePersonNavigation.test.js
│   └── usePersonForView.test.js
└── utils/                - Utility function unit tests
    ├── formatConverters.test.js
    └── dataModel.test.js
```

## Quick Reference

### Running Tests

```bash
# Watch mode (default during development)
npm test

# Run once (CI mode)
npm run test:run

# With coverage
npm run test:coverage

# Interactive UI
npm run test:ui
```

### Creating Test Data

```javascript
import {
  createMockPerson,
  createMockUnion,
  createMockEvent,
  createMockCitation,
  createMockBundleData,
  createMockLegacyData,
} from './testUtils';

// All factories support overrides
const person = createMockPerson({
  firstName: 'Jane',
  gender: 'female',
});
```

### Testing React Hooks

```javascript
import { renderHook, act } from '@testing-library/react';

const { result } = renderHook(() => useMyHook());

act(() => {
  result.current.updateFunction();
});

expect(result.current.value).toBe(expectedValue);
```

## Test Categories

### Utilities Tests (`utils/`)
Test pure functions and data transformations:
- Data format conversions
- Data model operations
- String/date formatting

### Hook Tests (`hooks/`)
Test custom React hooks:
- State management
- Side effects
- Callbacks and memoization

## Adding New Tests

1. Create file in appropriate directory
2. Follow naming: `[module].test.js`
3. Use shared test utilities
4. Add to this README if creating new category

## Mocks & Setup

Global mocks configured in `setup.js`:
- `localStorage` - Mock browser storage
- `window.electronAPI` - Mock Electron APIs
- `React.Fragment` - Provider wrapper for components

## Coverage Goals

- **Utilities:** 80%+ coverage
- **Hooks:** 70%+ coverage
- **Components:** Manual testing focus

## See Also

- [Main Test Guide](../../TEST_GUIDE.md)
- [Vitest Docs](https://vitest.dev/)
- [React Testing Library](https://testing-library.com/)
