# Lattice

Knowledge graph claims with contradiction and confidence tracking.

Lattice models claims as connected nodes instead of isolated posts. Evidence, edges, contradiction reports and synthesis runs help the frontend show how a conclusion was reached.

## Review Links

| Surface | Link |
| --- | --- |
| Live app | https://assmore22-lattice.vercel.app |
| GitHub | https://github.com/assmore22/lattice |
| Contract | https://explorer-studio.genlayer.com/address/0xd7CC7438EBe858be3d90Bd58897A1829190c7C7a |

## Chain Record

- Network: GenLayer Studionet
- Chain ID: 61999
- Contract: `0xd7CC7438EBe858be3d90Bd58897A1829190c7C7a`
- Deploy transaction: [0x09d1285e...d39906](https://explorer-studio.genlayer.com/tx/0x09d1285ed656871b559079322b1aee0d0764e89b17f5e4257be158c575d39906)
- Deployed: `2026-06-23T13:38:18.578Z`
- Source: `contracts/lattice_v2.py` (45,385 bytes)

## Protocol Path

1. Create knowledge nodes.
2. Link edges and evidence.
3. File contradictions.
4. Run synthesis.
5. Update confidence and reputation.

The frontend reads nodes, edges, evidence sets, contradiction reports and synthesis views. Contract state is public; write actions still require a connected wallet on GenLayer Studionet.

## Finalized Smoke

| Action | Transaction |
| --- | --- |
| `set_protocol` | [0xe975649f...d1a844](https://explorer-studio.genlayer.com/tx/0xe975649f6376fa41dc195e2c5c4e953f686a25dde71270cf7d4ab37d9dd1a844) |
| `create_node_root` | [0x371f1132...3d4ca0](https://explorer-studio.genlayer.com/tx/0x371f11323a19fc0eb0958ee25d33c531a1f66da0a1b6dfef2a307ee9943d4ca0) |
| `create_node_child` | [0xa910b6c9...7164fe](https://explorer-studio.genlayer.com/tx/0xa910b6c9f210949b2bbf9727b48f954d11938e64fbf4a441fb30d66d5c7164fe) |
| `connect_nodes` | [0xc9d26912...1aff9e](https://explorer-studio.genlayer.com/tx/0xc9d269126d61d96e4d67ddc17003f459cfd8964245693c02589c521eb91aff9e) |
| `add_evidence` | [0xd7460c24...d70c02](https://explorer-studio.genlayer.com/tx/0xd7460c24e4c2645b779ebaf2e07055cd282740dce86cbc814558854949d70c02) |
| `add_contradiction_report` | [0x7cfa5838...4ca963](https://explorer-studio.genlayer.com/tx/0x7cfa5838221f156979712fc999b99f7cd8c0e3aba3f21866fce33c44b74ca963) |

## Local Run

```bash
python -m http.server 8080
```

Open `http://localhost:8080`.

## Release Hygiene

The public package is static and has no install step. Vercel receives only frontend, contract source and public deployment metadata.

Keep wallet private keys, vault exports, `.env` files, Vercel project state and dashboard data out of Git. This repository is for public source, UI, tests and deployment receipts only.
