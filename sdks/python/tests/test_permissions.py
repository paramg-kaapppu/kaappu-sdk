"""Tests for the permission checking module."""

import pytest
from kaappu.permissions import check_permission, check_all_permissions, check_any_permission


class TestCheckPermission:
    def test_exact_match(self):
        assert check_permission(["users:read"], "users:read") is True

    def test_no_match(self):
        assert check_permission(["users:read"], "users:delete") is False

    def test_super_wildcard(self):
        assert check_permission(["*"], "anything:here") is True

    def test_resource_wildcard(self):
        assert check_permission(["users:*"], "users:delete") is True

    def test_resource_wildcard_no_cross(self):
        assert check_permission(["users:*"], "roles:read") is False

    def test_empty_perms(self):
        assert check_permission([], "users:read") is False

    def test_none_perms(self):
        assert check_permission(None, "users:read") is False

    def test_empty_required(self):
        assert check_permission([], "") is True

    def test_owner_role(self):
        assert check_permission(["*"], "gateway_instances:manage") is True

    def test_admin_wildcards(self):
        perms = ["users:*", "roles:*", "gateway:*"]
        assert check_permission(perms, "users:delete") is True
        assert check_permission(perms, "gateway:view") is True
        assert check_permission(perms, "audit:read") is False

    def test_viewer_denied_write(self):
        perms = ["users:read", "roles:read"]
        assert check_permission(perms, "users:read") is True
        assert check_permission(perms, "users:delete") is False

    def test_member_chat(self):
        perms = ["governance_chat:use", "gateway_chat:use", "users:read"]
        assert check_permission(perms, "governance_chat:use") is True
        assert check_permission(perms, "gateway_instances:manage") is False


class TestCheckAllPermissions:
    def test_all_present(self):
        assert check_all_permissions(["users:read", "roles:read"], ["users:read", "roles:read"]) is True

    def test_one_missing(self):
        assert check_all_permissions(["users:read"], ["users:read", "users:delete"]) is False


class TestCheckAnyPermission:
    def test_one_matches(self):
        assert check_any_permission(["users:read"], ["users:delete", "users:read"]) is True

    def test_none_match(self):
        assert check_any_permission(["users:read"], ["roles:read", "groups:read"]) is False
