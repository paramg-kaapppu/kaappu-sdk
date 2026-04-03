Clerk's SDK Architecture

┌────────────┬──────────────────────────────────────────────────┬────────────────────────────────┐
│   Layer    │                    Clerk SDKs                    │    Our Current (kaappu-sdk)    │
├────────────┼──────────────────────────────────────────────────┼────────────────────────────────┤
│ Core JS    │ @clerk/clerk-js — vanilla JS, framework-agnostic │ Missing                        │
├────────────┼──────────────────────────────────────────────────┼────────────────────────────────┤
│ React      │ @clerk/clerk-react                               │ @kaappu/react                  │
├────────────┼──────────────────────────────────────────────────┼────────────────────────────────┤
│ Next.js    │ @clerk/nextjs                                    │ @kaappu/next                   │
├────────────┼──────────────────────────────────────────────────┼────────────────────────────────┤
│ Vue        │ @clerk/vue                                       │ Missing                        │
├────────────┼──────────────────────────────────────────────────┼────────────────────────────────┤
│ Angular    │ Community: ngx-clerk                             │ Missing                        │
├────────────┼──────────────────────────────────────────────────┼────────────────────────────────┤
│ Vanilla JS │ @clerk/clerk-js                                  │ Missing                        │
├────────────┼──────────────────────────────────────────────────┼────────────────────────────────┤
│ Node.js    │ @clerk/backend                                   │ Missing                        │
├────────────┼──────────────────────────────────────────────────┼────────────────────────────────┤
│ Go         │ clerk-sdk-go                                     │ Missing (future kaappu-go-sdk) │
├────────────┼──────────────────────────────────────────────────┼────────────────────────────────┤
│ Java       │ clerk-sdk-java                                   │ kaappu-java-sdk                │
├────────────┼──────────────────────────────────────────────────┼────────────────────────────────┤
│ Python     │ clerk-backend-api                                │ Missing                        │
└────────────┴──────────────────────────────────────────────────┴────────────────────────────────┘

Recommendation

The current @kaappu/react can't work with Angular — it uses React hooks, JSX, and React Context. For Angular you'd need a separate @kaappu/angular package.

The right architecture is:

@kaappu/core          ← Framework-agnostic JS: token management, API client, permission checking
├── @kaappu/react   ← React hooks + components (uses @kaappu/core)
├── @kaappu/next    ← Next.js middleware + server helpers (uses @kaappu/core)
├── @kaappu/vue     ← Vue composables + components (future)
├── @kaappu/angular ← Angular services + guards (future)
└── @kaappu/js      ← Vanilla JS drop-in (future)