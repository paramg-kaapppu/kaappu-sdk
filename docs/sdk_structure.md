kaappu-sdk/                                                                                                                                                                                                       
packages/                                                                                                                                                                                                       
core/        @kaappu/core     — Framework-agnostic: types, tokens, permissions, API client, storage                                                                                                           
react/       @kaappu/react    — React hooks, components (KaappuProvider, LoginPanel, Authorize, etc.)                                                                                                         
next/        @kaappu/next     — Next.js middleware, withAuth, server helpers                                                                                                                                  
angular/     @kaappu/angular  — Future: Angular services, guards, interceptors                                                                                                                                
vue/         @kaappu/vue      — Future: Vue composables, components

What @kaappu/core provides (usable by ANY framework):

┌─────────────┬──────────────────────────────────────────────────────────────────────────────────┐                                                                                                                
│   Module    │                                     Exports                                      │                                                                                                              
├─────────────┼──────────────────────────────────────────────────────────────────────────────────┤                                                                                                                
│ types       │ KaappuUser, KaappuTenantConfig, KaappuSession, AuthResponse                      │                                                                                                              
├─────────────┼──────────────────────────────────────────────────────────────────────────────────┤
│ token       │ parseJwtPayload, isTokenExpired, getTokenExpiryMs, extractUserFromToken          │                                                                                                                
├─────────────┼──────────────────────────────────────────────────────────────────────────────────┤
│ permissions │ checkPermission, checkAllPermissions, checkAnyPermission, isPermission           │                                                                                                                
├─────────────┼──────────────────────────────────────────────────────────────────────────────────┤                                                                                                                
│ api-client  │ KaappuApiClient — signIn, signUp, signOut, refreshToken, getMe, verifyMfa, OAuth │
├─────────────┼──────────────────────────────────────────────────────────────────────────────────┤                                                                                                                
│ storage     │ TokenStorage interface, BrowserTokenStorage, MemoryTokenStorage                  │                                                                                                              
└─────────────┴────────────────────────────────────────────────────────────────




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