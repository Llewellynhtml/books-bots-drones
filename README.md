# Books Bots Drones Backend

Firebase Functions backend scaffold using TypeScript, Express, and Firebase Admin.

## Structure

- `functions/src/index.ts` configures the Express API and exports the Firebase HTTPS function.
- `functions/src/config/firebase.ts` initializes Firebase Admin services.
- `functions/src/controllers`, `routes`, `services`, `middleware`, `types`, and `utils` are ready for feature code.

## Commands

```bash
npm --prefix functions run build
npm --prefix functions run dev
```

The current API exposes `GET /health`.
