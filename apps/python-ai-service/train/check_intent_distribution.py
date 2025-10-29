import csv
from collections import Counter

with open('data/intent_data.csv', 'r', encoding='utf-8') as f:
    reader = csv.DictReader(f)
    data = list(reader)

labels = [row['label'] for row in data]

print('Total rows:', len(data))
print('\nIntent distribution:')
for intent, count in Counter(labels).most_common():
    print(f'  {intent}: {count}')
print('\nAll unique intents:')
print(sorted(set(labels)))
