package com.kaappu.spring.security;

import java.lang.annotation.ElementType;
import java.lang.annotation.Retention;
import java.lang.annotation.RetentionPolicy;
import java.lang.annotation.Target;

/**
 * Marks a controller method or class as requiring a specific permission.
 * The permission string follows the resource:action format (e.g., "users:read").
 * Wildcard matching is supported: "*" grants all, "users:*" grants all user actions.
 */
@Target({ElementType.METHOD, ElementType.TYPE})
@Retention(RetentionPolicy.RUNTIME)
public @interface RequirePermission {
    String value();
}
