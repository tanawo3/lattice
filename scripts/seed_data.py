"""Seed LATTICE with a real knowledge graph on studionet (AI verification)."""
from pathlib import Path

from gltest_cli.config.general import get_general_config
from gltest_cli.config.user import load_user_config
from gltest import get_contract_factory, get_default_account

ROOT = Path(__file__).resolve().parents[1]
ADDR = "0x1837657D18B4126fE6b5Fb4757cc7eC4db4885Df"
W = "https://en.wikipedia.org/api/rest_v1/page/summary/"
NOPARENT = 2 ** 31 - 1

cfg = load_user_config(str(ROOT / "gltest.config.yaml"))
get_general_config().user_config = cfg
factory = get_contract_factory(contract_file_path=str(ROOT / "contracts" / "lattice.py"))
c = factory.build_contract(ADDR, account=get_default_account())

# (statement, source, parent_index, do_verify)
NODES = [
    ("Water is composed of hydrogen and oxygen.", W + "Water", NOPARENT, True),
    ("Hydrogen is the lightest chemical element.", W + "Hydrogen", 0, True),
    ("Oxygen makes up about 21 percent of Earth's atmosphere.", W + "Oxygen", 0, True),
    ("Humans can breathe unaided in the vacuum of outer space.", W + "Outer_space", 2, True),
    ("The Sun is composed primarily of hydrogen and helium.", W + "Sun", 1, True),
    ("The Great Wall of China is visible from the Moon with the naked eye.", W + "Great_Wall_of_China", NOPARENT, False),
]


def main():
    if c.get_node_count().call() == 0:
        for (stmt, url, parent, _) in NODES:
            c.assert_claim(args=[stmt, url, parent]).transact()
            print("asserted:", stmt[:44])

    for nid in range(c.get_node_count().call()):
        do = NODES[nid][3] if nid < len(NODES) else False
        n = c.get_node(args=[nid]).call()
        if do and int(n["status"]) == 0:
            print("verifying (AI):", n["statement"][:40])
            try:
                c.verify(args=[nid]).transact()
            except Exception as e:
                print("  verify ->", e)

    print("stats:", c.get_stats().call())
    for nid in range(c.get_node_count().call()):
        n = c.get_node(args=[nid]).call()
        par = "root" if int(n["parent"]) == NOPARENT else "cites#%d" % int(n["parent"])
        print(nid, ["UNVERIFIED", "SUPPORTED", "REFUTED"][int(n["status"])], par, "|", n["statement"][:40])


if __name__ == "__main__":
    main()
