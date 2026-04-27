# AltPadi Extension

A Chrome Manifest V3 extension for finding cheaper Jumia alternatives in Nigeria.

## Development

```bash
npm install
npm test
npm run typecheck
npm run build
```

Load `dist` in Chrome with **Extensions > Developer mode > Load unpacked**.

## Design Notes

- No backend, accounts, analytics, or remote code.
- Network activity starts only after the user clicks **Find cheaper alternatives**.
- Core matching logic is pure TypeScript and covered by unit/integration tests.
- Jumia Nigeria parsing is isolated behind a marketplace adapter for future country support.
