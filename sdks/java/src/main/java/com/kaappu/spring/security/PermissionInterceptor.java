package com.kaappu.spring.security;

import com.kaappu.spring.util.PermissionChecker;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.web.method.HandlerMethod;
import org.springframework.web.servlet.HandlerInterceptor;

import java.io.IOException;

public class PermissionInterceptor implements HandlerInterceptor {

    private static final Logger log = LoggerFactory.getLogger(PermissionInterceptor.class);

    @Override
    public boolean preHandle(HttpServletRequest request, HttpServletResponse response,
                              Object handler) throws IOException {
        if (!(handler instanceof HandlerMethod handlerMethod)) {
            return true;
        }

        // Check method-level annotation first, then class-level
        RequirePermission annotation = handlerMethod.getMethodAnnotation(RequirePermission.class);
        if (annotation == null) {
            annotation = handlerMethod.getBeanType().getAnnotation(RequirePermission.class);
        }
        if (annotation == null) {
            return true; // No permission required
        }

        KaappuSecurityContext ctx = KaappuSecurityContext.get();
        if (ctx == null) {
            sendForbidden(response, annotation.value());
            return false;
        }

        if (!PermissionChecker.check(ctx.getPermissions(), annotation.value())) {
            log.warn("Permission denied: user={} required={} had={}",
                ctx.getUserId(), annotation.value(), ctx.getPermissions());
            sendForbidden(response, annotation.value());
            return false;
        }

        return true;
    }

    private void sendForbidden(HttpServletResponse response, String permission) throws IOException {
        response.setStatus(403);
        response.setContentType("application/json");
        response.getWriter().write(
            String.format("{\"error\":\"Forbidden: Requires %s permission\",\"code\":\"forbidden\"}", permission)
        );
    }
}
