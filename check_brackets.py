import os

def check_brackets(file_path):
    with open(file_path, 'r', encoding='utf-8', errors='ignore') as f:
        content = f.read()
    
    counts = {
        '(': 0, ')': 0,
        '{': 0, '}': 0,
        '[': 0, ']': 0,
        '<': 0, '>': 0
    }
    
    for char in content:
        if char in counts:
            counts[char] += 1
            
    return counts

pages_dir = 'src/pages'
for filename in os.listdir(pages_dir):
    if filename.endswith('.jsx'):
        path = os.path.join(pages_dir, filename)
        counts = check_brackets(path)
        print(f"{filename}:")
        print(f"  (): {counts['('] - counts[')']}")
        print(f"  {{}}: {counts['{'] - counts['}']}")
        print(f"  []: {counts['['] - counts[']']}")
        # <> is harder because of < and > in code, but let's see
        # print(f"  <>: {counts['<'] - counts['>']}")
