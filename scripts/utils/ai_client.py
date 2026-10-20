import os
from dotenv import load_dotenv
from openai import OpenAI

load_dotenv()

class NvidiaAIClient:
    def __init__(self):
        api_key = os.getenv("NVIDIA_API_KEY")
        model = os.getenv("NVIDIA_MODEL_ID", "meta/muse-glimmer-30b")
        base_url = os.getenv("NVIDIA_BASE_URL", "https://integrate.api.nvidia.com/v1")

        if not api_key:
            raise EnvironmentError("NVIDIA_API_KEY 환경변수가 설정되지 않았습니다. .env 파일을 확인하세요.")

        self.client = OpenAI(api_key=api_key, base_url=base_url)
        self.model = model

    def chat_completion(self, system_prompt, user_prompt, temperature=0.3, max_tokens=2048):
        try:
            response = self.client.chat.completions.create(
                model=self.model,
                messages=[
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": user_prompt}
                ],
                temperature=temperature,
                max_tokens=max_tokens
            )
            content = response.choices[0].message.content
            return content if content else ""
        except Exception as e:
            raise RuntimeError(f"NVIDIA API 호출 실패: {e}")