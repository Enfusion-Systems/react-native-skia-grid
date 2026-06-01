# Contributing

Thank you for your interest in contributing to react-native-skia-grid.

## Development Setup

```bash
# Clone the repository
git clone <repo-url>
cd react-native-skia-grid

# Install dependencies
yarn install

# Run type checking
yarn typecheck

# Run tests
yarn test

# Build the package
yarn build
```

## Architecture

- **Core**: Pure TypeScript orchestration, managers, and pipeline functions
- **View**: React hooks and context bindings
- **Renderer**: Skia canvas drawing and gesture handling
- **Themes**: Token-based theming with cascading defaults

## Pull Request Guidelines

1. **Branch from `dev`** and target `dev` with your PR
2. **Run `yarn typecheck` and `yarn test`** before submitting
3. **Follow conventional commits**: `feat:`, `fix:`, `refactor:`, `docs:`, `test:`
4. **Keep PRs focused** on a single change
5. **Add tests** for new functionality

## Code Style

- TypeScript strict mode
- 2-space indentation, double quotes
- Functional components with `function` keyword
- `useRefCallback` over `useCallback`
- No `console.log`, `debugger`, or TODO comments in final code

## Commit Messages

Follow [Conventional Commits](https://www.conventionalcommits.org/):

```
feat: add column auto-sizing
fix: prevent scroll overshoot on Android
refactor: extract filter pipeline to pure function
```
