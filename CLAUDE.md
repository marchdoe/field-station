# CLAUDE.md

## Pre-PR Gate (MANDATORY)

Before creating any PR or pushing code, run ALL of these checks locally and confirm they pass:

```bash
npm run typecheck    # TypeScript type checking (tsc --noEmit)
npm run check        # Biome lint + format (zero errors AND zero warnings)
npm test             # Vitest test suite (all tests must pass)
```

Do NOT push if any of these fail. Fix issues locally first.

## Tooling

- **Formatter/Linter:** Biome (NOT Prettier). Use `npx biome format --write src/` to auto-fix formatting.
- **Tests:** Vitest. Run `npm test` or `npx vitest run`.
- **CI pipeline runs:** typecheck → check → test → build. Match this locally.

## Code Conventions

- All `<button>` elements must have an explicit `type` attribute (`type="button"` for non-submit buttons)
- Avoid non-null assertions (`!`). Use type narrowing (if/else guards) instead.
- Server functions that accept filesystem paths must validate them with `assertSafePath()` or `projectPathSchema`
