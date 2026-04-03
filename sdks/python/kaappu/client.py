"""API client for Kaappu Identity — sign in, sign up, refresh, verify."""

from typing import Any, Dict, Optional
import requests


class KaappuClient:
    """Framework-agnostic client for Kaappu Identity APIs."""

    def __init__(self, base_url: str = "http://localhost:9091", publishable_key: str = ""):
        self.base_url = base_url.rstrip("/")
        self.publishable_key = publishable_key

    def get_tenant_config(self) -> Optional[Dict[str, Any]]:
        """Fetch tenant config (auth methods, branding, bot protection)."""
        try:
            r = requests.get(f"{self.base_url}/api/v1/accounts/config", params={"pk": self.publishable_key})
            return r.json().get("data") if r.ok else None
        except Exception:
            return None

    def sign_in(self, email: str, password: str, account_id: str = "default") -> Dict[str, Any]:
        """Sign in with email + password. Returns accessToken, refreshToken, user."""
        r = requests.post(f"{self.base_url}/api/v1/idm/auth/sign-in", json={
            "email": email, "password": password, "accountId": account_id,
        })
        data = r.json()
        if not data.get("success"):
            raise Exception(data.get("error", "Sign in failed"))
        return data["data"]

    def sign_up(self, email: str, password: str, first_name: str = "", last_name: str = "",
                account_id: str = "default") -> Dict[str, Any]:
        """Sign up a new user. Returns accessToken, refreshToken, user."""
        r = requests.post(f"{self.base_url}/api/v1/idm/auth/sign-up", json={
            "email": email, "password": password,
            "firstName": first_name, "lastName": last_name, "accountId": account_id,
        })
        data = r.json()
        if not data.get("success"):
            raise Exception(data.get("error", "Sign up failed"))
        return data["data"]

    def refresh_token(self, refresh_token: str) -> Optional[Dict[str, Any]]:
        """Refresh an access token."""
        try:
            r = requests.post(f"{self.base_url}/api/v1/idm/auth/refresh", json={
                "refreshToken": refresh_token,
            })
            return r.json().get("data") if r.ok else None
        except Exception:
            return None

    def get_me(self, access_token: str) -> Optional[Dict[str, Any]]:
        """Get current user profile."""
        try:
            r = requests.get(f"{self.base_url}/api/v1/idm/auth/me", headers={
                "Authorization": f"Bearer {access_token}",
            })
            return r.json().get("data", {}).get("user") if r.ok else None
        except Exception:
            return None

    def sign_out(self, access_token: str) -> None:
        """Sign out — invalidate session."""
        try:
            requests.post(f"{self.base_url}/api/v1/idm/auth/sign-out", headers={
                "Authorization": f"Bearer {access_token}",
            })
        except Exception:
            pass
