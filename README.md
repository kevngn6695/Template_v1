# Template_v1

This is a full stack practice

---

## Quick start

```bash
npm run setup     # installs both workspaces, starts Postgres, applies migrations
cp server/.env.example server/.env
npm run dev       # boots API + client together
```

- Client → http://localhost:5000
- API → http://localhost:3000/api/health
  `Ctrl-C` kills both processes.

**Requirements:** Node 22+, Docker.

---
