# LatticeKnowledge V2

This repository contains a complete GenLayer Studionet project: frontend, contract source, deployment metadata and local verification scripts.

A GenLayer-powered knowledge graph protocol.

## LatticeKnowledge Brief

This repo is organized for review: the app can be opened locally, the contract source is present, and the deployed Studionet address is pinned in `deployment.json`.

- Folder: `projects/28-lattice`
- Frontend shape: static browser app
- Contract source: `contracts/lattice_v2.py`
- Build status: Schema-valid (45385 bytes, 17 write + 23 view); deployed + 16 write smoke txs finalized incl 3 GenLayer reasoning calls; 35/35 read tests passed; legacy backward-compat verified; frontend repointed (no redesign).

## Protocol Mechanics

LatticeKnowledge V2 (# v0.2.16), 45385 bytes, 17 write + 23 view.

- Primary source: `contracts/lattice_v2.py` (45,385 bytes)
- Public write/action methods: 17
- Read methods: 23
- GenLayer features: live web rendering, LLM adjudication, validator-comparative consensus, indexed storage, append-only collections

Typical flow: `create_node` -> `open_synthesis` -> `submit_challenge` -> `resolve_challenge_with_genlayer` -> `open_challenge_window` -> `submit_appeal` -> `assert_claim` -> `archive_node`

Useful reads: `get_knowledge_node`, `get_node_count`, `get_stats`, `get_node`, `get_recent_nodes`, `get_nodes_by_status`, `get_nodes_by_author`, `get_edge`

## Network Record

- Network: studionet (61999)
- Contract: [0xd7CC7438EBe858be3d90Bd58897A1829190c7C7a](https://explorer-studio.genlayer.com/contracts/0xd7CC7438EBe858be3d90Bd58897A1829190c7C7a)
- Deploy tx: [0x09d1285e...d39906](https://explorer-studio.genlayer.com/tx/0x09d1285ed656871b559079322b1aee0d0764e89b17f5e4257be158c575d39906)
- Deployed at: 2026-06-23T13:38:18.578Z
- Smoke writes recorded: 16

Smoke coverage:

- set_protocol: [0xe975649f...d1a844](https://explorer-studio.genlayer.com/tx/0xe975649f6376fa41dc195e2c5c4e953f686a25dde71270cf7d4ab37d9dd1a844)
- create_node_root: [0x371f1132...3d4ca0](https://explorer-studio.genlayer.com/tx/0x371f11323a19fc0eb0958ee25d33c531a1f66da0a1b6dfef2a307ee9943d4ca0)
- create_node_child: [0xa910b6c9...7164fe](https://explorer-studio.genlayer.com/tx/0xa910b6c9f210949b2bbf9727b48f954d11938e64fbf4a441fb30d66d5c7164fe)
- connect_nodes: [0xc9d26912...1aff9e](https://explorer-studio.genlayer.com/tx/0xc9d269126d61d96e4d67ddc17003f459cfd8964245693c02589c521eb91aff9e)
- add_evidence: [0xd7460c24...d70c02](https://explorer-studio.genlayer.com/tx/0xd7460c24e4c2645b779ebaf2e07055cd282740dce86cbc814558854949d70c02)
- add_contradiction_report: [0x7cfa5838...4ca963](https://explorer-studio.genlayer.com/tx/0x7cfa5838221f156979712fc999b99f7cd8c0e3aba3f21866fce33c44b74ca963)

## Run LatticeKnowledge Locally

```powershell
cd <private-workspace-root>
npm run preview:start
npm run preview:project -- 28-lattice
```

Open http://localhost:8080/28-lattice/.

## Publish LatticeKnowledge

```powershell
cd <private-workspace-root>
npm run publish:project -- -Project 28-lattice -Repo https://github.com/aspro45/<repo-name>.git
```

## Keys And Boundaries

The repo is designed for public GitHub/Vercel release. Keep `.env`, `.vercel/`, wallet vaults, private keys and local dashboard state out of git. The publisher script enforces these ignore rules before it pushes.
