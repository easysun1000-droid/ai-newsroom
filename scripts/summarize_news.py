#!/usr/bin/env python3
import argparse, json, os, sys
from datetime import datetime
import feedparser

from utils.ai_client import NvidiaAIClient
from utils.summarizer import NewsSummarizer

NEWS_PATH = os.path.join(os.path.dirname(__file__), '..', 'data', 'news.json')
FEEDS_CONFIG = os.path.join(os.path.dirname(__file__), '..', 'config', 'feeds.json')
PROMPT_PATH = os.path.join(os.path.dirname(__file__), '..', 'config', 'prompt_template.json')
OUTPUT_PATH = os.path.join(os.path.dirname(__file__), '..', 'data', 'summary_test.json')

def load_feeds():
    with open(FEEDS_CONFIG, 'r', encoding='utf-8') as f:
        return json.load(f)

def load_news():
    with open(NEWS_PATH, 'r', encoding='utf-8') as f:
        return json.load(f)

def get_description_for_url(url, feeds):
    for feed_cfg in feeds:
        try:
            parsed = feedparser.parse(feed_cfg.get('url'))
            for entry in parsed.entries:
                if entry.get('link') == url:
                    summary = entry.get('summary') or entry.get('description') or ''
                    return summary
        except Exception:
            continue
    return ""

def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--limit', type=int, default=3)
    parser.add_argument('--dry-run', action='store_true')
    args = parser.parse_args()

    # API 키 확인
    if not os.getenv('NVIDIA_API_KEY'):
        print("ERROR: NVIDIA_API_KEY 환경변수가 설정되지 않았습니다.")
        print("1. 프로젝트 루트에 .env 파일을 생성하세요")
        print("2. .env.example을 참고하여 NVIDIA_API_KEY를 설정하세요")
        print("3. python-dotenv가 설치되어 있는지 확인하세요")
        sys.exit(1)

    # 라이브러리 확인
    try:
        client = NvidiaAIClient()
        summarizer = NewsSummarizer(client, PROMPT_PATH)
    except Exception as e:
        print(f"클라이언트 초기화 실패: {e}")
        sys.exit(1)

    news = load_news()
    feeds = load_feeds()

    # 요약 대상 선정: summary_ko가 없는 실제 뉴스
    targets = []
    for item in news:
        if item.get('is_real') and not item.get('title_ko'):
            targets.append(item)
        if len(targets) >= args.limit:
            break

    if not targets:
        print("요약 대상 뉴스가 없습니다.")
        sys.exit(0)

    results = []
    for item in targets:
        url = item.get('url')
        description = get_description_for_url(url, feeds)
        print(f"요약 중: {item.get('title')[:60]}")
        summary_data = summarizer.summarize(
            title=item.get('title'),
            source=item.get('source'),
            date=item.get('date'),
            description=description
        )
        result = {
            "id": item.get('id'),
            "title": item.get('title'),
            "title_ko": summary_data.get('title_ko'),
            "source": item.get('source'),
            "date": item.get('date'),
            "url": url,
            "summary_ko": summary_data.get('summary_ko'),
            "keywords": summary_data.get('keywords'),
            "concepts": summary_data.get('concepts'),
            "whyImportant": summary_data.get('whyImportant'),
            "summary_status": summary_data.get('summary_status'),
            "summary_generated_at": summary_data.get('summary_generated_at'),
            "summary_model": summary_data.get('summary_model')
        }
        results.append(result)

    # 결과 저장
    out_data = {
        "generated_at": datetime.now().isoformat(),
        "model": client.model,
        "count": len(results),
        "items": results
    }

    if args.dry_run:
        print(json.dumps(out_data, ensure_ascii=False, indent=2))
    else:
        with open(OUTPUT_PATH, 'w', encoding='utf-8') as f:
            json.dump(out_data, f, ensure_ascii=False, indent=2)
        print(f"요약 결과 저장: {OUTPUT_PATH} | {len(results)}건")

if __name__ == '__main__':
    main()