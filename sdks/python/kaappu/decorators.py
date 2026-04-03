"""
Decorators for Flask and FastAPI route protection.

Flask usage:
    @app.route("/api/users")
    @require_permission("users:read")
    def list_users():
        ...

FastAPI usage:
    @app.get("/api/users")
    async def list_users(ctx: SecurityContext = Depends(get_kaappu_context)):
        ...
"""

from functools import wraps
from typing import Callable

from kaappu.context import get_context
from kaappu.permissions import check_permission


def require_permission(permission: str) -> Callable:
    """
    Decorator that checks the current SecurityContext for the required permission.
    Returns 403 if the permission check fails.
    Works with Flask routes.
    """
    def decorator(f: Callable) -> Callable:
        @wraps(f)
        def wrapper(*args, **kwargs):
            ctx = get_context()
            if ctx is None or not check_permission(ctx.permissions, permission):
                # Flask import deferred to avoid hard dependency
                try:
                    from flask import jsonify
                    return jsonify({
                        "error": f"Forbidden: Requires {permission} permission",
                        "code": "forbidden",
                    }), 403
                except ImportError:
                    raise PermissionError(f"Requires {permission} permission")
            return f(*args, **kwargs)
        return wrapper
    return decorator
