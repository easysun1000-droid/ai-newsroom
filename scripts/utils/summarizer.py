import json
import os
from datetime import datetime

class NewsSummarizer:
    def __init__(self, ai_client, prompt_template_path):
        self.ai_client = ai_client
        with open(prompt_template_path, 'r', encoding='utf-8') as f:
            tmpl = json.load(f)
        self.system_prompt = tmpl.get("system", "")
        self.user_template = tmpl.get("user_template", "")

    def build_prompt(self, title, source, date, description):
        return self.user_template.format(
            title=title,
            source=source,
            date=date or "",
            description=description or ""
        )

    def summarize(self, title, source, date, description):
        if not title or not description or len(description.strip()) < 20:
            return {
                "title_ko": title,
                "summary_ko": ["정보 부족"],
                "keywords": [],
                "concepts": [],
                "whyImportant": "정보 부족으로 요약 불가",
                "summary_status": "pending",
                "summary_generated_at": None,
                "summary_model": self.ai_client.model
            }

        user_prompt = self.build_prompt(title, source, date, description)
        try:
            raw = self.ai_client.chat_completion(self.system_prompt, user_prompt)
            # Clean possible markdown fences
            cleaned = raw.strip()
            if cleaned.startswith("```"):
                cleaned = "\n".join([line for line in cleaned.splitlines() if not line.strip().startswith("```")])
            # Extract first JSON object
            start = cleaned.find("{")
            end = cleaned.rfind("}")
            if start != -1 and end != -1 and end > start:
                cleaned = cleaned[start:end+1]
            data = json.loads(cleaned)
            data["summary_status"] = "generated"
            data["summary_generated_at"] = datetime.now().isoformat()
            data["summary_model"] = self.ai_client.model
            return data
        except Exception as e:
            return {
                "title_ko": title,
                "summary_ko": ["요약 실패"],
                "keywords": [],
                "concepts": [],
                "whyImportant": f"요약 생성 오류: {e}",
                "summary_status": "error",
                "summary_generated_at": datetime.now().isoformat(),
                "summary_model": self.ai_client.model
            }