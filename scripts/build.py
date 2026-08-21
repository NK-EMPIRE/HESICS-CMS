# Build script for HESICS OS High-Ticket UI
import os, sys, json
print('Starting build script...')

def write_file(filepath, content):
    os.makedirs(os.path.dirname(filepath), exist_ok=True)
    with open(filepath, 'w', encoding='utf-8') as out:
        out.write(content)
    print(f'Wrote {filepath}')
