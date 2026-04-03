"""
Framework-agnostic permission checking with wildcard support.
Works with Flask, FastAPI, Django, or any Python service.
"""

from typing import List, Optional


def check_permission(user_permissions: Optional[List[str]], required: str) -> bool:
    """
    Check if the user's permissions satisfy the required permission.

    Supports:
      - Exact match: 'users:read' satisfies 'users:read'
      - Super wildcard: '*' satisfies any permission
      - Resource wildcard: 'users:*' satisfies 'users:read', 'users:delete', etc.
    """
    if not required:
        return True
    if not user_permissions:
        return False

    resource = required.split(":")[0]
    return any(
        p == "*" or p == required or p == f"{resource}:*"
        for p in user_permissions
    )


def check_all_permissions(user_permissions: Optional[List[str]], required: List[str]) -> bool:
    """Check if the user has ALL required permissions."""
    return all(check_permission(user_permissions, r) for r in required)


def check_any_permission(user_permissions: Optional[List[str]], required: List[str]) -> bool:
    """Check if the user has ANY of the required permissions."""
    return any(check_permission(user_permissions, r) for r in required)
