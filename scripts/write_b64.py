import sys, base64, os
filepath = sys.argv[1]
b64data = sys.argv[2]
mode = sys.argv[3] if len(sys.argv) > 3 else 'w'
os.makedirs(os.path.dirname(filepath), exist_ok=True)
with open(filepath, 'a' if mode == 'append' else 'w', encoding='utf-8') as f:
    f.write(base64.b64decode(b64data).decode('utf-8'))
print(f'Done {mode} to {filepath}')
