"""Kaappu SDK for Python — JWT authentication and permission-based authorization."""

from kaappu.permissions import check_permission, check_all_permissions, check_any_permission
from kaappu.context import SecurityContext
from kaappu.client import KaappuClient

__version__ = "0.1.0"
__all__ = [
    "check_permission",
    "check_all_permissions",
    "check_any_permission",
    "SecurityContext",
    "KaappuClient",
]
