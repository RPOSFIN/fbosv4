import base64
import sys

p = r"d:\all in one fbos files\FBOSV01\FBOS_V01\fbos-v1\scripts\google-apps-script"
i = int(sys.argv[1])
c = open(f"{p}/inject-expr-{i}.txt", encoding="utf-8").read().strip()
if i < 11:
    print('eval(atob("' + base64.b64encode(c.encode()).decode() + '"))', end="")
else:
    print(c, end="")
