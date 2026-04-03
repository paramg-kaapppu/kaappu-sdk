package kaappu

import "testing"

func TestCheckPermission(t *testing.T) {
	tests := []struct {
		name     string
		perms    []string
		required string
		want     bool
	}{
		{"exact match", []string{"users:read"}, "users:read", true},
		{"no match", []string{"users:read"}, "users:delete", false},
		{"super wildcard", []string{"*"}, "anything:here", true},
		{"resource wildcard", []string{"users:*"}, "users:delete", true},
		{"resource wildcard no cross", []string{"users:*"}, "roles:read", false},
		{"empty perms", []string{}, "users:read", false},
		{"empty required", []string{"users:read"}, "", true},
		{"owner role", []string{"*"}, "gateway_instances:manage", true},
		{"admin role", []string{"gateway:*", "users:*"}, "gateway:view", true},
		{"viewer denied write", []string{"users:read", "roles:read"}, "users:delete", false},
		{"member can chat", []string{"governance_chat:use", "users:read"}, "governance_chat:use", true},
		{"member denied manage", []string{"gateway_instances:read"}, "gateway_instances:manage", false},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			if got := CheckPermission(tt.perms, tt.required); got != tt.want {
				t.Errorf("CheckPermission(%v, %q) = %v, want %v", tt.perms, tt.required, got, tt.want)
			}
		})
	}
}

func TestCheckAllPermissions(t *testing.T) {
	perms := []string{"users:read", "roles:read", "groups:read"}
	if !CheckAllPermissions(perms, []string{"users:read", "roles:read"}) {
		t.Error("expected true for all present")
	}
	if CheckAllPermissions(perms, []string{"users:read", "users:delete"}) {
		t.Error("expected false when one missing")
	}
}

func TestCheckAnyPermission(t *testing.T) {
	perms := []string{"users:read"}
	if !CheckAnyPermission(perms, []string{"users:delete", "users:read"}) {
		t.Error("expected true when one matches")
	}
	if CheckAnyPermission(perms, []string{"roles:read", "groups:read"}) {
		t.Error("expected false when none match")
	}
}
