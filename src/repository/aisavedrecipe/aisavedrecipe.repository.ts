import { Injectable } from "@nestjs/common";
import { CreateAiSavedRecipeWithMemberDTO } from "src/domain/aisavedrecipe/dto/aisavedrecipe.dto";
import { PrismaService } from "src/service/prisma/prisma.service";

@Injectable()
export class AiSavedRecipeRepository {
  constructor(private readonly prisma: PrismaService) {} // 오타 수정 (중괄호 뒤의 세미콜론 제거)

  // 저장
  async save(createAiSavedRecipeDTO: CreateAiSavedRecipeWithMemberDTO) {
    return await this.prisma.aiSavedRecipe.create({
      data: {
        memberId: createAiSavedRecipeDTO.memberId,
        title: createAiSavedRecipeDTO.title,
        description: createAiSavedRecipeDTO.description,
        imageUrl: createAiSavedRecipeDTO.imageUrl,
        cookTime: createAiSavedRecipeDTO.cookTime,
        difficulty: createAiSavedRecipeDTO.difficulty,
        category: createAiSavedRecipeDTO.category,
        xp: createAiSavedRecipeDTO.xp,
        ingredients: createAiSavedRecipeDTO.ingredients,
        steps: createAiSavedRecipeDTO.steps,
        missingIngredients: createAiSavedRecipeDTO.missingIngredients,
      },
    });
  }

  // 💡 [신규 추가] 해당 유저가 저장한 전체 레시피 개수 조회
  async countByMemberId(memberId: number): Promise<number> {
    return await this.prisma.aiSavedRecipe.count({
      where: { memberId },
    });
  }

  // 회원별 목록 전체 조회
  async findAllByMemberId(memberId: number) {
    return await this.prisma.aiSavedRecipe.findMany({
      where: { memberId },
      orderBy: { createdAt: 'desc' },
    });
  }

  // 상세 조회
  async findByIdAndMemberId(id: number, memberId: number) {
    return await this.prisma.aiSavedRecipe.findFirst({
      where: { 
        id,
        memberId,
      },
    });
  }

  // 삭제
  async remove(id: number, memberId: number) {
    return await this.prisma.aiSavedRecipe.deleteMany({
      where: { 
        id,
        memberId,
      },
    });
  }
}