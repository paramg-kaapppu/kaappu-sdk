# @kaappu/react

> Drop-in React components for [Kaappu Identity](https://kaappu.org) — authentication, authorization, and AI-aware access control.

[![npm version](https://img.shields.io/npm/v/@kaappu/react.svg?style=flat-square)](https://www.npmjs.com/package/@kaappu/react)
[![license](https://img.shields.io/npm/l/@kaappu/react.svg?style=flat-square)](./LICENSE)

## What's in the box

- **`<KaappuProvider />`** — wraps your app, manages session state, handles silent token refresh
- **`<LoginPanel />`** — full sign-in UI: OAuth (Google / GitHub / Microsoft / Apple), passkey, email + password, magic link, OTP, phone
- **`<RegisterPanel />`** — full sign-up UI: OAuth providers, password rules, confirm password, friendly error messages, optional email verification
- **`<Authorize />`** — conditionally render based on permission or role
- **`<LoggedIn />` / `<LoggedOut />`** — conditional render based on session state
- **`<ProfileBadge />`** — user avatar with sign-out menu
- **`<AccountView />`** — drop-in account settings page
- **`useKaappu()`** — hook returning `{ isLoaded, isSignedIn, user, hasPermission, signOut, getToken, ... }`

All components are theme-aware, accessible, and work with both light and dark color schemes out of the box.

## Install

```bash
npm install @kaappu/react
# or
pnpm add @kaappu/react
# or
yarn add @kaappu/react
```

Peer dependencies: `react >= 18`, `react-dom >= 18`.

## Quick start

```jsx
import { KaappuProvider, LoginPanel, LoggedIn, LoggedOut, useKaappu } from '@kaappu/react'

// 1. Wrap your app
function App() {
  return (
    <KaappuProvider
      publishableKey="pk_live_..."
      baseUrl="https://id.your-domain.com/igai"
    >
      <YourApp />
    </KaappuProvider>
  )
}

// 2. Use the components anywhere
function Header() {
  const { user, signOut } = useKaappu()
  return (
    <header>
      <LoggedOut>
        <a href="/sign-in">Sign in</a>
      </LoggedOut>
      <LoggedIn>
        <span>Hi, {user?.email}</span>
        <button onClick={signOut}>Sign out</button>
      </LoggedIn>
    </header>
  )
}

// 3. Drop the auth panels onto a page
function SignInPage() {
  return <LoginPanel onSuccess={(token, user) => window.location.href = '/'} />
}
```

## Authorization

```jsx
import { Authorize } from '@kaappu/react'

// Permission-gated content
<Authorize
  permission="billing:manage"
  fallback={<p>Upgrade to access billing.</p>}
>
  <BillingPanel />
</Authorize>

// Role-gated content
<Authorize role="admin">
  <AdminTools />
</Authorize>

// Wildcard permission "*" grants access to everything (built-in admin shortcut)
```

## Standalone mode (no provider)

If you don't want to wrap your app in `<KaappuProvider>`, you can use `<LoginPanel />` and `<RegisterPanel />` as standalone components:

```jsx
<LoginPanel
  authUrl="https://id.your-domain.com/api/auth"
  accountId="your-tenant-id"
  onSuccess={(token, user) => { /* persist token, redirect */ }}
/>
```

## Theming

Pass an `appearance` prop to any component to override colors and typography:

```jsx
import { LoginPanel, createTheme } from '@kaappu/react'

const theme = createTheme({
  colorScheme: 'light',
  variables: {
    primaryColor: '#0ea5e9',
    borderRadius: '0.5rem',
    fontFamily: 'Inter, system-ui, sans-serif',
  },
})

<LoginPanel appearance={theme} />
```

Themes use CSS custom properties under the hood (`--k-primary`, `--k-card-bg`, `--k-text`, etc.) so you can also override them directly with stylesheets.

## What this SDK is for

`@kaappu/react` is the React client for the Kaappu Identity platform — a closed-loop security control plane for AI-era applications. The SDK lets you drop production-grade authentication, authorization, and identity management into a React app in minutes, with the same primitives Kaappu uses on its own website (kaappu.org).

Learn more at [kaappu.org](https://kaappu.org) — including the Security Control Loop white paper and customer case studies.

## License

[MIT](./LICENSE) © Kaappu
