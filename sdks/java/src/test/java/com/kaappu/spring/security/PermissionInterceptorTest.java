package com.kaappu.spring.security;

import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.web.method.HandlerMethod;

import java.io.PrintWriter;
import java.io.StringWriter;
import java.lang.reflect.Method;
import java.util.List;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class PermissionInterceptorTest {

    private PermissionInterceptor interceptor;

    @Mock private HttpServletRequest request;
    @Mock private HttpServletResponse response;

    private StringWriter responseBody;

    @BeforeEach
    void setUp() throws Exception {
        interceptor = new PermissionInterceptor();
        responseBody = new StringWriter();
        lenient().when(response.getWriter()).thenReturn(new PrintWriter(responseBody));
    }

    @AfterEach
    void cleanup() {
        KaappuSecurityContext.clear();
    }

    private void setSecurityContext(List<String> permissions) {
        KaappuSecurityContext.set(new KaappuSecurityContext(
                "user1", "acct1", "user@example.com", "sess1", permissions));
    }

    // Build a real HandlerMethod from test stub methods instead of mocking
    private HandlerMethod handlerFor(String methodName) throws Exception {
        Method method = TestController.class.getMethod(methodName);
        return new HandlerMethod(new TestController(), method);
    }

    // Stub controller with annotated methods for testing
    static class TestController {
        @RequirePermission("users:read")
        public void readUsers() {}

        @RequirePermission("users:delete")
        public void deleteUsers() {}

        @RequirePermission("users:create")
        public void createUsers() {}

        @RequirePermission("roles:read")
        public void readRoles() {}

        @RequirePermission("roles:create")
        public void createRoles() {}

        @RequirePermission("groups:delete")
        public void deleteGroups() {}

        @RequirePermission("governance_chat:use")
        public void useGovernanceChat() {}

        @RequirePermission("gateway_chat:use")
        public void useGatewayChat() {}

        @RequirePermission("gateway_instances:manage")
        public void manageGatewayInstances() {}

        @RequirePermission("security_advisor_blueprint:generate")
        public void generateBlueprint() {}

        public void noPermissionRequired() {}
    }

    // --- Basic permission checks ---

    @Test
    @DisplayName("Allows access when user has exact required permission")
    void exactPermissionMatch() throws Exception {
        setSecurityContext(List.of("users:read"));
        assertTrue(interceptor.preHandle(request, response, handlerFor("readUsers")));
    }

    @Test
    @DisplayName("Denies access when user lacks required permission, returns 403")
    void permissionDenied() throws Exception {
        setSecurityContext(List.of("users:read"));
        assertFalse(interceptor.preHandle(request, response, handlerFor("deleteUsers")));
        verify(response).setStatus(403);
        assertTrue(responseBody.toString().contains("users:delete"));
    }

    @Test
    @DisplayName("Super wildcard '*' grants access to any endpoint")
    void superWildcardGrantsAccess() throws Exception {
        setSecurityContext(List.of("*"));
        assertTrue(interceptor.preHandle(request, response, handlerFor("deleteUsers")));
    }

    @Test
    @DisplayName("Resource wildcard 'roles:*' grants access to roles:read")
    void resourceWildcardGrantsAccess() throws Exception {
        setSecurityContext(List.of("roles:*"));
        assertTrue(interceptor.preHandle(request, response, handlerFor("readRoles")));
    }

    @Test
    @DisplayName("Resource wildcard 'roles:*' grants access to roles:create")
    void resourceWildcardGrantsCreate() throws Exception {
        setSecurityContext(List.of("roles:*"));
        assertTrue(interceptor.preHandle(request, response, handlerFor("createRoles")));
    }

    @Test
    @DisplayName("Resource wildcard 'users:*' does not grant access to roles:read")
    void resourceWildcardDoesNotCrossResources() throws Exception {
        setSecurityContext(List.of("users:*"));
        assertFalse(interceptor.preHandle(request, response, handlerFor("readRoles")));
        verify(response).setStatus(403);
    }

    @Test
    @DisplayName("No @RequirePermission annotation allows access")
    void noAnnotationAllowsAccess() throws Exception {
        assertTrue(interceptor.preHandle(request, response, handlerFor("noPermissionRequired")));
    }

    @Test
    @DisplayName("Non-HandlerMethod handler allows access (e.g. static resources)")
    void nonHandlerMethodAllowsAccess() throws Exception {
        assertTrue(interceptor.preHandle(request, response, new Object()));
    }

    @Test
    @DisplayName("No security context set returns 403")
    void noSecurityContextReturns403() throws Exception {
        assertFalse(interceptor.preHandle(request, response, handlerFor("readUsers")));
        verify(response).setStatus(403);
    }

    @Test
    @DisplayName("403 response body contains JSON with error and code fields")
    void forbiddenResponseBodyFormat() throws Exception {
        setSecurityContext(List.of("users:read"));
        interceptor.preHandle(request, response, handlerFor("deleteUsers"));

        String body = responseBody.toString();
        assertTrue(body.contains("\"error\""));
        assertTrue(body.contains("\"code\":\"forbidden\""));
        assertTrue(body.contains("users:delete"));
        verify(response).setContentType("application/json");
    }

    // --- Role-based scenarios ---

    @Nested
    @DisplayName("Owner role — has ['*']")
    class OwnerRoleScenarios {
        @BeforeEach void setOwner() { setSecurityContext(List.of("*")); }

        @Test void canReadUsers() throws Exception {
            assertTrue(interceptor.preHandle(request, response, handlerFor("readUsers")));
        }
        @Test void canDeleteUsers() throws Exception {
            assertTrue(interceptor.preHandle(request, response, handlerFor("deleteUsers")));
        }
        @Test void canCreateRoles() throws Exception {
            assertTrue(interceptor.preHandle(request, response, handlerFor("createRoles")));
        }
        @Test void canManageGateway() throws Exception {
            assertTrue(interceptor.preHandle(request, response, handlerFor("manageGatewayInstances")));
        }
        @Test void canGenerateBlueprint() throws Exception {
            assertTrue(interceptor.preHandle(request, response, handlerFor("generateBlueprint")));
        }
    }

    @Nested
    @DisplayName("Admin role — has module wildcards")
    class AdminRoleScenarios {
        @BeforeEach void setAdmin() {
            setSecurityContext(List.of("users:*", "roles:*", "groups:*",
                "gateway_instances:*", "gateway_chat:*", "governance_chat:*",
                "security_advisor_blueprint:*"));
        }

        @Test void canReadUsers() throws Exception {
            assertTrue(interceptor.preHandle(request, response, handlerFor("readUsers")));
        }
        @Test void canDeleteUsers() throws Exception {
            assertTrue(interceptor.preHandle(request, response, handlerFor("deleteUsers")));
        }
        @Test void canManageGateway() throws Exception {
            assertTrue(interceptor.preHandle(request, response, handlerFor("manageGatewayInstances")));
        }
        @Test void canUseChat() throws Exception {
            assertTrue(interceptor.preHandle(request, response, handlerFor("useGovernanceChat")));
        }
    }

    @Nested
    @DisplayName("Viewer role — read-only permissions")
    class ViewerRoleScenarios {
        @BeforeEach void setViewer() {
            setSecurityContext(List.of("users:read", "roles:read", "groups:read",
                "gateway_instances:read", "governance_chat:read"));
        }

        @Test void canReadUsers() throws Exception {
            assertTrue(interceptor.preHandle(request, response, handlerFor("readUsers")));
        }
        @Test void cannotDeleteUsers() throws Exception {
            assertFalse(interceptor.preHandle(request, response, handlerFor("deleteUsers")));
        }
        @Test void cannotCreateUsers() throws Exception {
            assertFalse(interceptor.preHandle(request, response, handlerFor("createUsers")));
        }
        @Test void cannotManageGateway() throws Exception {
            assertFalse(interceptor.preHandle(request, response, handlerFor("manageGatewayInstances")));
        }
        @Test void cannotUseGovernanceChat() throws Exception {
            // viewer has governance_chat:read, not governance_chat:use
            assertFalse(interceptor.preHandle(request, response, handlerFor("useGovernanceChat")));
        }
    }

    @Nested
    @DisplayName("Member role — read + interactive features")
    class MemberRoleScenarios {
        @BeforeEach void setMember() {
            setSecurityContext(List.of("users:read", "groups:read",
                "governance_chat:use", "gateway_chat:use",
                "gateway_instances:read", "security_advisor_blueprint:read"));
        }

        @Test void canReadUsers() throws Exception {
            assertTrue(interceptor.preHandle(request, response, handlerFor("readUsers")));
        }
        @Test void canUseGovernanceChat() throws Exception {
            assertTrue(interceptor.preHandle(request, response, handlerFor("useGovernanceChat")));
        }
        @Test void canUseGatewayChat() throws Exception {
            assertTrue(interceptor.preHandle(request, response, handlerFor("useGatewayChat")));
        }
        @Test void cannotCreateUsers() throws Exception {
            assertFalse(interceptor.preHandle(request, response, handlerFor("createUsers")));
        }
        @Test void cannotDeleteGroups() throws Exception {
            assertFalse(interceptor.preHandle(request, response, handlerFor("deleteGroups")));
        }
        @Test void cannotManageGateway() throws Exception {
            assertFalse(interceptor.preHandle(request, response, handlerFor("manageGatewayInstances")));
        }
        @Test void cannotGenerateBlueprint() throws Exception {
            // member has security_advisor_blueprint:read, not :generate
            assertFalse(interceptor.preHandle(request, response, handlerFor("generateBlueprint")));
        }
    }
}
