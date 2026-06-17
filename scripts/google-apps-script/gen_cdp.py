import base64
import sys

p = r"d:\all in one fbos files\FBOSV01\FBOS_V01\fbos-v1\scripts\google-apps-script"
start = int(sys.argv[1]) if len(sys.argv) > 1 else 2
end = int(sys.argv[2]) if len(sys.argv) > 2 else 11

for i in range(start, end + 1):
    c = open(f"{p}/inject-expr-{i}.txt").read().strip()
    if i < 11:
        e = 'eval(atob("' + base64.b64encode(c.encode()).decode() + '"))'
    else:
        e = c
    print(f"===PART{i}===")
    print(e)
