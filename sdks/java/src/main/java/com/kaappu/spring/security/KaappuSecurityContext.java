package com.kaappu.spring.security;

import java.util.Collections;
import java.util.List;

public final class KaappuSecurityContext {

    private static final ThreadLocal<KaappuSecurityContext> HOLDER = new ThreadLocal<>();

    private final String userId;
    private final String accountId;
    private final String email;
    private final String sessionId;
    private final List<String> permissions;

    public KaappuSecurityContext(String userId, String accountId, String email,
                                 String sessionId, List<String> permissions) {
        this.userId = userId;
        this.accountId = accountId;
        this.email = email;
        this.sessionId = sessionId;
        this.permissions = permissions != null ? Collections.unmodifiableList(permissions) : List.of();
    }

    public String getUserId() { return userId; }
    public String getAccountId() { return accountId; }
    public String getEmail() { return email; }
    public String getSessionId() { return sessionId; }
    public List<String> getPermissions() { return permissions; }

    public static void set(KaappuSecurityContext ctx) { HOLDER.set(ctx); }
    public static KaappuSecurityContext get() { return HOLDER.get(); }
    public static void clear() { HOLDER.remove(); }
}
