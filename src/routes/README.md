# Routes

TanStack Start uses **file-based routing**. Every `.tsx` file in this directory
is a route. Do **not** create `src/pages/`, `src/routes/_app/index.tsx`, or
`app/layout.tsx` — those are Next.js / Remix conventions. The only root layout
is `src/routes/__root.tsx`.

## Conventions

| File | URL |
| --- | --- |
| `index.tsx` | `/` |
| `about.tsx` | `/about` |
| `users/index.tsx` | `/users` |
| `users/$id.tsx` | `/users/:id` (dynamic — bare `$`, no curly braces) |
| `posts/{-$category}.tsx` | `/posts/:category?` (optional segment) |
| `files/$.tsx` | `/files/*` (splat — read via `_splat` param, never `*`) |
| `_layout.tsx` | layout route (renders children via `<Outlet />`) |
| `__root.tsx` | app shell — wraps every page; preserve `<Outlet />` |

`routeTree.gen.ts` is auto-generated. Don't edit it by hand.


# Routes

TanStack Start utilise le **routage par fichiers**. Chaque fichier `.tsx` de ce répertoire
est une route. **Ne** créez **pas** de fichiers `src/pages/`, `src/routes/_app/index.tsx`, ni
`app/layout.tsx` — ce sont des conventions Next.js / Remix. La seule mise en page racine
est `src/routes/__root.tsx`.

## Conventions

| Fichier | URL |
| --- | --- |
| `index.tsx` | `/` |
| `about.tsx` | `/about` |
| `users/index.tsx` | `/users` |
| `users/$id.tsx` | `/users/:id` (dynamique — `$` seul, sans accolades) 
| `posts/{-$category}.tsx` | `/posts/:category?` (segment optionnel) |
| `files/$.tsx` | `/files/*` (splat — lu via le paramètre `_splat`, jamais `*`) |
| `_layout.tsx` | route de mise en page (rend les enfants via `<Outlet />`) |
| `__root.tsx` | interface de l'application — englobe chaque page ; conserve `<Outlet />` |

`routeTree.gen.ts` est généré automatiquement. Ne le modifiez pas manuellement.
