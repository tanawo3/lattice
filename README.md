# Lattice

Knowledge graph claims with contradiction and confidence tracking.

Lattice models claims as connected nodes instead of isolated posts. Evidence, edges, contradiction reports and synthesis runs help the frontend show how a conclusion was reached.

## Review Links

| Surface | Link |
| --- | --- |
| Live app | https://lattice-knowledge-graph.vercel.app |
| GitHub | https://github.com/tanawo3/lattice |
| Contract | https://explorer-studio.genlayer.com/address/0xda1623CB747eb4CC9c33B17D4A40DA12948BAb13 |

## Chain Record

- Network: GenLayer Studionet
- Chain ID: 61999
- Contract: `0xda1623CB747eb4CC9c33B17D4A40DA12948BAb13`
- Deploy transaction: [0x697291e2...95a063](https://explorer-studio.genlayer.com/tx/0x697291e25ba229f363e3a538ca81c67b32194f4d4de4e0f19727a247f395a063)
- Deployed: `2026-08-02T20:57:30.732Z`
- Source: `contracts/lattice_v2.py` (50,477 bytes)
- Source SHA-256: `1893812deffe366599435c51f01705270c6018edbc21dd42ebdcc4fea777a1f5`

## Protocol Path

1. Create a claim node and connect it to cited nodes.
2. Attach public evidence and independent contradiction reports.
3. Run synthesis with exact agreement on verdict, confidence, evidence and risk fields.
4. Keep the result inside a mandatory challenge and appeal window.
5. Finalize only after every filing is resolved and the deadline has passed.

The frontend reads nodes, edges, evidence sets, contradiction reports and synthesis views. Contract state is public; write actions still require a connected wallet on GenLayer Studionet.

## Verification

`tests/test_lattice.py` covers the full graph path: nodes, edge, evidence, contradiction, synthesis, challenge, appeal and deadline-gated finalization. It also asserts validator agreement over every settlement-changing field. The suite passes 2/2.

## Local Run

```bash
python -m http.server 8080
```

Open `http://localhost:8080`.

## Release Hygiene

The public package is static and has no install step. Vercel receives only frontend, contract source and public deployment metadata.

Keep wallet private keys, vault exports, `.env` files, Vercel project state and dashboard data out of Git. This repository is for public source, UI, tests and deployment receipts only.
