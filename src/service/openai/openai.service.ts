import { Injectable } from '@nestjs/common';
import OpenAI from 'openai';

@Injectable()
export class OpenaiService {
  private openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
  });

  // =========================
  // 레시피 생성 (유지)
  // =========================
  async getRecipe(
    ingredients: string[],
    excludedTitles: string[] = [],
  ): Promise<string> {
    const excludedRecipeText =
      excludedTitles.length > 0
        ? excludedTitles.map((title) => `- ${title}`).join('\n')
        : '- 없음';

    const prompt = `
다음 재료를 반드시 모두 포함해서 하나의 완성된 요리를 만들어라:

${ingredients.map((i) => `- ${i}`).join('\n')}

이 사용자가 이전에 추천받은 요리 목록:
${excludedRecipeText}

🔥 중복 방지 규칙:

1. 위 "이전에 추천받은 요리 목록"에 있는 요리와 동일한 요리를 절대 생성하지 마라.
2. 띄어쓰기나 표현만 조금 바꾼 사실상 동일한 요리도 생성하지 마라.
3. 같은 재료를 사용하더라도 기존 요리와 다른 조리법이나 다른 형태의 새로운 요리를 만들어라.
4. 이전 추천 목록에 없는 새로운 요리 이름을 만들어라.

🔥 매우 중요 규칙:

1. 위 재료는 반드시 모두 포함해야 한다 (절대 빠뜨리지 마라)
2. 추가 재료를 반드시 3개 이상 생성해야 한다
3. 추가 재료는 실제 요리에 자연스럽게 사용되는 것만 허용 (소금, 후추, 간장, 마늘, 양파 등)
4. 각 재료는 반드시 아래 형식으로 작성:

   { "name": "재료명", "category": "육류/해산물/채소/기타" }

5. category 규칙:
   - 육류 / 해산물 / 채소 → 주재료
   - 그 외 → "기타"

6. 절대 문자열 배열 금지
   → 반드시 객체 배열로 반환해야 한다

7. 레시피는 반드시 단계별로 상세하게 작성 (1. 2. 3. 형식)

8. cookTimeMin은 실제 예상 조리시간을 분 단위 정수로 작성

9. difficulty는 반드시 "쉬움", "보통", "어려움" 중 하나

10. category는 반드시 "한식", "중식", "일식", "양식", "기타" 중 하나

---

반드시 아래 JSON 형식으로만 응답:

{
  "title": "요리 이름",
  "ingredients": [
    { "name": "연어", "category": "해산물" },
    { "name": "시금치", "category": "채소" },
    { "name": "마늘", "category": "채소" },
    { "name": "소금", "category": "기타" },
    { "name": "후추", "category": "기타" },
    { "name": "간장", "category": "기타" }
  ],
  "recipe": "1. ... 2. ... 3. ...",
  "cookTimeMin": 20,
  "difficulty": "보통",
  "category": "한식"
}
`;

    const response = await this.openai.chat.completions.create({
      model: 'gpt-4.1-mini',
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.3,
    });

    const content = response.choices[0].message.content;
    const jsonMatch = content?.match(/\{[\s\S]*\}/);

    return jsonMatch ? jsonMatch[0] : content || '';
  }

  // =========================
  // Step 키워드 생성 (완전 개선)
  // =========================
  async getStepKeywords(steps: string[]): Promise<string[]> {
    const prompt = `
다음 요리 단계들을 보고 각각에 맞는 "음식 이미지 검색 키워드"를 만들어줘.

🔥 매우 중요:
- 반드시 영어
- 2~4 단어
- 음식 + 행동 포함 (예: "frying pork", "cutting onion", "kimchi fried rice")
- 결과 음식이나 재료가 반드시 포함되어야 함 (핵심!)
- 절대 일반 단어 금지 (예: cooking, food ❌)
- 서로 다른 키워드로 생성

예시:
["frying pork belly", "chopping onion", "kimchi fried rice", "plating dish"]

steps:
${steps.map((s, i) => `${i + 1}. ${s}`).join('\n')}

반드시 JSON 배열로만 답변:
["keyword1", "keyword2", "keyword3"]
`;

    const response = await this.openai.chat.completions.create({
      model: 'gpt-4.1-mini',
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.3, // 안정성 + 다양성 균형
    });

    const content = response.choices[0].message.content;
    const match = content?.match(/\[[\s\S]*\]/);

    let keywords: string[] = [];

    try {
      keywords = match ? JSON.parse(match[0]) : [];
    } catch {
      keywords = [];
    }

    // =========================
    // 중복 제거
    // =========================
    const uniqueKeywords = Array.from(new Set(keywords));

    // =========================
    // fallback 개선 (중요)
    // =========================
    const fallbackKeywords = [
      'korean food cooking',
      'stir fry korean food',
      'fried rice cooking',
      'korean dish plating',
      'home cooking meal',
    ];

    let i = 0;
    while (uniqueKeywords.length < steps.length) {
      uniqueKeywords.push(fallbackKeywords[i % fallbackKeywords.length]);
      i++;
    }

    // =========================
    // 길이 맞추기
    // =========================
    return uniqueKeywords.slice(0, steps.length);
  }
}
