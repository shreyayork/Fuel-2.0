# Components, State, Forms & API

## Before Creating New Components

Always:

1. Search for existing equivalent components
2. Reuse existing primitives
3. Extend existing variants if possible
4. Create new shared components only when necessary

## Component Design

- Keep components focused and modular
- Avoid massive monolithic files
- Extract repeated UI patterns
- Prefer composition over duplication

## Accessibility

- Preserve keyboard navigation
- Add proper labels/aria attributes
- Maintain semantic HTML
- Ensure focus states remain visible

## State Management

- Prefer local state when possible
- Avoid prop drilling where existing patterns solve it
- Follow current app state management conventions
- Avoid unnecessary global state

## Forms

- Reuse existing form primitives
- Reuse validation patterns
- Maintain consistent error handling UX
- Preserve accessibility

## API & Backend Integration

- Follow existing API service structure
- Reuse fetch wrappers/helpers
- Keep API logic outside UI components
- Handle loading/error/empty states consistently

## Code Quality

- Avoid dead code
- Avoid duplicated logic
- Keep files clean and readable
- Prefer clarity over clever abstractions
- Add comments only when genuinely helpful
- Keep functions small and focused
