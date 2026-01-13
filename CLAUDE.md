# Working with Claude Code on Heritage

## Problem-Solving Lessons

### Box-Shadow Debugging (Jan 2026)
When debugging CSS issues like shadows on elements:
1. **Check the element itself first** - Don't assume shadows are inherited or from parent elements
2. **Be direct** - If you're uncertain about what element has the shadow, ask the user to clarify instead of guessing
3. **Avoid circular searches** - Don't grep through multiple files and selectors hoping to find the issue
4. **Search the specific component's CSS** - Check the component's own CSS file before searching globally

**Example:** Spent too long searching for PersonPicker shadows in index.css when the fix was simply adding `box-shadow: none;` directly to `.person-picker` in PersonPicker.css.

### Key Debugging Pattern
For styling issues:
1. Identify the exact element with the problem (ask if unclear)
2. Find that element's CSS class
3. Add an explicit override in that component's CSS file
4. Don't assume you need to find the source - just override it locally if needed

## Component Architecture

### Dialog Component
- Compound component pattern with Header, Title, Content, Footer, Actions
- Supports sizes: small (400px), medium (600px), large (1400px), fullscreen (95vw/95vh)
- Automatic close handling: Escape key, overlay click, close button
- All close mechanisms can be toggled with props

### PersonPicker Component
- Searchable dropdown for selecting people
- Used in Add Child, Add Parent dialogs
- Should have no box-shadow styling to remain clean in dialogs
