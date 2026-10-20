#!/usr/bin/env python3
import argparse, json, hashlib, sys
from datetime import datetime, timezone, timedelta
import feedparser
import os
import re

FEEDS_CONFIG = os.path.join(os.path.dirname(__file__), '..', 'config', 'feeds.json')

AI_KEYWORDS = [
    'ai', 'artificial intelligence', 'machine learning', 'llm', 'generative',
    'robot', 'generative ai', 'ai agent', 'physical ai', 'vibe coding',
    'ai ethics', 'ai education', 'smart factory'
]
COLLECT_DAYS = 7
PER_SOURCE_LIMIT = 5
MAX_NEW_PER_RUN = 10

def load_feeds():
    with open(FEEDS_CONFIG, 'r', encoding='utf-8') as f:
        return json.load(f)

def normalize_date(entry):
    try:
        if hasattr(entry, 'published_parsed') and entry.published_parsed:
            return datetime(*entry.published_parsed[:6], tzinfo=timezone.utc).isoformat()
    except Exception:
        pass
    return None

def is_korean(text):
    return bool(re.search('[가-힣]', text or ''))

def is_ai_related_text(text):
    t = text.lower()
    reasons = []
    for k in AI_KEYWORDS:
        pattern = r'\b' + re.escape(k) + r'\b'
        if re.search(pattern, t):
            reasons.append(k)
    return len(reasons) > 0, reasons

def is_ai_related_entry(entry):
    title = entry.get('title', '') or ''
    summary = entry.get('summary', '') or entry.get('description', '') or ''
    combined = f"{title} {summary}"
    rel, reasons = is_ai_related_text(combined)
    return rel, reasons, title, summary

CATEGORY_KEYWORDS = {
    'Generative AI': ['generative ai', 'generative', 'llm', 'large language model', 'foundation model', 'text to image'],
    'AI Agent': ['ai agent', 'agent', 'autonomous agent'],
    'Robotics & Physical AI': ['robot', 'physical ai', 'robotics', 'humanoid'],
    'AI Ethics': ['ai ethics', 'ethics', 'bias', 'fairness', 'regulation', 'policy'],
    'AI Education': ['ai education', 'ai literacy', 'ai teaching', 'education'],
    'Smart Factory': ['smart factory', 'industrial ai', 'manufacturing ai'],
    'Vibe Coding': ['vibe coding'],
}
def classify_categories(title, summary):
    text = f"{title} {summary}".lower()
    cats = set()
    for cat, kws in CATEGORY_KEYWORDS.items():
        for kw in kws:
            if re.search(r'\b' + re.escape(kw) + r'\b', text):
                cats.add(cat)
                break
    if not cats:
        cats.add('AI 일반')
    return list(cats)

def collect(limit=10, dry_run=False, output_path=None):
    feeds = load_feeds()
    seen_urls = set()
    candidates = []
    errors = []
    excluded_log = []
    cutoff = datetime.now(timezone.utc).replace(hour=0, minute=0, second=0, microsecond=0) - timedelta(days=COLLECT_DAYS)
    for feed_cfg in feeds:
        name = feed_cfg.get('name')
        url = feed_cfg.get('url')
        source_count = 0
        try:
            print(f"Fetching {name}: {url}", file=sys.stderr)
            parsed = feedparser.parse(url)
            if parsed.bozo:
                errors.append(f"{name} parse warning: {parsed.bozo_exception}")
            for entry in parsed.entries:
                if source_count >= PER_SOURCE_LIMIT:
                    break
                title = entry.get('title', '').strip()
                if not title:
                    excluded_log.append((name, title or '', '제목 없음'))
                    continue
                rel, reasons, t, summary = is_ai_related_entry(entry)
                if not rel:
                    excluded_log.append((name, title, 'AI 관련성 미충족'))
                    continue
                link = entry.get('link')
                if not link or link in seen_urls:
                    excluded_log.append((name, title, '중복 URL'))
                    continue
                seen_urls.add(link)
                pub_date_str = normalize_date(entry)
                if not pub_date_str:
                    excluded_log.append((name, title, '발행일 없음'))
                    continue
                try:
                    pub_dt = datetime.fromisoformat(pub_date_str.replace('Z','+00:00'))
                except Exception:
                    excluded_log.append((name, title, '발행일 파싱 실패'))
                    continue
                if pub_dt < cutoff:
                    excluded_log.append((name, title, f'기간 초과 {pub_dt.date()}'))
                    continue
                categories = classify_categories(title, summary)
                korean = is_korean(title)
                item = {
                    'id': 'rss-' + hashlib.sha1(link.encode()).hexdigest()[:10],
                    'title': title,
                    'date': pub_date_str,
                    'source': name,
                    'url': link,
                    'category': categories,
                    'collected_at': datetime.now(timezone.utc).isoformat(),
                    '_korean': korean,
                    '_pub_dt': pub_dt,
                    '_reasons_count': len(reasons),
                    '_reasons': reasons
                }
                candidates.append(item)
                source_count += 1
        except Exception as e:
            errors.append(f"{name} error: {e}")
    # priority sort
    def sort_key(item):
        korean = 0 if item.get('_korean') else 1
        pub_dt = item.get('_pub_dt') or datetime.min.replace(tzinfo=timezone.utc)
        reasons_cnt = item.get('_reasons_count', 0)
        return (korean, -pub_dt.timestamp(), -reasons_cnt)
    candidates.sort(key=sort_key)
    # limit per run
    max_items = limit if limit else MAX_NEW_PER_RUN
    results = candidates[:max_items]
    # strip internal fields
    for it in results:
        it.pop('_korean', None)
        it.pop('_pub_dt', None)
        it.pop('_reasons_count', None)
        it.pop('_reasons', None)
    # log summary
    print(f"[수집] 후보 {len(candidates)}건, 선택 {len(results)}건, 제외 {len(excluded_log)}건", file=sys.stderr)
    if errors:
        for e in errors:
            print(f"ERROR: {e}", file=sys.stderr)
    # output
    if dry_run:
        # dry-run 상세 출력
        out = []
        for it in results:
            out.append({
                'title': it.get('title'),
                'date': it.get('date'),
                'source': it.get('source'),
                'category': it.get('category'),
                'url': it.get('url')
            })
        print(json.dumps(out, ensure_ascii=False, indent=2))
    else:
        if output_path:
            with open(output_path, 'w', encoding='utf-8') as f:
                json.dump(results, f, ensure_ascii=False, indent=2)
            print(f"Saved {len(results)} items to {output_path}")
    return results, errors

if __name__ == '__main__':
    parser = argparse.ArgumentParser()
    parser.add_argument('--limit', type=int, default=5)
    parser.add_argument('--dry-run', action='store_true')
    parser.add_argument('--output')
    args = parser.parse_args()
    collect(limit=args.limit, dry_run=args.dry_run, output_path=args.output if not args.dry_run else None)
