# { "Depends": "py-genlayer:1jb45aa8ynh2a9c9xn3b7qqh8sm5q93hwfp7jqmwsfhh8jpz09h6" }
"""
LATTICE - A Knowledge Graph Judged by Consensus
===============================================
Every node is an assertion: a statement plus a public source. Assertions can cite
one another, forming a graph. To settle a node, the contract reads its source and
a validator set decides, under the Equivalence Principle, whether the source
supports the statement. Supported nodes glow; refuted ones are marked. Knowledge
that has to hold up to being read.

Status: UNVERIFIED(0) -> SUPPORTED(1) | REFUTED(2)
"""

from genlayer import *
from dataclasses import dataclass
import json
import typing


UNVERIFIED = 0
SUPPORTED = 1
REFUTED = 2
NO_PARENT = 2 ** 31 - 1  # sentinel for "no citation"


@allow_storage
@dataclass
class Node:
    author: Address
    statement: str
    source_url: str
    parent: u256
    status: u8
    rationale: str


class Lattice(gl.Contract):
    nodes: DynArray[Node]

    def __init__(self) -> None:
        pass

    @gl.public.write
    def assert_claim(self, statement: str, source_url: str, parent: int) -> int:
        if len(statement.strip()) == 0:
            raise gl.vm.UserError("a statement is required")
        if len(source_url.strip()) == 0:
            raise gl.vm.UserError("a source URL is required")
        if parent != NO_PARENT:
            if parent < 0 or parent >= len(self.nodes):
                raise gl.vm.UserError("cited assertion does not exist")
        n = self.nodes.append_new_get()
        n.author = gl.message.sender_address
        n.statement = statement
        n.source_url = source_url
        n.parent = u256(parent)
        n.status = u8(UNVERIFIED)
        n.rationale = ""
        return len(self.nodes) - 1

    @gl.public.write
    def verify(self, node_id: int) -> None:
        """Read the source; validators decide whether it supports the statement."""
        n = self._get(node_id)
        if n.status != UNVERIFIED:
            raise gl.vm.UserError("this node is already settled")

        statement = n.statement
        url = n.source_url

        def leader_fn() -> str:
            page = ""
            try:
                page = gl.nondet.web.get(url).body.decode("utf-8")[:6000]
            except Exception:
                page = "(source unreachable)"
            prompt = (
                f"An assertion in a knowledge graph makes this claim:\n"
                f"STATEMENT: {statement}\n\n"
                f"Its cited source:\n{page}\n\n"
                "Based strictly on the source, does the source SUPPORT the "
                'statement? Reply with ONLY JSON: {"supported": true} if the source '
                'backs the statement, {"supported": false} if it contradicts it or '
                'does not support it, plus a short "reason".'
            )
            return gl.nondet.exec_prompt(prompt)

        def validator_fn(leader_res) -> bool:
            if not isinstance(leader_res, gl.vm.Return):
                return False
            return self._decision_of(leader_res.calldata)[0] == self._decision_of(leader_fn())[0]

        result = gl.vm.run_nondet_unsafe(leader_fn, validator_fn)
        ok, reason = self._decision_of(result)
        n.rationale = reason[:300]
        n.status = u8(SUPPORTED) if ok else u8(REFUTED)

    # ------------------------------------------------------------------ views
    @gl.public.view
    def get_node_count(self) -> int:
        return len(self.nodes)

    @gl.public.view
    def get_stats(self) -> dict:
        s = 0
        r = 0
        u = 0
        for n in self.nodes:
            if n.status == SUPPORTED:
                s += 1
            elif n.status == REFUTED:
                r += 1
            else:
                u += 1
        return {"total": len(self.nodes), "supported": s, "refuted": r, "unverified": u}

    @gl.public.view
    def get_node(self, node_id: int) -> dict:
        n = self._get(node_id)
        return {
            "author": n.author.as_hex,
            "statement": n.statement,
            "source_url": n.source_url,
            "parent": int(n.parent),
            "status": int(n.status),
            "rationale": n.rationale,
        }

    # -------------------------------------------------------------- internals
    def _get(self, node_id: int) -> Node:
        if node_id < 0 or node_id >= len(self.nodes):
            raise gl.vm.UserError("no such node")
        return self.nodes[node_id]

    def _decision_of(self, result: typing.Any) -> tuple:
        data = result
        if isinstance(data, str):
            data = self._extract_json(data)
        if not isinstance(data, dict):
            return (False, "")
        raw = data.get("supported", None)
        reason = str(data.get("reason", ""))
        if isinstance(raw, bool):
            return (raw, reason)
        if isinstance(raw, str):
            return (raw.strip().lower() == "true", reason)
        return (False, reason)

    def _extract_json(self, text: str) -> typing.Any:
        try:
            return json.loads(text)
        except (ValueError, TypeError):
            pass
        start = text.find("{")
        end = text.rfind("}")
        if start != -1 and end != -1 and end > start:
            try:
                return json.loads(text[start:end + 1])
            except (ValueError, TypeError):
                return None
        return None
