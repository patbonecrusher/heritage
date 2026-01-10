# Heritage App - Unit Test Guide

This guide explains the test suite structure and how to use it for regression testing during development.

## Quick Start

### Run all tests
```bash
npm test
```

### Run tests once (CI mode)
```bash
npm run test:run
```

### Run tests with coverage report
```bash
npm run test:coverage
```

### Run tests with interactive UI
```bash
npm run test:ui
```

## Test Structure

```
src/test/
├── setup.js                    # Global test setup and mocks
├── testUtils.js                # Shared test utilities and mock factories
├── hooks/
│   ├── useToast.test.js        # Toast notification hook tests
│   ├── useDialogs.test.js      # Dialog state management tests
│   ├── usePersonNavigation.test.js  # Person navigation tests
│   └── usePersonForView.test.js     # Data transformation tests
└── utils/
    ├── formatConverters.test.js     # Format conversion utility tests
    └── dataModel.test.js            # Data model utility tests
```

## Test Coverage

### Utilities (src/utils/)
- **formatConverters.js** - Date/union format conversions
  - Bundle → Legacy format conversion
  - Legacy → Bundle format conversion
  - Date parsing and formatting
  - Union data transformation

- **dataModel.js** - Data structure management
  - Create empty data structures
  - Add/update persons
  - Find persons by ID

### Hooks (src/hooks/)
- **useToast.js** - Toast notifications
  - Show/hide toast
  - Update messages

- **useDialogs.js** - Dialog state management
  - Union dialog open/close
  - Preferences dialog state
  - Source dialog state

- **usePersonNavigation.js** - Person navigation with history
  - Navigate to person
  - Back/forward navigation
  - History management

- **usePersonForView.js** - Data transformation
  - Bundle mode person conversion
  - Legacy mode person handling
  - Union filtering
  - AllPeople list generation

## Mock Utilities

The `testUtils.js` file provides factory functions for creating test data:

### Mock Factories
```javascript
import {
  createMockPerson,
  createMockUnion,
  createMockEvent,
  createMockCitation,
  createMockBundleData,
  createMockLegacyData,
} from './testUtils';

// Create test data
const person = createMockPerson({ firstName: 'Jane' });
const union = createMockUnion({ type: 'divorce' });
const event = createMockEvent({ type: 'death' });
```

## Running Specific Tests

### Run tests for a specific file
```bash
npm test -- formatConverters.test.js
```

### Run tests matching a pattern
```bash
npm test -- --grep "usePersonNavigation"
```

### Run tests in watch mode with filter
```bash
npm test -- --watch utils
```

## Writing New Tests

### Basic Test Structure
```javascript
import { describe, it, expect } from 'vitest';
import { myFunction } from '../../utils/myUtil';

describe('myFunction', () => {
  it('does something specific', () => {
    const result = myFunction(input);
    expect(result).toBe(expectedOutput);
  });
});
```

### Testing React Hooks
```javascript
import { renderHook, act } from '@testing-library/react';
import { useMyHook } from '../../hooks/useMyHook';

describe('useMyHook', () => {
  it('initializes with default state', () => {
    const { result } = renderHook(() => useMyHook());
    expect(result.current.value).toBe(defaultValue);
  });

  it('updates state', () => {
    const { result } = renderHook(() => useMyHook());

    act(() => {
      result.current.setValue(newValue);
    });

    expect(result.current.value).toBe(newValue);
  });
});
```

### Using Mock Data
```javascript
import { createMockPerson, createMockUnion } from '../testUtils';

describe('myComponent', () => {
  it('renders person data', () => {
    const person = createMockPerson({ firstName: 'John' });
    // Use person in your test
  });
});
```

## Regression Testing Workflow

### Before Making Changes
1. Run full test suite: `npm run test:run`
2. Note baseline test count and coverage

### During Development
1. Keep tests running in watch mode: `npm test`
2. Write tests for new features before implementation (TDD)
3. Run relevant tests after changes: `npm test -- hooks/useMyHook.test.js`

### After Making Changes
1. Run full suite: `npm run test:run`
2. Generate coverage report: `npm run test:coverage`
3. Check for:
   - All tests passing ✅
   - No new test failures
   - Coverage maintained or improved

## Mocking Guide

### localStorage Mock
```javascript
// Already mocked in setup.js
localStorage.setItem('key', 'value');
localStorage.getItem('key'); // Returns 'value'
```

### Window.electronAPI Mock
```javascript
// Already mocked in setup.js
window.electronAPI.selectFile();
window.electronAPI.selectDirectory();
```

### Adding New Mocks
Edit `src/test/setup.js`:
```javascript
global.myMock = {
  myFunction: vi.fn(),
};
```

## Common Test Patterns

### Testing State Changes
```javascript
const { result } = renderHook(() => useMyHook());

act(() => {
  result.current.updateState(newValue);
});

expect(result.current.state).toBe(newValue);
```

### Testing Multiple Scenarios
```javascript
describe('dateConverter', () => {
  const testCases = [
    { input: '1990-05-15', expected: { year: 1990, month: 5 } },
    { input: '1990', expected: { year: 1990 } },
  ];

  testCases.forEach(({ input, expected }) => {
    it(`converts ${input}`, () => {
      expect(dateConverter(input)).toEqual(expected);
    });
  });
});
```

### Testing Conditional Logic
```javascript
it('handles both bundle and legacy modes', () => {
  // Bundle mode
  const bundleResult = usePersonForView({
    storageMode: 'bundle',
    // ... other props
  });
  expect(bundleResult).toBeDefined();

  // Legacy mode
  const legacyResult = usePersonForView({
    storageMode: 'legacy',
    // ... other props
  });
  expect(legacyResult).toBeDefined();
});
```

## Continuous Integration

To integrate tests into your CI pipeline:

```yaml
# .github/workflows/test.yml
name: Tests
on: [push, pull_request]
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - uses: actions/setup-node@v2
        with:
          node-version: '20'
      - run: npm install
      - run: npm run test:run
      - run: npm run test:coverage
```

## Troubleshooting

### Tests not running
```bash
# Clear cache and reinstall
rm -rf node_modules package-lock.json
npm install
npm test
```

### Hooks test failing
Ensure you're using `act()` for state updates:
```javascript
act(() => {
  result.current.updateFunction();
});
```

### Mock not working
Check that mocks are defined in `src/test/setup.js` and loaded before tests run.

### Coverage gaps
Run coverage report to identify untested code:
```bash
npm run test:coverage
# Check coverage/index.html
```

## Best Practices

1. ✅ **One assertion per test** (when possible)
2. ✅ **Descriptive test names** - Should explain what is being tested
3. ✅ **Use test data factories** - Use `createMock*` functions
4. ✅ **Keep tests isolated** - No dependencies between tests
5. ✅ **Test behavior, not implementation** - Test what it does, not how
6. ✅ **Clean up after tests** - Use `afterEach` hooks (done automatically)

## Resources

- [Vitest Documentation](https://vitest.dev/)
- [React Testing Library](https://testing-library.com/docs/react-testing-library/intro/)
- [Testing Best Practices](https://kentcdodds.com/blog/common-mistakes-with-react-testing-library)

