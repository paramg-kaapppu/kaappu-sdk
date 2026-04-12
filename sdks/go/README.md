# kaappu-sdk/sdks/go

Go middleware for [Kaappu Identity](https://kaappu.org). Provides JWT authentication and permission-based authorization for any `net/http` service.

## Install

```bash
go get github.com/paramg-kaapppu/kaappu-sdk/sdks/go
```

## Quick Start

```go
package main

import (
    "net/http"

    kaappu "github.com/paramg-kaapppu/kaappu-sdk/sdks/go"
)

func main() {
    mw := kaappu.NewMiddleware(kaappu.Config{
        JwksURL:     "https://your-kaappu-instance/api/v1/idm/auth/jwks",
        PublicPaths: []string{"/health", "/api/v1/public/**"},
    })

    mux := http.NewServeMux()
    mux.HandleFunc("/api/users", func(w http.ResponseWriter, r *http.Request) {
        ctx := kaappu.GetSecurityContext(r.Context())
        w.Write([]byte("Hello " + ctx.Email))
    })

    http.ListenAndServe(":8080", mw.Wrap(mux))
}
```

## Permission Checks

```go
// Guard a route with a required permission
http.Handle("/api/admin", kaappu.RequirePermission("admin:access", adminHandler))

// Check permissions programmatically
sc := kaappu.GetSecurityContext(r.Context())
if kaappu.CheckPermission(sc.Permissions, "users:delete") {
    // allowed
}

// Check multiple permissions
kaappu.CheckAllPermissions(sc.Permissions, []string{"users:read", "roles:read"})
kaappu.CheckAnyPermission(sc.Permissions, []string{"users:delete", "users:*"})
```

Wildcard support:
- `*` -- super wildcard, matches any permission
- `resource:*` -- matches any action on that resource (e.g. `users:*` matches `users:read`, `users:delete`)

## API

| Function | Description |
|----------|-------------|
| `NewMiddleware(Config)` | Create middleware with JWKS URL and public paths |
| `Middleware.Wrap(http.Handler)` | Wrap a handler with JWT validation |
| `RequirePermission(perm, handler)` | Middleware that enforces a specific permission |
| `GetSecurityContext(ctx)` | Retrieve the authenticated user from request context |
| `CheckPermission(perms, required)` | Check a single permission with wildcard support |
| `CheckAllPermissions(perms, required)` | Check that ALL permissions are satisfied |
| `CheckAnyPermission(perms, required)` | Check that ANY permission is satisfied |

## SecurityContext

```go
type SecurityContext struct {
    UserID      string
    AccountID   string
    Email       string
    SessionID   string
    Permissions []string
}
```

## License

MIT
