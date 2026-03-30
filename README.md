# Kaappu SDK

Embed Kaappu Identity into any React + Next.js application.

## Packages

| Package | Description |
|---------|-------------|
| `@kaappu/react` | React components: `<KaappuProvider>`, `<LoginPanel>`, `<RegisterPanel>`, `useKaappu()` |
| `@kaappu/next` | Next.js helpers: `kaappuPipeline()`, `authorize()`, `currentAuthorizedUser()`, `withAuth()` |

## Quick Start

### 1. Install

```bash
npm install @kaappu/react @kaappu/next
```

### 2. Wrap your app

```tsx
// app/layout.tsx
import { KaappuProvider } from '@kaappu/react'

export default function RootLayout({ children }) {
  return (
    <html>
      <body>
        <KaappuProvider
          publishableKey={process.env.NEXT_PUBLIC_KAAPPU_PK}
          baseUrl={process.env.NEXT_PUBLIC_KAAPPU_BASE_URL}
        >
          {children}
        </KaappuProvider>
      </body>
    </html>
  )
}
```

### 3. Add the pipeline (middleware.ts)

```ts
// middleware.ts
import { kaappuPipeline } from '@kaappu/next'

export default kaappuPipeline({
  publishableKey: process.env.NEXT_PUBLIC_KAAPPU_PK,
  baseUrl: process.env.KAAPPU_BASE_URL,
  publicRoutes: ['/sign-in', '/sign-up'],
})

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
}
```

### 4. Add sign-in page

```tsx
// app/sign-in/page.tsx
import { LoginPanel } from '@kaappu/react'

export default function SignInPage() {
  return (
    <div style={{ display: 'flex', justifyContent: 'center', padding: '4rem 1rem' }}>
      <LoginPanel redirectUrl="/dashboard" />
    </div>
  )
}
```

### 5. Protect API routes

```ts
// app/api/data/route.ts
import { withAuth } from '@kaappu/next'
import { NextResponse } from 'next/server'

export const GET = withAuth(async (req, { auth }) => {
  return NextResponse.json({ message: `Hello ${auth.email}` })
})
```

### 6. Server Components

```tsx
import { authorize, currentAuthorizedUser } from '@kaappu/next/server'

export default async function ProfilePage() {
  const { auth } = authorize()
  if (!auth) return <div>Not signed in</div>

  const user = await currentAuthorizedUser()
  return <div>Welcome, {user?.firstName}!</div>
}
```

## Environment Variables

```env
NEXT_PUBLIC_KAAPPU_PK=pk_live_xxx
NEXT_PUBLIC_KAAPPU_BASE_URL=http://localhost:9091
KAAPPU_BASE_URL=http://localhost:9091
```

## Theming

```tsx
<LoginPanel
  appearance={{
    variables: {
      primaryColor: '#6366f1',
      borderRadius: '0.5rem',
      backgroundColor: '#000000',
    }
  }}
/>
```
