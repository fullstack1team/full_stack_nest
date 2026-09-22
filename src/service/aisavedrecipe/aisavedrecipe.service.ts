import { Injectable } from '@nestjs/common';
import {
  AiSavedRecipeListResponseDTO,
  AiSavedRecipeResponseDTO,
  CreateAiSavedRecipeWithMemberDTO,
} from 'src/domain/aisavedrecipe/dto/aisavedrecipe.dto';
import AiSavedRecipeException from 'src/exception/exception.aisavedrecipe';
import { AiSavedRecipeRepository } from 'src/repository/aisavedrecipe/aisavedrecipe.repository';
import { PrismaService } from 'src/service/prisma/prisma.service'; 
import { Badge } from '@prisma/client';

@Injectable()
export class AisavedrecipeService {
  constructor(
    private readonly aisavedrecipeRepository: AiSavedRecipeRepository,
    private readonly prisma: PrismaService, // 💡 뱃지 검사 및 트랜잭션용 추가
  ) {}

  // 1. 레시피 저장 (수정)
  async createAiSavedRecipe(
    createAiSavedRecipeDTO: CreateAiSavedRecipeWithMemberDTO,
  ) {
    // 레시피 저장
    const savedRecipe = await this.aisavedrecipeRepository.save(
      createAiSavedRecipeDTO,
    );

    // 💡 레시피 스크랩(저장) 뱃지 해금 조건 검사 실행
    const unlockedBadges = await this.checkRecipeScrapBadges(
      createAiSavedRecipeDTO.memberId,
    );

    return {
      id: savedRecipe.id,
      message: 'AI 저장 레시피 생성 완료',
      unlockedBadges, // 💡 신규 해금된 뱃지 목록 반환 (프론트 팝업 표시용)
    };
  }

  // 2. [신규 추가] 레시피 스크랩 뱃지 해금 검사 메서드
  private async checkRecipeScrapBadges(memberId: number) {
    // ① 이 유저가 저장한 AiSavedRecipe의 총 개수 조회 (schema 변경 없이 count 조회)
    const scrapCount = await this.prisma.aiSavedRecipe.count({
      where: { memberId },
    });

    // ② RECIPE_SCRAP_COUNT 조건 중 현재 저장 횟수 이하인 뱃지 목록 조회 (예: 1개, 30개)
    const eligibleBadges = await this.prisma.badge.findMany({
      where: {
        badgeConditionType: 'RECIPE_SCRAP_COUNT',
        badgeConditionValue: { lte: scrapCount },
      },
    });

    const newlyUnlockedBadges: Badge[] = [];

    // ③ 미획득 뱃지 확인 후 지급 및 XP 추가
    for (const badge of eligibleBadges) {
      const alreadyUnlocked = await this.prisma.userBadge.findUnique({
        where: {
          memberId_badgeId: {
            memberId,
            badgeId: badge.id,
          },
        },
      });

      // 아직 해금되지 않은 뱃지인 경우
      if (!alreadyUnlocked) {
        await this.prisma.$transaction([
          // 뱃지 부여
          this.prisma.userBadge.create({
            data: {
              memberId,
              badgeId: badge.id,
            },
          }),
          // 유저 XP 보상 지급
          this.prisma.member.update({
            where: { id: memberId },
            data: { memberXp: { increment: badge.badgeRewardXp } },
          }),
        ]);

        newlyUnlockedBadges.push(badge);
      }
    }

    return newlyUnlockedBadges;
  }

  // 회원별 목록 전체 조회 (기존 동일)
  async getAiSavedRecipeList(
    memberId: number,
  ): Promise<AiSavedRecipeListResponseDTO[]> {
    const savedRecipes =
      await this.aisavedrecipeRepository.findAllByMemberId(memberId);

    return savedRecipes.map((recipe) => ({
      id: recipe.id,
      title: recipe.title,
      description: recipe.description ?? undefined,
      imageUrl: recipe.imageUrl ?? undefined,
      cookTime: recipe.cookTime ?? undefined,
      difficulty: recipe.difficulty ?? undefined,
      category: recipe.category ?? undefined,
      xp: recipe.xp,

      ingredients: recipe.ingredients as {
        main: string[];
        sub: string[];
      },

      steps: recipe.steps as string[],

      missingIngredients:
        (recipe.missingIngredients as string[] | null) ?? undefined,

      createdAt: recipe.createdAt,
    }));
  }

  // 상세 조회 (기존 동일)
  async getAiSavedRecipeDetail(
    id: number,
    memberId: number,
  ): Promise<AiSavedRecipeResponseDTO> {
    const savedRecipe = await this.aisavedrecipeRepository.findByIdAndMemberId(
      id,
      memberId,
    );

    if (!savedRecipe) {
      throw new AiSavedRecipeException('저장된 AI 레시피가 없습니다.');
    }
    return {
      id: savedRecipe.id,
      memberId: savedRecipe.memberId,
      title: savedRecipe.title,
      description: savedRecipe.description ?? undefined,
      imageUrl: savedRecipe.imageUrl ?? undefined,
      cookTime: savedRecipe.cookTime ?? undefined,
      difficulty: savedRecipe.difficulty ?? undefined,
      category: savedRecipe.category ?? undefined,
      xp: savedRecipe.xp,
      ingredients: savedRecipe.ingredients as {
        main: string[];
        sub: string[];
      },
      steps: savedRecipe.steps as string[],
      missingIngredients:
        (savedRecipe.missingIngredients as string[] | null) ?? undefined,
      createdAt: savedRecipe.createdAt,
    };
  }

  // 삭제 (기존 동일)
  async deleteAiSavedRecipe(id: number, memberId: number) {
    const savedRecipe = await this.aisavedrecipeRepository.findByIdAndMemberId(
      id,
      memberId,
    );

    if (!savedRecipe) {
      throw new AiSavedRecipeException('삭제할 AI 저장 레시피가 없습니다.');
    }

    await this.aisavedrecipeRepository.remove(id, memberId);

    return {
      message: 'AI 저장 레시피 삭제 완료',
    };
  }
}