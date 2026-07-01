"""Tests for LATTICE (direct runner). AI verify() validated live on studionet."""
from pathlib import Path

CONTRACT = str(Path(__file__).resolve().parents[1] / "contracts" / "lattice.py")
UNVERIFIED = 0; SUPPORTED = 1; REFUTED = 2
ROOT = 2 ** 31 - 1


def _assert(lat, vm, who, stmt="Water is composed of hydrogen and oxygen.", url="https://example.com", parent=ROOT):
    vm.sender = who
    return lat.assert_claim(stmt, url, parent)


def test_assert_root(deploy, direct_vm, direct_alice):
    lat = deploy(CONTRACT)
    nid = _assert(lat, direct_vm, direct_alice)
    assert nid == 0
    n = lat.get_node(0)
    assert n["status"] == UNVERIFIED
    assert n["parent"] == ROOT


def test_assert_with_citation(deploy, direct_vm, direct_alice):
    lat = deploy(CONTRACT)
    _assert(lat, direct_vm, direct_alice, stmt="Root claim")
    _assert(lat, direct_vm, direct_alice, stmt="Child claim", parent=0)
    n = lat.get_node(1)
    assert n["parent"] == 0


def test_requires_statement(deploy, direct_vm, direct_alice):
    lat = deploy(CONTRACT)
    direct_vm.sender = direct_alice
    with direct_vm.expect_revert("a statement is required"):
        lat.assert_claim("  ", "https://x.com", ROOT)


def test_requires_source(deploy, direct_vm, direct_alice):
    lat = deploy(CONTRACT)
    direct_vm.sender = direct_alice
    with direct_vm.expect_revert("a source URL is required"):
        lat.assert_claim("stmt", "", ROOT)


def test_bad_parent(deploy, direct_vm, direct_alice):
    lat = deploy(CONTRACT)
    direct_vm.sender = direct_alice
    with direct_vm.expect_revert("cited assertion does not exist"):
        lat.assert_claim("stmt", "https://x.com", 5)


def test_stats(deploy, direct_vm, direct_alice):
    lat = deploy(CONTRACT)
    _assert(lat, direct_vm, direct_alice, stmt="A")
    _assert(lat, direct_vm, direct_alice, stmt="B")
    s = lat.get_stats()
    assert s["total"] == 2
    assert s["unverified"] == 2


def test_multiple(deploy, direct_vm, direct_alice):
    lat = deploy(CONTRACT)
    _assert(lat, direct_vm, direct_alice, stmt="One")
    _assert(lat, direct_vm, direct_alice, stmt="Two")
    assert lat.get_node_count() == 2
    assert lat.get_node(1)["statement"] == "Two"
