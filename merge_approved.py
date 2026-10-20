import json, pathlib, shutil, datetime
NEWS_PATH = pathlib.Path(r'c:\Users\easys\OneDrive\Desktop\2026_2학기\ai-newsroom\data\news.json')
REVIEW_PATH = pathlib.Path(r'c:\Users\easys\OneDrive\Desktop\2026_2학기\ai-newsroom\data\review_candidates.json')
SUMMARY_PATH = pathlib.Path(r'c:\Users\easys\OneDrive\Desktop\2026_2학기\ai-newsroom\data\summary_test.json')

def backup_news():
    if NEWS_PATH.exists():
        stamp = datetime.datetime.now().strftime('%Y%m%d_%H%M%S')
        backup = NEWS_PATH.with_name(f'news.json.bak_{stamp}')
        shutil.copy2(NEWS_PATH, backup)
        print('Backup created:', backup)
        return backup
    return None

def load_json(p):
    return json.loads(p.read_text(encoding='utf-8'))

def save_json(p, data):
    p.write_text(json.dumps(data, ensure_ascii=False, indent=2), encoding='utf-8')

backup_news()

news = load_json(NEWS_PATH)
summary_data = load_json(SUMMARY_PATH)
summary_map = {it['id']: it for it in summary_data.get('items', [])}

review = load_json(REVIEW_PATH)
candidates = review.get('candidates', [])

merged_count = 0
for item in news:
    nid = item.get('id')
    cand = next((c for c in candidates if c['id']==nid and c.get('approved')), None)
    if cand:
        sum_it = summary_map.get(nid)
        if sum_it:
            # merge safe fields
            item['title_ko'] = sum_it.get('title_ko')
            item['summary_ko'] = sum_it.get('summary_ko')
            item['keywords'] = sum_it.get('keywords')
            item['concepts'] = sum_it.get('concepts')
            item['whyImportant'] = sum_it.get('whyImportant')
            item['summary_status'] = 'reviewed'
            item['summary_generated_at'] = sum_it.get('summary_generated_at')
            item['summary_model'] = sum_it.get('summary_model')
            item['summary_locked'] = True
            merged_count += 1

print(f"Merged {merged_count} approved items")
save_json(NEWS_PATH, news)
print('news.json updated')
