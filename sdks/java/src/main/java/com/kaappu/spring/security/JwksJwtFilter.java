package com.kaappu.spring.security;

import com.kaappu.spring.KaappuProperties;
import com.nimbusds.jose.JWSAlgorithm;
import com.nimbusds.jose.jwk.JWKSet;
import com.nimbusds.jose.jwk.source.ImmutableJWKSet;
import com.nimbusds.jose.proc.JWSVerificationKeySelector;
import com.nimbusds.jose.proc.SecurityContext;
import com.nimbusds.jwt.JWTClaimsSet;
import com.nimbusds.jwt.proc.DefaultJWTClaimsVerifier;
import com.nimbusds.jwt.proc.DefaultJWTProcessor;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.util.AntPathMatcher;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.net.URL;
import java.util.HashSet;
import java.util.List;
import java.util.Set;

public class JwksJwtFilter extends OncePerRequestFilter {

    private static final Logger log = LoggerFactory.getLogger(JwksJwtFilter.class);
    private static final AntPathMatcher pathMatcher = new AntPathMatcher();

    private final KaappuProperties properties;
    private volatile JWKSet cachedJwkSet;
    private volatile long cacheExpiresAt;
    private static final long CACHE_TTL_MS = 10 * 60 * 1000; // 10 minutes

    public JwksJwtFilter(KaappuProperties properties) {
        this.properties = properties;
    }

    @Override
    protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response,
                                     FilterChain filterChain) throws ServletException, IOException {
        String path = request.getRequestURI();

        // Skip public paths
        for (String pattern : properties.getPublicPaths()) {
            if (pathMatcher.match(pattern, path)) {
                filterChain.doFilter(request, response);
                return;
            }
        }

        String authHeader = request.getHeader("Authorization");
        if (authHeader == null || !authHeader.startsWith("Bearer ")) {
            sendError(response, 401, "Unauthorized", "unauthorized");
            return;
        }

        String token = authHeader.substring(7);
        try {
            JWTClaimsSet claims = verifyToken(token);

            String userId = claims.getSubject();
            String accountId = claims.getStringClaim("tid");
            String email = claims.getStringClaim("email");
            String sessionId = claims.getStringClaim("sid");

            @SuppressWarnings("unchecked")
            List<String> permissions = (List<String>) claims.getClaim("permissions");
            if (permissions == null) permissions = List.of();

            KaappuSecurityContext ctx = new KaappuSecurityContext(
                userId, accountId, email, sessionId, permissions
            );
            KaappuSecurityContext.set(ctx);

            try {
                filterChain.doFilter(request, response);
            } finally {
                KaappuSecurityContext.clear();
            }
        } catch (Exception e) {
            log.debug("JWT validation failed: {}", e.getMessage());
            sendError(response, 401, "Unauthorized", "unauthorized");
        }
    }

    private JWTClaimsSet verifyToken(String token) throws Exception {
        JWKSet jwkSet = getJwkSet();
        DefaultJWTProcessor<SecurityContext> processor = new DefaultJWTProcessor<>();
        processor.setJWSKeySelector(
            new JWSVerificationKeySelector<>(JWSAlgorithm.RS256, new ImmutableJWKSet<>(jwkSet))
        );
        processor.setJWTClaimsSetVerifier(
            new DefaultJWTClaimsVerifier<>(null, new HashSet<>(Set.of("sub")))
        );
        return processor.process(token, null);
    }

    private JWKSet getJwkSet() throws Exception {
        long now = System.currentTimeMillis();
        if (cachedJwkSet != null && now < cacheExpiresAt) {
            return cachedJwkSet;
        }
        synchronized (this) {
            if (cachedJwkSet != null && now < cacheExpiresAt) {
                return cachedJwkSet;
            }
            log.info("Fetching JWKS from {}", properties.getJwksUrl());
            cachedJwkSet = JWKSet.load(new URL(properties.getJwksUrl()));
            cacheExpiresAt = now + CACHE_TTL_MS;
            return cachedJwkSet;
        }
    }

    private void sendError(HttpServletResponse response, int status, String error, String code) throws IOException {
        response.setStatus(status);
        response.setContentType("application/json");
        response.getWriter().write(
            String.format("{\"error\":\"%s\",\"code\":\"%s\"}", error, code)
        );
    }
}
