"""Print CDP injection results for parts 2-11 by reading prebuilt expr files."""
import json
import sys

p = r"d:\all in one fbos files\FBOSV01\FBOS_V01\fbos-v1\scripts\google-apps-script"
start = int(sys.argv[1]) if len(sys.argv) > 1 else 2
end = int(sys.argv[2]) if len(sys.argv) > 2 else 11
for i in range(start, end + 1):
    expr = open(f"{p}/expr-{i}.txt", encoding="utf-8").read()
    print(f"PART{i}_LEN={len(expr)}")
