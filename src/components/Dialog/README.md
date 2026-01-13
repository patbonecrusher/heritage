# Dialog Component

A flexible, reusable dialog component using the compound component pattern. Handles all close mechanisms (Escape key, overlay click, close button) automatically with sensible defaults.

## Features

- **Automatic close handling**: Escape key, overlay click, close button (×)
- **Size variants**: Small, Medium, Large, Fullscreen
- **Flexible content**: Compound components for header, content, footer
- **Theming**: Automatic support for light/dark themes via CSS variables
- **Composable**: Build complex dialogs by composing simple components

## Basic Usage

```jsx
import Dialog from './Dialog';

function MyDialog() {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      <button onClick={() => setIsOpen(true)}>Open Dialog</button>

      <Dialog isOpen={isOpen} onClose={() => setIsOpen(false)} size="medium">
        <Dialog.Header>
          <Dialog.Title>My Dialog</Dialog.Title>
        </Dialog.Header>

        <Dialog.Content>
          <p>Dialog content goes here</p>
        </Dialog.Content>

        <Dialog.Footer>
          <Dialog.Actions>
            <button onClick={() => setIsOpen(false)}>Cancel</button>
            <button className="primary" onClick={handleSave}>Save</button>
          </Dialog.Actions>
        </Dialog.Footer>
      </Dialog>
    </>
  );
}
```

## Props

### Dialog

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `isOpen` | boolean | required | Controls dialog visibility |
| `onClose` | function | required | Called when dialog should close |
| `size` | string | 'medium' | Size variant: 'small', 'medium', 'large', 'fullscreen' |
| `closeOnEscape` | boolean | true | Enable Escape key closing |
| `closeOnOverlayClick` | boolean | true | Enable overlay click closing |
| `showCloseButton` | boolean | true | Show close button (×) in header |
| `className` | string | '' | Additional CSS classes |
| `children` | ReactNode | required | Dialog content |

## Compound Components

### Dialog.Header

Header section with optional close button.

```jsx
<Dialog.Header className="custom-header">
  <Dialog.Title>Dialog Title</Dialog.Title>
</Dialog.Header>
```

### Dialog.Title

Styled h2 element for the dialog title.

```jsx
<Dialog.Title>My Dialog Title</Dialog.Title>
```

### Dialog.Content

Scrollable content area.

```jsx
<Dialog.Content className="custom-content">
  <p>Your content here</p>
</Dialog.Content>
```

### Dialog.Footer

Fixed footer section (doesn't scroll with content).

```jsx
<Dialog.Footer>
  <Dialog.Actions>
    <button>Cancel</button>
    <button>Save</button>
  </Dialog.Actions>
</Dialog.Footer>
```

### Dialog.Actions

Helper component for button layouts in footer. Flexbox row with right alignment.

```jsx
<Dialog.Actions>
  <button>Cancel</button>
  <button className="primary">Save</button>
</Dialog.Actions>
```

## Size Variants

### Small (400px max)
For simple, narrow forms.

```jsx
<Dialog size="small">...</Dialog>
```

### Medium (600px max) - Default
Standard dialog for most forms.

```jsx
<Dialog size="medium">...</Dialog>
```

### Large (1400px max)
For wide forms with multiple columns or galleries.

```jsx
<Dialog size="large">...</Dialog>
```

### Fullscreen (95vw / 95vh)
For full experiences like photo viewers.

```jsx
<Dialog size="fullscreen">...</Dialog>
```

## Examples

### Simple Form Dialog

```jsx
function SourceDialog({ isOpen, onClose, onSave }) {
  const [title, setTitle] = useState('');

  return (
    <Dialog isOpen={isOpen} onClose={onClose} size="medium">
      <Dialog.Header>
        <Dialog.Title>Add Source</Dialog.Title>
      </Dialog.Header>

      <Dialog.Content>
        <div className="form-group">
          <label>Title</label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
          />
        </div>
      </Dialog.Content>

      <Dialog.Footer>
        <Dialog.Actions>
          <button onClick={onClose}>Cancel</button>
          <button onClick={() => onSave(title)} className="primary">
            Save
          </button>
        </Dialog.Actions>
      </Dialog.Footer>
    </Dialog>
  );
}
```

### Custom Close Behavior

Disable overlay click for dialogs that require explicit user action:

```jsx
<Dialog
  isOpen={isOpen}
  onClose={onClose}
  closeOnOverlayClick={false}
>
  {/* content */}
</Dialog>
```

Disable Escape key for confirmation dialogs:

```jsx
<Dialog
  isOpen={isOpen}
  onClose={onClose}
  closeOnEscape={false}
>
  {/* content */}
</Dialog>
```

### Tabs in Header

Since Dialog.Header is flexible, you can add custom content:

```jsx
<Dialog isOpen={isOpen} onClose={onClose} size="medium">
  <Dialog.Header>
    <div>
      <Dialog.Title>Preferences</Dialog.Title>
      <div className="tabs">
        <button className={activeTab === 'appearance' ? 'active' : ''}>
          Appearance
        </button>
        <button className={activeTab === 'settings' ? 'active' : ''}>
          Settings
        </button>
      </div>
    </div>
  </Dialog.Header>

  <Dialog.Content>
    {/* content */}
  </Dialog.Content>

  <Dialog.Footer>
    <Dialog.Actions>
      <button onClick={onClose}>Cancel</button>
      <button onClick={handleSave} className="primary">Save</button>
    </Dialog.Actions>
  </Dialog.Footer>
</Dialog>
```

## Migration Guide

### From Old Pattern to Dialog

**Before:**
```jsx
<div className="dialog-overlay" onClick={onClose}>
  <div className="dialog" onClick={(e) => e.stopPropagation()}>
    <div className="dialog-header">
      <h2>Title</h2>
      <button className="dialog-close" onClick={onClose}>×</button>
    </div>
    <div className="dialog-content">{/* content */}</div>
    <div className="dialog-footer">
      <div className="dialog-actions">
        <button onClick={onClose}>Cancel</button>
        <button onClick={onSave}>Save</button>
      </div>
    </div>
  </div>
</div>
```

**After:**
```jsx
<Dialog isOpen={isOpen} onClose={onClose} size="medium">
  <Dialog.Header>
    <Dialog.Title>Title</Dialog.Title>
  </Dialog.Header>
  <Dialog.Content>{/* content */}</Dialog.Content>
  <Dialog.Footer>
    <Dialog.Actions>
      <button onClick={onClose}>Cancel</button>
      <button onClick={onSave}>Save</button>
    </Dialog.Actions>
  </Dialog.Footer>
</Dialog>
```

**Key changes:**
1. Remove manual Escape key handler (Dialog handles it)
2. Remove overlay/container divs
3. Replace with Dialog compound components
4. Keep custom keyboard shortcuts (e.g., Cmd+Enter) in your component

## Styling

Dialog components use CSS variables for theming:

```css
--color-surface      /* Dialog background */
--color-background   /* Header/footer background */
--color-border       /* Borders */
--color-text         /* Text color */
--color-textMuted    /* Muted text */
```

These are defined in your theme system and automatically applied.

## Accessibility Notes

The Dialog component includes:
- Semantic button with `aria-label="Close dialog"`
- Close button visible and keyboard accessible
- Escape key handling for easy dismissal
- Overlay with backdrop for focus indication

Future enhancements planned:
- Focus trap (prevent tabbing outside dialog)
- ARIA attributes (`role="dialog"`, `aria-modal`, `aria-labelledby`)
- Portal rendering to avoid z-index stacking issues

## Common Patterns

### Form Submission with Keyboard Shortcut

Keep your Cmd+Enter shortcut while using Dialog:

```jsx
function MyDialog({ isOpen, onClose, onSave }) {
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
        e.preventDefault();
        onSave();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onSave]);

  return (
    <Dialog isOpen={isOpen} onClose={onClose} size="medium">
      {/* your form */}
    </Dialog>
  );
}
```

### Confirmation Dialog

```jsx
<Dialog
  isOpen={isOpen}
  onClose={onCancel}
  closeOnEscape={false}
  closeOnOverlayClick={false}
>
  <Dialog.Header>
    <Dialog.Title>Confirm Delete</Dialog.Title>
  </Dialog.Header>

  <Dialog.Content>
    <p>Are you sure? This cannot be undone.</p>
  </Dialog.Content>

  <Dialog.Footer>
    <Dialog.Actions>
      <button onClick={onCancel} className="secondary">Cancel</button>
      <button onClick={onConfirm} className="danger">Delete</button>
    </Dialog.Actions>
  </Dialog.Footer>
</Dialog>
```

## Best Practices

1. **Always provide `onClose`** - This is how the dialog knows to close
2. **Use appropriate size** - Don't use 'large' for simple forms
3. **Keep focus management simple** - Dialog handles overlay focus, you handle form focus
4. **Disable close on critical actions** - Set `closeOnEscape={false}` for irreversible actions
5. **Reuse Dialog.Actions** - It provides consistent button spacing

## Future Enhancements

- Animation/transitions (fade-in, slide-up)
- Focus trap (FocusScope)
- ARIA attributes
- Portal rendering (Teleport to body)
- Stacking/nesting support
- Dialog.Tabs compound component
