package kaappu

import "strings"

// CheckPermission verifies if the user's permissions satisfy the required permission.
// Supports exact match, super wildcard (*), and resource wildcard (resource:*).
func CheckPermission(userPermissions []string, required string) bool {
	if required == "" {
		return true
	}
	parts := strings.SplitN(required, ":", 2)
	resource := parts[0]

	for _, p := range userPermissions {
		if p == "*" || p == required || p == resource+":*" {
			return true
		}
	}
	return false
}

// CheckAllPermissions verifies the user has ALL required permissions.
func CheckAllPermissions(userPermissions []string, required []string) bool {
	for _, r := range required {
		if !CheckPermission(userPermissions, r) {
			return false
		}
	}
	return true
}

// CheckAnyPermission verifies the user has ANY of the required permissions.
func CheckAnyPermission(userPermissions []string, required []string) bool {
	for _, r := range required {
		if CheckPermission(userPermissions, r) {
			return true
		}
	}
	return false
}
