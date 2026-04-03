"""Thread-local security context for the authenticated user."""

import threading
from dataclasses import dataclass, field
from typing import List, Optional


@dataclass
class SecurityContext:
    """Holds the authenticated user's identity and permissions."""
    user_id: str = ""
    account_id: str = ""
    email: str = ""
    session_id: str = ""
    permissions: List[str] = field(default_factory=list)


_context = threading.local()


def set_context(ctx: SecurityContext) -> None:
    """Set the security context for the current thread."""
    _context.kaappu = ctx


def get_context() -> Optional[SecurityContext]:
    """Get the security context for the current thread."""
    return getattr(_context, "kaappu", None)


def clear_context() -> None:
    """Clear the security context for the current thread."""
    _context.kaappu = None
