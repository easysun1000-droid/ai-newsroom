import json, os
feeds = [
    {"name":"MIT Technology Review AI","url":"https://www.technologyreview.com/topic/artificial-intelligence/feed/","category":"Generative AI"},
    {"name":"TechCrunch","url":"https://techcrunch.com/feed/","category":"Industry"},
    {"name":"The Verge","url":"https://www.theverge.com/rss/index.xml","category":"AI Agent"},
    {"name":"Ars Technica","url":"https://feeds.arstechnica.com/arstechnica/index","category":"AI Ethics"}
]
path = os.path.join(os.path.dirname(__file__), '..', 'config', 'feeds.json')
with open(path, 'w', encoding='utf-8') as f:
    json.dump(feeds, f, ensure_ascii=False)
