# kaappu-sdk

JWT authentication and permission-based authorization for Python services. Works with Flask, FastAPI, or any Python HTTP framework.

## Install

```bash
pip install kaappu-sdk

# With Flask support
pip install kaappu-sdk[flask]

# With FastAPI support
pip install kaappu-sdk[fastapi]
```

## Quick Start

### Permission Checking

```python
from kaappu import check_permission, check_all_permissions, check_any_permission

user_perms = ["users:read", "roles:read", "gateway:*"]

check_permission(user_perms, "users:read")        # True
check_permission(user_perms, "users:delete")       # False
check_permission(user_perms, "gateway:view")       # True (wildcard)
check_all_permissions(user_perms, ["users:read", "roles:read"])  # True
check_any_permission(user_perms, ["users:delete", "roles:read"]) # True
```

Wildcard support:
- `*` -- super wildcard, matches any permission
- `resource:*` -- matches any action on that resource

### Flask Route Protection

```python
from flask import Flask
from kaappu.decorators import require_permission

app = Flask(__name__)

@app.route("/api/users")
@require_permission("users:read")
def list_users():
    return {"users": []}
```

### Security Context

```python
from kaappu import SecurityContext
from kaappu.context import set_context, get_context

# Set context (typically in middleware)
ctx = SecurityContext(
    user_id="u_123",
    account_id="acc_456",
    email="user@example.com",
    permissions=["users:read", "roles:read"],
)
set_context(ctx)

# Read context anywhere in the same thread
current = get_context()
print(current.email)
```

### API Client

```python
from kaappu import KaappuClient

client = KaappuClient(
    base_url="https://your-kaappu-instance",
    publishable_key="pk_live_...",
)

# Sign in
result = client.sign_in("user@example.com", "password")
access_token = result["accessToken"]

# Get current user
user = client.get_me(access_token)

# Refresh token
new_tokens = client.refresh_token(result["refreshToken"])
```

## API

| Function / Class | Description |
|------------------|-------------|
| `check_permission(perms, required)` | Check a single permission with wildcard support |
| `check_all_permissions(perms, required)` | Check that ALL permissions are satisfied |
| `check_any_permission(perms, required)` | Check that ANY permission is satisfied |
| `SecurityContext` | Dataclass holding user identity and permissions |
| `set_context(ctx)` / `get_context()` | Thread-local security context storage |
| `require_permission(perm)` | Flask route decorator for permission enforcement |
| `KaappuClient` | API client for sign-in, sign-up, refresh, and user fetch |

## Requirements

- Python 3.9+
- PyJWT 2.8+

## License

MIT
