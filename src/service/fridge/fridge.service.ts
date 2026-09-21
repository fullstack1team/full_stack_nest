import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import {
  CreateFridgeDto,
  UpdateFridgeDto,
} from 'src/domain/fridge/dto/fridge.dto';
import { OpenaiService } from '../openai/openai.service';
import { ImageService } from '../image/image.service';
import { BadgeService } from '../badge/badge.service'; // 💡 BadgeService 임포트

@Injectable()
export class FridgeService {
  constructor(
    private prisma: PrismaService,
    private readonly openaiService: OpenaiService,
    private readonly imageService: ImageService,
    private readonly badgeService: BadgeService, // 💡 BadgeService 주입
  ) {}

  // =========================
  // 🔴 테스트 유저 생성을 위한 함수 추가
  // =========================
  async ensureMember(memberId: number) {
    let member = await this.prisma.member.findUnique({
      where: { id: memberId },
    });

    if (!member) {
      member = await this.prisma.member.create({
        data: {
          id: memberId,
          memberEmail: `test${memberId}@test.com`,
          memberName: `테스트유저${memberId}`,
        },
      });
    }

    return member;
  }

  // =========================
  // 생성 (재료 추가 + ingredientCount 증가 & 뱃지 해금 체크)
  // =========================
  async create(dto: CreateFridgeDto) {
    const { memberId, ingredientName, category, quantity, unit, expireDate } =
      dto;

    // 🔴 테스트 유저 JWT 완성되면 밑에 한 줄 삭제
    await this.ensureMember(memberId);

    let ingredient = await this.prisma.ingredient.findFirst({
      where: { ingredientName },
    });

    if (!ingredient) {
      ingredient = await this.prisma.ingredient.create({
        data: {
          ingredientName,
          ingredientCategory: category || '기타',
        },
      });
    }

    const parsedDate = expireDate ? new Date(expireDate) : null;

    const existing = await this.prisma.myFridge.findFirst({
      where: {
        memberId,
        ingredientId: ingredient.id,
        expireDate: parsedDate,
      },
    });

    let savedItem;

    if (existing) {
      savedItem = await this.prisma.myFridge.update({
        where: { id: existing.id },
        data: {
          fridgeQuantity: existing.fridgeQuantity + quantity,
        },
      });
    } else {
      savedItem = await this.prisma.myFridge.create({
        data: {
          memberId,
          ingredientId: ingredient.id,
          fridgeQuantity: quantity,
          unit: unit || 'ea',
          expireDate: parsedDate,
        },
      });
    }

    // 💡 [추가] 재료 등록 시 member.ingredientCount 1 증가
    await this.prisma.member.update({
      where: { id: memberId },
      data: {
        ingredientCount: { increment: 1 },
      },
    });

    // 💡 [추가] 뱃지 조건 충족 여부 바로 검사 및 해금 처리
    const unlockedBadges = await this.badgeService.checkAndAwardBadge(
      memberId, 
      'INGREDIENT_COUNT'
    ) || [];

    return {
      ...savedItem,
      unlockedBadges, 
    };
  }

  // =========================
  // 조회
  // =========================
  async findAll(memberId: number) {
    // 🔴 테스트 유저 JWT 완성되면 밑에 한 줄 삭제
    await this.ensureMember(memberId);

    const data = await this.prisma.myFridge.findMany({
      where: { memberId },
      include: {
        ingredient: true,
      },
    });

    const grouped = data.reduce((acc, item) => {
      const key = item.ingredientId;

      if (!acc[key]) {
        acc[key] = {
          ingredientId: item.ingredientId,
          ingredientName: item.ingredient.ingredientName,
          category: item.ingredient.ingredientCategory,
          unit: item.unit,
          totalQuantity: 0,
          items: [],
        };
      }

      acc[key].totalQuantity += item.fridgeQuantity;

      acc[key].items.push({
        id: item.id,
        quantity: item.fridgeQuantity,
        expireDate: item.expireDate,
      });

      return acc;
    }, {} as any);

    return Object.values(grouped);
  }

  // =========================
  // 수정
  // =========================
  async update(id: number, memberId: number, dto: UpdateFridgeDto) {
    const item = await this.prisma.myFridge.findUnique({
      where: { id },
    });

    if (!item) {
      throw new Error('해당 재료가 존재하지 않습니다.');
    }

    if (item.memberId !== memberId) {
      throw new Error('본인의 재료만 수정할 수 있습니다.');
    }

    const { quantity, unit, expireDate } = dto;

    return await this.prisma.myFridge.update({
      where: { id },
      data: {
        ...(quantity !== undefined && { fridgeQuantity: quantity }),
        ...(unit && { unit }),
        ...(expireDate && { expireDate: new Date(expireDate) }),
      },
    });
  }

  // =========================
  // 삭제
  // =========================
  async remove(id: number, memberId: number) {
    const item = await this.prisma.myFridge.findUnique({
      where: { id },
    });

    if (!item) {
      throw new Error('삭제할 재료가 없습니다.');
    }

    if (item.memberId !== memberId) {
      throw new Error('본인의 재료만 삭제할 수 있습니다.');
    }

    return await this.prisma.myFridge.delete({
      where: { id },
    });
  }

  // =========================
  // 추천 (최종 완성)
  // =========================
  async recommendRecipe(memberId: number) {
    const getRandomIngredients = (items: any[], count: number) => {
      const shuffled = [...items].sort(() => Math.random() - 0.5);
      return shuffled.slice(0, count);
    };

    const fridgeItems = await this.prisma.myFridge.findMany({
      where: { memberId },
      include: { ingredient: true },
    });

    // 냉장고에 재료 아무것도 없을 때 검증
    if (fridgeItems.length === 0) {
      throw new NotFoundException('냉장고에 등록된 재료가 없습니다.');
    }

    // 주재료만 필터링
    const mainCandidates = fridgeItems.filter((item) =>
      ['육류', '해산물', '채소'].includes(item.ingredient.ingredientCategory),
    );

    // 육류·해산물·채소만 주재료 후보로 골라서 랜덤 3개를 선택하기 때문
    if (mainCandidates.length === 0) {
      throw new NotFoundException('추천에 사용할 수 있는 주재료가 없습니다.');
    }

    // 랜덤 3개 선택
    const randomItems = getRandomIngredients(
      mainCandidates,
      Math.min(3, mainCandidates.length),
    );

    // 선택된 것만 사용
    const ingredients = randomItems.map((item) => ({
      name: item.ingredient.ingredientName,
      category: item.ingredient.ingredientCategory,
    }));

    // =========================
    // 1. OpenAI 호출
    // =========================

    // =========================
    // 1. 회원별 이전 추천 이력 조회
    // =========================
    const recommendationHistory =
      await this.prisma.recipeRecommendationHistory.findMany({
        where: {
          memberId,
        },
        select: {
          recipeTitle: true,
          normalizedTitle: true,
        },
      });

    const excludedTitles = recommendationHistory.map(
      (history) => history.recipeTitle,
    );

    const normalizeRecipeTitle = (title: string) =>
      String(title || '')
        .replace(/\s/g, '')
        .toLowerCase();

    const existingTitleSet = new Set(
      recommendationHistory.map((history) => history.normalizedTitle),
    );

    // =========================
    // 2. OpenAI 호출 + 중복 검사
    // =========================
    let aiResponse = '';
    let parsed: any = null;

    for (let attempt = 0; attempt < 3; attempt++) {
      aiResponse = await this.openaiService.getRecipe(
        ingredients.map((i) => i.name),
        excludedTitles,
      );

      if (!aiResponse) {
        continue;
      }

      try {
        parsed = JSON.parse(aiResponse);
      } catch (e) {
        console.error('레시피 JSON 파싱 실패:', e);
        parsed = null;
        continue;
      }

      const generatedTitle = normalizeRecipeTitle(parsed?.title);

      // 제목이 있고, 이 회원이 이전에 추천받지 않은 레시피면 통과
      if (generatedTitle && !existingTitleSet.has(generatedTitle)) {
        break;
      }

      console.log(
        `⚠️ 회원 ${memberId} 중복 추천 감지: ${parsed?.title} (${attempt + 1}/3)`,
      );

      parsed = null;
    }

    if (!parsed) {
      throw new Error('중복되지 않는 새로운 추천 레시피 생성에 실패했습니다.');
    }

    const recipeText = parsed.recipe || '';
    let ingredientList: any[] = [];

    // =========================
    // 3. ingredients 파싱 (안전 처리)
    // =========================
    if (parsed.ingredients && parsed.ingredients.length > 0) {
      ingredientList = parsed.ingredients.map((item: any) => {
        if (typeof item === 'string') {
          return {
            name: item,
            category: '기타',
          };
        }

        return {
          name: typeof item.name === 'string' ? item.name : '',
          category: item.category || '기타',
        };
      });
    } else {
      ingredientList = ingredients;
    }

    // =========================
    // 🔥 4. GPT 누락 재료 보정 (최종 안정화)
    // =========================
    ingredients.forEach((i) => {
      const exists = ingredientList.some((item) => {
        const itemName = typeof item.name === 'string' ? item.name : '';

        const iName = typeof i.name === 'string' ? i.name : '';

        return itemName.includes(iName) || iName.includes(itemName);
      });

      if (!exists) {
        ingredientList.push(i);
      }
    });

    const normalizeIngredientName = (name: string) =>
      String(name || '')
        .replace(/\s/g, '')
        .toLowerCase();

    const fridgeIngredientNames = fridgeItems.map((item) =>
      normalizeIngredientName(item.ingredient.ingredientName),
    );

    const missingIngredients = ingredientList
      .filter((item) => {
        const recipeIngredientName = normalizeIngredientName(item.name);

        return !fridgeIngredientNames.some(
          (fridgeName) =>
            fridgeName.includes(recipeIngredientName) ||
            recipeIngredientName.includes(fridgeName),
        );
      })
      .map((item) => item.name);

    // =========================
    // 5. 대표 이미지
    // =========================
    const image = await this.imageService.getFoodImage(
      'korean food ' + parsed.title,
    );
    console.log('4️⃣ 대표 이미지 생성 완료');

    // =========================
    // 6. Step 분리
    // =========================
    const steps = recipeText.split(/\d+\.\s/).filter((s) => s.trim() !== '');

    const rawCookTime = Number(parsed.cookTimeMin);

    const cookTimeMin =
      Number.isFinite(rawCookTime) && rawCookTime > 0
        ? Math.round(rawCookTime)
        : Math.max(10, steps.length * 5);

    const aiDifficultyScoreMap: Record<string, number> = {
      쉬움: 0,
      보통: 1,
      어려움: 2,
    };

    const aiDifficultyScore =
      aiDifficultyScoreMap[String(parsed.difficulty || '').trim()] ?? 0;

    /*
     * 레시피 복잡도 계산
     *
     * 조리 단계가 7개 이상이면 1점
     * 재료가 7개 이상이면 1점
     * 조리시간이 25분 이상이면 1점
     */
    const complexityScore =
      (steps.length >= 7 ? 1 : 0) +
      (ingredientList.length >= 7 ? 1 : 0) +
      (cookTimeMin >= 25 ? 1 : 0);

    /*
     * 0점: 쉬움
     * 1~2점: 보통
     * 3점: 어려움
     */
    const calculatedDifficultyScore =
      complexityScore >= 3 ? 2 : complexityScore >= 1 ? 1 : 0;

    /*
     * AI가 판단한 난이도와 실제 복잡도 중
     * 더 높은 쪽을 최종 난이도로 사용
     */
    const finalDifficultyScore = Math.max(
      aiDifficultyScore,
      calculatedDifficultyScore,
    );

    const difficulty =
      finalDifficultyScore === 2
        ? '어려움'
        : finalDifficultyScore === 1
          ? '보통'
          : '쉬움';

    const allowedCategories = ['한식', '중식', '일식', '양식', '기타'];

    const category = allowedCategories.includes(parsed.category)
      ? parsed.category
      : '기타';

    // =========================
    // 7. GPT step 키워드 생성
    // =========================
    const keywords = await this.openaiService.getStepKeywords(steps);

    // =========================
    // 8. step 이미지 생성
    // =========================
    const stepImages = await Promise.all(
      keywords.map((keyword) =>
        this.imageService.getFoodImage(`${keyword} food`),
      ),
    );

    // =========================
    // 9. fallback 처리
    // =========================
    while (stepImages.length < steps.length) {
      stepImages.push(image);
    }

    // =========================
    // 10. 최종 반환
    // =========================

    const getRandomXp = (min: number, max: number) => {
      return Math.floor(Math.random() * (max - min + 1)) + min;
    };

    const recipeXp =
      difficulty === '쉬움'
        ? getRandomXp(100, 199)
        : difficulty === '보통'
          ? getRandomXp(200, 299)
          : getRandomXp(300, 500);

    const savedRecipe = await this.prisma.recipe.create({
      data: {
        recipeTitle: parsed.title,
        recipeDesc: recipeText.slice(0, 190),
        recipeImageUrl: image,
        cookTimeMin,
        recipeDifficulty: difficulty,
        recipeXp,
        recipeCategory: category,
      },
    });

    await this.prisma.recipeRecommendationHistory.create({
      data: {
        memberId,
        recipeId: savedRecipe.id,
        recipeTitle: savedRecipe.recipeTitle,
        normalizedTitle: normalizeRecipeTitle(savedRecipe.recipeTitle),
      },
    });

    console.log('✅ 추천 API 최종 반환 직전');

    return {
      id: savedRecipe.id,
      recipeId: savedRecipe.id,

      title: parsed.title,
      ingredients: ingredientList,
      recipe: recipeText,
      image,
      steps,
      stepImages,

      cookTimeMin,
      cookTime: cookTimeMin,
      difficulty,
      level: difficulty,
      category,
      xp: recipeXp,
      missingIngredients,
    };
  }
}
