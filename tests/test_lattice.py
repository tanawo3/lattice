"""Executable Lattice V2 graph, consensus, dispute-window, and finalization tests."""

import json
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
CONTRACT = str(ROOT / "contracts" / "lattice_v2.py")


def _deploy_graph(deploy, vm, owner):
    vm.warp("2026-07-16T12:00:00Z")
    vm.sender = owner
    contract = deploy(CONTRACT)
    node_id = str(contract.create_node(
        "The public record supports this knowledge claim", "https://example.com/source", "claim"
    ))
    context_id = str(contract.create_node(
        "A related publication provides historical context", "https://example.org/context", "source_note"
    ))
    contract.add_evidence(node_id, "https://example.net/evidence", "archive", "Independent archive")
    contract.connect_nodes(context_id, node_id, "supports", "Historical context supports the claim")
    contract.add_contradiction_report(
        node_id, "A later publication reports a conflicting value", "https://example.edu/contradiction"
    )
    return contract, node_id


def _mock_synthesis(vm):
    vm.mock_llm(
        r"LatticeKnowledge, a neutral",
        json.dumps({
            "verdict": "supported", "supportBps": 8700, "confidenceBps": 8500,
            "edgeConsistencyBps": 8300, "publicSummary": "The graph supports the claim.",
            "reasoningDigest": "Evidence, edge and contradiction were evaluated together.",
            "riskFlags": [], "sourceCredibility": [], "supportingEvidenceIds": [],
            "conflictingEvidenceIds": [], "contradictionIds": ["0"],
        }),
    )


def _mock_ruling(vm, pattern, ruling, revised):
    vm.mock_llm(
        pattern,
        json.dumps({
            "ruling": ruling, "revisedVerdict": revised,
            "confidenceDeltaBps": -1100 if revised == "refuted" else 900,
            "reason": "The filing provides controlling public evidence.",
            "reasoningDigest": "The graph outcome was revised.", "riskFlags": [],
        }),
    )


def test_consensus_covers_verdict_confidence_evidence_and_reputation_inputs():
    source = Path(CONTRACT).read_text(encoding="utf-8")
    assert "verdict, supportBps, confidenceBps, edgeConsistencyBps" in source
    assert "every sourceCredibility entry and riskFlags are exactly identical" in source
    assert "ruling, revisedVerdict, confidenceDeltaBps and riskFlags are exactly identical" in source
    assert '"contracts" / "lattice_v2.py"' in (ROOT / "scripts" / "deploy_only.py").read_text(encoding="utf-8")


def test_full_graph_workflow_has_non_bypassable_challenge_period(
    deploy, direct_vm, direct_alice, direct_bob, direct_charlie
):
    contract, node_id = _deploy_graph(deploy, direct_vm, direct_alice)
    _mock_synthesis(direct_vm)
    contract.synthesize_with_genlayer(node_id)
    record = json.loads(contract.get_knowledge_node(node_id))
    assert record["status"] == "CHALLENGE_WINDOW"
    assert len(record["evidenceIds"]) == 2
    assert len(record["contradictionIds"]) == 1

    direct_vm.sender = direct_bob
    with direct_vm.expect_revert("challenge_period_active"):
        contract.finalize_node(node_id)

    challenge_id = contract.submit_challenge(
        node_id, "The later source controls.", "https://example.org/challenge"
    )
    _mock_ruling(direct_vm, r"resolving a CHALLENGE", "accepted", "refuted")
    contract.resolve_challenge_with_genlayer(node_id, challenge_id)
    assert json.loads(contract.get_knowledge_node(node_id))["verdict"] == "refuted"

    direct_vm.sender = direct_charlie
    appeal_id = contract.submit_appeal(
        node_id, "The later source was retracted.", "https://example.net/appeal"
    )
    _mock_ruling(direct_vm, r"resolving a APPEAL", "granted", "supported")
    contract.resolve_appeal_with_genlayer(node_id, appeal_id)
    direct_vm.warp("2026-07-16T14:00:01Z")
    contract.finalize_node(node_id)
    record = json.loads(contract.get_knowledge_node(node_id))
    assert record["status"] == "FINALIZED"
    assert record["verdict"] == "supported"
