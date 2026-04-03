package com.kaappu.spring.security;

import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import java.util.List;

import static org.junit.jupiter.api.Assertions.*;

class KaappuSecurityContextTest {

    @AfterEach
    void cleanup() {
        KaappuSecurityContext.clear();
    }

    @Test
    @DisplayName("set/get stores and retrieves context in ThreadLocal")
    void setAndGet() {
        KaappuSecurityContext ctx = new KaappuSecurityContext(
                "user1", "acct1", "user@example.com", "sess1", List.of("users:read"));
        KaappuSecurityContext.set(ctx);

        KaappuSecurityContext retrieved = KaappuSecurityContext.get();
        assertNotNull(retrieved);
        assertEquals("user1", retrieved.getUserId());
        assertEquals("acct1", retrieved.getAccountId());
        assertEquals("user@example.com", retrieved.getEmail());
        assertEquals("sess1", retrieved.getSessionId());
        assertEquals(List.of("users:read"), retrieved.getPermissions());
    }

    @Test
    @DisplayName("clear removes the context from ThreadLocal")
    void clearRemovesContext() {
        KaappuSecurityContext ctx = new KaappuSecurityContext(
                "user1", "acct1", "user@example.com", "sess1", List.of("users:read"));
        KaappuSecurityContext.set(ctx);
        assertNotNull(KaappuSecurityContext.get());

        KaappuSecurityContext.clear();
        assertNull(KaappuSecurityContext.get());
    }

    @Test
    @DisplayName("get returns null when no context has been set")
    void getReturnsNullByDefault() {
        assertNull(KaappuSecurityContext.get());
    }

    @Test
    @DisplayName("Permissions list is unmodifiable")
    void permissionsAreUnmodifiable() {
        KaappuSecurityContext ctx = new KaappuSecurityContext(
                "user1", "acct1", "user@example.com", "sess1", List.of("users:read"));
        assertThrows(UnsupportedOperationException.class, () -> ctx.getPermissions().add("extra:perm"));
    }

    @Test
    @DisplayName("Null permissions defaults to empty list")
    void nullPermissionsDefaultsToEmptyList() {
        KaappuSecurityContext ctx = new KaappuSecurityContext(
                "user1", "acct1", "user@example.com", "sess1", null);
        assertNotNull(ctx.getPermissions());
        assertTrue(ctx.getPermissions().isEmpty());
    }

    @Test
    @DisplayName("Context is thread-local and isolated between threads")
    void threadIsolation() throws InterruptedException {
        KaappuSecurityContext ctx = new KaappuSecurityContext(
                "user1", "acct1", "user@example.com", "sess1", List.of("users:read"));
        KaappuSecurityContext.set(ctx);

        final KaappuSecurityContext[] otherThreadCtx = new KaappuSecurityContext[1];
        Thread other = new Thread(() -> otherThreadCtx[0] = KaappuSecurityContext.get());
        other.start();
        other.join();

        assertNotNull(KaappuSecurityContext.get());
        assertNull(otherThreadCtx[0]);
    }
}
