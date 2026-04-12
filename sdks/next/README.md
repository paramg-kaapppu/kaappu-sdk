# @kaappu/next

Next.js middleware and server-side helpers for [Kaappu Identity](https://kaappu.org). Validates JWTs at the edge, injects auth context into headers, and provides server-component utilities.

## Install

```bash
npm install @kaappu/next
```

## Middleware (Edge)

Create `middleware.ts` at your project root:

```ts
import { kaappuPipeline } from '@kaappu/next'

export default kaappuPipeline({
  jwksUrl: 'https://your-kaappu-instance/api/v1/idm/auth/jwks',
  publicPaths: ['/sign-in', '/sign-up', '/api/public/**'],
})

export const config = { matcher: ['/((?!_next|favicon.ico).*)'] }
```

The pipeline validates the JWT on every request, then forwards the authenticated user's identity as request headers so downstream server components and API routes can read it without re-parsing the token.

## Route Handler Wrapper

```ts
import { withAuth } from '@kaappu/next'

export const GET = withAuth(async (req, ctx) => {
  // ctx.userId, ctx.accountId, ctx.email, ctx.permissions
  return Response.json({ userId: ctx.userId })
})
```

## Server Components

```ts
import { authorize } from '@kaappu/next/server'

export default async function DashboardPage() {
  const { auth } = authorize()
  if (!auth) return <p>Not signed in</p>
  return <p>Hello {auth.email}</p>
}
```

Use `.required()` to throw a 401 if the user is not authenticated:

```ts
const ctx = authorize().required()
```

## Fetch Full User

```ts
import { currentAuthorizedUser } from '@kaappu/next/server'

const user = await currentAuthorizedUser()
```

## Requirements

- Next.js 14+
- A running Kaappu Identity backend with a JWKS endpoint

## License

MIT
