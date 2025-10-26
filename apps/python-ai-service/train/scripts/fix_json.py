"""
Script to fix JSON formatting issues in ner_data.csv
"""
import re
from pathlib import Path

csv_path = Path('../data/ner_data.csv')

print("🔧 Fixing JSON in ner_data.csv...")

# Read all lines
lines = csv_path.read_text(encoding='utf-8').splitlines()

fixed_lines = []
fixed_count = 0

for i, line in enumerate(lines, 1):
    # Skip header
    if i == 1:
        fixed_lines.append(line)
        continue
    
    original_line = line
    
    # Fix double colons (::) back to single colon (:)
    if '::' in line:
        line = line.replace('::', ':')
        fixed_count += 1
        print(f"Fixed line {i}: removed double colon")
    
    # Fix missing colons in common patterns
    # Pattern: ""start"X where X is a digit (should be ""start"":X)
    line = re.sub(r'""start""(\d)', r'""start"":\1', line)
    
    # Pattern: ""end"X where X is a digit (should be ""end"":X)
    line = re.sub(r'""end""(\d)', r'""end"":\1', line)
    
    if line != original_line and '::' not in original_line:
        fixed_count += 1
        print(f"Fixed line {i}: added missing colons")
    
    fixed_lines.append(line)

# Write fixed content
csv_path.write_text('\n'.join(fixed_lines), encoding='utf-8')

print(f"✅ Fixed {fixed_count} lines")
print(f"Total lines: {len(lines)}")
