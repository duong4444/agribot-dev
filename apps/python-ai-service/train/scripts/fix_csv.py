"""
Script to fix malformed lines in ner_data.csv
"""
import re
import json
from pathlib import Path

csv_path = Path('../data/ner_data.csv')

print("🔧 Fixing ner_data.csv...")

# Read all lines
lines = csv_path.read_text(encoding='utf-8').splitlines()

fixed_lines = []
fixed_count = 0

for i, line in enumerate(lines, 1):
    # Skip header
    if i == 1:
        fixed_lines.append(line)
        continue
    
    # Check if line ends with ]}]" (correct format)
    if line.endswith('}]"'):
        # Additional validation: fix missing colons in JSON
        # Pattern: ""start"17 should be ""start"":17
        if '""start"' in line and '""start"":' not in line:
            line = line.replace('""start"', '""start"":')
            fixed_count += 1
            print(f"Fixed line {i}: added colon after 'start'")
        
        # Pattern: ""end"29 should be ""end"":29
        if '""end"' in line and '""end"":' not in line:
            line = line.replace('""end"', '""end"":')
            fixed_count += 1
            print(f"Fixed line {i}: added colon after 'end'")
        
        fixed_lines.append(line)
    # Check if line ends with }] but missing closing "
    elif line.endswith('}]') and not line.endswith('}]"'):
        fixed_line = line + '"'
        
        # Fix colons if needed
        if '""start"' in fixed_line and '""start"":' not in fixed_line:
            fixed_line = fixed_line.replace('""start"', '""start"":')
        if '""end"' in fixed_line and '""end"":' not in fixed_line:
            fixed_line = fixed_line.replace('""end"', '""end"":')
        
        fixed_lines.append(fixed_line)
        fixed_count += 1
        print(f"Fixed line {i}: added closing quote")
    else:
        # Line might be malformed in other ways
        fixed_lines.append(line)

# Write fixed content
csv_path.write_text('\n'.join(fixed_lines), encoding='utf-8')

print(f"✅ Fixed {fixed_count} lines")
print(f"Total lines: {len(lines)}")
