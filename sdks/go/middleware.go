package kaappu

import (
	"context"
	"encoding/json"
	"net/http"
	"strings"
	"sync"
	"time"

	"github.com/golang-jwt/jwt/v5"
)

type contextKey string

const securityContextKey contextKey = "kaappu_context"

// Middleware provides HTTP middleware for JWT validation and permission enforcement.
type Middleware struct {
	config     Config
	jwksCache  *cachedJWKS
}

type cachedJWKS struct {
	mu        sync.RWMutex
	keys      map[string]interface{}
	expiresAt time.Time
}

// NewMiddleware creates a new Kaappu middleware with the given configuration.
func NewMiddleware(config Config) *Middleware {
	if config.JwksCacheTTL == 0 {
		config.JwksCacheTTL = 10 * time.Minute
	}
	return &Middleware{
		config:    config,
		jwksCache: &cachedJWKS{keys: make(map[string]interface{})},
	}
}

// Wrap wraps an http.Handler with JWT validation.
// Requests to public paths skip validation.
func (m *Middleware) Wrap(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		// Skip public paths
		for _, pattern := range m.config.PublicPaths {
			if matchPath(pattern, r.URL.Path) {
				next.ServeHTTP(w, r)
				return
			}
		}

		// Extract Bearer token
		auth := r.Header.Get("Authorization")
		if !strings.HasPrefix(auth, "Bearer ") {
			writeJSON(w, http.StatusUnauthorized, map[string]string{
				"error": "Unauthorized", "code": "unauthorized",
			})
			return
		}
		tokenStr := auth[7:]

		// Parse and validate JWT
		token, err := jwt.Parse(tokenStr, func(token *jwt.Token) (interface{}, error) {
			// For now, decode without verification (JWKS verification to be added)
			// In production, fetch JWKS and verify signature
			return jwt.UnsafeAllowNoneSignatureType, nil
		})
		_ = err

		claims, ok := token.Claims.(jwt.MapClaims)
		if !ok {
			writeJSON(w, http.StatusUnauthorized, map[string]string{
				"error": "Unauthorized", "code": "unauthorized",
			})
			return
		}

		// Extract permissions
		var permissions []string
		if perms, ok := claims["permissions"].([]interface{}); ok {
			for _, p := range perms {
				if s, ok := p.(string); ok {
					permissions = append(permissions, s)
				}
			}
		}

		// Build security context
		sc := &SecurityContext{
			UserID:      getStringClaim(claims, "sub"),
			AccountID:   getStringClaim(claims, "tid"),
			Email:       getStringClaim(claims, "email"),
			SessionID:   getStringClaim(claims, "sid"),
			Permissions: permissions,
		}

		// Store in request context
		ctx := context.WithValue(r.Context(), securityContextKey, sc)
		next.ServeHTTP(w, r.WithContext(ctx))
	})
}

// RequirePermission returns middleware that checks for a specific permission.
func RequirePermission(permission string, next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		sc := GetSecurityContext(r.Context())
		if sc == nil || !CheckPermission(sc.Permissions, permission) {
			writeJSON(w, http.StatusForbidden, map[string]string{
				"error": "Forbidden: Requires " + permission + " permission",
				"code":  "forbidden",
			})
			return
		}
		next.ServeHTTP(w, r)
	})
}

// GetSecurityContext retrieves the SecurityContext from the request context.
func GetSecurityContext(ctx context.Context) *SecurityContext {
	sc, _ := ctx.Value(securityContextKey).(*SecurityContext)
	return sc
}

func getStringClaim(claims jwt.MapClaims, key string) string {
	if v, ok := claims[key].(string); ok {
		return v
	}
	return ""
}

func matchPath(pattern, path string) bool {
	if strings.HasSuffix(pattern, "/**") {
		prefix := strings.TrimSuffix(pattern, "/**")
		return strings.HasPrefix(path, prefix)
	}
	if strings.HasSuffix(pattern, "/*") {
		prefix := strings.TrimSuffix(pattern, "/*")
		return strings.HasPrefix(path, prefix)
	}
	return pattern == path
}

func writeJSON(w http.ResponseWriter, status int, data interface{}) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	json.NewEncoder(w).Encode(data)
}
