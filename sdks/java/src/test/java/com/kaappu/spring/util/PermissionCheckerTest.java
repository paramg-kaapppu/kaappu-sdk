package com.kaappu.spring.util;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;

import java.util.Arrays;
import java.util.Collections;
import java.util.List;

import static org.junit.jupiter.api.Assertions.*;

class PermissionCheckerTest {

    // --- Basic matching scenarios ---

    @Test
    @DisplayName("Exact match returns true")
    void exactMatch() {
        assertTrue(PermissionChecker.check(List.of("users:read"), "users:read"));
    }

    @Test
    @DisplayName("Super wildcard '*' matches any permission")
    void superWildcard() {
        List<String> perms = List.of("*");
        assertTrue(PermissionChecker.check(perms, "users:read"));
        assertTrue(PermissionChecker.check(perms, "roles:delete"));
        assertTrue(PermissionChecker.check(perms, "anything:whatever"));
    }

    @Test
    @DisplayName("Resource wildcard 'users:*' matches any action on users")
    void resourceWildcardMatchesSameResource() {
        List<String> perms = List.of("users:*");
        assertTrue(PermissionChecker.check(perms, "users:read"));
        assertTrue(PermissionChecker.check(perms, "users:delete"));
        assertTrue(PermissionChecker.check(perms, "users:create"));
    }

    @Test
    @DisplayName("Resource wildcard 'users:*' does not match different resource")
    void resourceWildcardDoesNotMatchDifferentResource() {
        assertFalse(PermissionChecker.check(List.of("users:*"), "roles:read"));
    }

    @Test
    @DisplayName("No match returns false")
    void noMatch() {
        assertFalse(PermissionChecker.check(List.of("roles:read"), "users:read"));
    }

    @Test
    @DisplayName("Empty permissions list returns false")
    void emptyPermissions() {
        assertFalse(PermissionChecker.check(Collections.emptyList(), "users:read"));
    }

    @Test
    @DisplayName("Null permissions returns false")
    void nullPermissions() {
        assertFalse(PermissionChecker.check(null, "users:read"));
    }

    @Test
    @DisplayName("Null required permission returns false")
    void nullRequired() {
        assertFalse(PermissionChecker.check(List.of("users:read"), null));
    }

    @Test
    @DisplayName("Multiple permissions - match found in list")
    void multiplePermissionsMatch() {
        assertTrue(PermissionChecker.check(List.of("roles:read", "users:read"), "users:read"));
    }

    @Test
    @DisplayName("Admin wildcards match module actions")
    void adminWildcardsMatchModuleActions() {
        List<String> adminPerms = List.of("users:*", "roles:*", "groups:*");
        assertTrue(PermissionChecker.check(adminPerms, "groups:delete"));
        assertTrue(PermissionChecker.check(adminPerms, "users:create"));
        assertTrue(PermissionChecker.check(adminPerms, "roles:read"));
    }

    // --- Role-based scenarios ---

    @Nested
    @DisplayName("Owner role with [\"*\"]")
    class OwnerRole {
        private final List<String> perms = List.of("*");

        @Test void canReadUsers()    { assertTrue(PermissionChecker.check(perms, "users:read")); }
        @Test void canDeleteUsers()  { assertTrue(PermissionChecker.check(perms, "users:delete")); }
        @Test void canReadRoles()    { assertTrue(PermissionChecker.check(perms, "roles:read")); }
        @Test void canDeleteGroups() { assertTrue(PermissionChecker.check(perms, "groups:delete")); }
        @Test void canChat()         { assertTrue(PermissionChecker.check(perms, "chat:interact")); }
    }

    @Nested
    @DisplayName("Admin role with module wildcards")
    class AdminRole {
        private final List<String> perms = List.of("users:*", "roles:*", "groups:*", "chat:*");

        @Test void canReadUsers()    { assertTrue(PermissionChecker.check(perms, "users:read")); }
        @Test void canCreateUsers()  { assertTrue(PermissionChecker.check(perms, "users:create")); }
        @Test void canDeleteRoles()  { assertTrue(PermissionChecker.check(perms, "roles:delete")); }
        @Test void canDeleteGroups() { assertTrue(PermissionChecker.check(perms, "groups:delete")); }
        @Test void canChat()         { assertTrue(PermissionChecker.check(perms, "chat:interact")); }
    }

    @Nested
    @DisplayName("Viewer role with read-only permissions")
    class ViewerRole {
        private final List<String> perms = List.of("users:read", "roles:read", "groups:read");

        @Test void canReadUsers()      { assertTrue(PermissionChecker.check(perms, "users:read")); }
        @Test void canReadRoles()      { assertTrue(PermissionChecker.check(perms, "roles:read")); }
        @Test void canReadGroups()     { assertTrue(PermissionChecker.check(perms, "groups:read")); }
        @Test void cannotCreateUsers() { assertFalse(PermissionChecker.check(perms, "users:create")); }
        @Test void cannotDeleteUsers() { assertFalse(PermissionChecker.check(perms, "users:delete")); }
        @Test void cannotChat()        { assertFalse(PermissionChecker.check(perms, "chat:interact")); }
    }

    @Nested
    @DisplayName("Member role with read + interactive permissions")
    class MemberRole {
        private final List<String> perms = List.of("users:read", "roles:read", "groups:read", "chat:interact");

        @Test void canReadUsers()      { assertTrue(PermissionChecker.check(perms, "users:read")); }
        @Test void canChat()           { assertTrue(PermissionChecker.check(perms, "chat:interact")); }
        @Test void cannotCreateUsers() { assertFalse(PermissionChecker.check(perms, "users:create")); }
        @Test void cannotDeleteUsers() { assertFalse(PermissionChecker.check(perms, "users:delete")); }
        @Test void cannotDeleteRoles() { assertFalse(PermissionChecker.check(perms, "roles:delete")); }
    }
}
