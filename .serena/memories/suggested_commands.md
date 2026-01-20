# Suggested Commands

## Development
```bash
npm run dev          # Start dev server on :3000 (uses Turbopack)
npm run build        # Production build
npm start            # Start production server
npm run lint         # Run ESLint
```

## Testing
```bash
npm run test              # Run Vitest unit tests
npm run test:watch        # Watch mode
npm run test:ui           # Vitest UI
npm run test:coverage     # Coverage report
npm run test:e2e          # Run Playwright E2E tests
npm run test:e2e:ui       # Playwright with UI
```

## Database Migrations
```bash
npm run migrate:schema    # Run schema migration
npm run migrate:verify    # Verify migration
npm run migrate:dry-run   # Dry run migration
```

## Git & Deployment
```bash
git add -A && git commit -m "message" && git push
# Railway auto-deploys from main branch
```

## Utility Commands (Darwin/macOS)
```bash
ls -la                    # List files
cd <dir>                  # Change directory
grep -r "pattern" .       # Search files
find . -name "*.ts"       # Find files
cat <file>                # View file content
```
