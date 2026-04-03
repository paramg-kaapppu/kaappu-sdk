package com.kaappu.spring.util;

import java.util.List;

public final class PermissionChecker {

    private PermissionChecker() {}

    /**
     * Checks whether the user's permissions satisfy the required permission.
     * Supports exact match, super wildcard (*), and resource wildcard (resource:*).
     */
    public static boolean check(List<String> userPermissions, String required) {
        if (userPermissions == null || required == null) return false;
        String resource = required.split(":")[0];
        return userPermissions.stream().anyMatch(p ->
            p.equals("*") || p.equals(required) || p.equals(resource + ":*")
        );
    }
}
