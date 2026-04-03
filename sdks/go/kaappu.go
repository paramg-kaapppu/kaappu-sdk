// Package kaappu provides JWT authentication and permission-based authorization
// for Go services. Designed for the Kaappu AI Gateway (KGF) and any Go HTTP service.
//
// Usage:
//
//	middleware := kaappu.NewMiddleware(kaappu.Config{
//	    JwksURL:     "http://localhost:9091/api/v1/idm/auth/jwks",
//	    PublicPaths: []string{"/health", "/api/v1/public/**"},
//	})
//	http.Handle("/", middleware.Wrap(yourHandler))
//
//	// Or use the permission checker directly:
//	kaappu.RequirePermission("gateway:view", handler)
package kaappu

import "time"

// Config holds the SDK configuration.
type Config struct {
	// JwksURL is the URL to fetch the JWKS key set for JWT verification.
	JwksURL string

	// PublicPaths are URL patterns that skip JWT validation (supports ** glob).
	PublicPaths []string

	// JwksCacheTTL is how long to cache the JWKS key set. Default: 10 minutes.
	JwksCacheTTL time.Duration
}

// SecurityContext holds the authenticated user's identity and permissions,
// extracted from the JWT token.
type SecurityContext struct {
	UserID      string
	AccountID   string
	Email       string
	SessionID   string
	Permissions []string
}
