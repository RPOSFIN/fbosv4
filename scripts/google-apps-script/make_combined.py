import base64

p = r"d:\all in one fbos files\FBOSV01\FBOS_V01\fbos-v1\scripts\google-apps-script"
parts = []
for i in range(2, 12):
    parts.append(open(f"{p}/inject-expr-{i}.txt", encoding="utf-8").read().strip())
script = ";".join(parts)
expr = 'eval(atob("' + base64.b64encode(script.encode()).decode() + '"))'
open(f"{p}/expr-2-11.txt", "w", encoding="utf-8").write(expr)
print(len(expr))
