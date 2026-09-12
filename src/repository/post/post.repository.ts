import { Injectable } from '@nestjs/common';
import { PostCreateDTO, PostUpdatedDTO } from 'src/domain/post/dto/post.dto';
import { PrismaService } from 'src/service/prisma/prisma.service';
import { Prisma } from '@prisma/client';

export type PostWithLikeInfo = Prisma.PostGetPayload<{
  include: {
    member: {
      select: {
        id: true;
        memberName: true;
      };
    };
    recipe: {
      select: {
        id: true;
        recipeTitle: true;
      };
    };
    postImage: {
      orderBy: {
        imageOrder: 'asc';
      };
    };
    postLike: {
      select: {
        memberId: true;
      };
    };
    comment: {
      include: {
        member: {
          select: {
            id: true;
            memberName: true;
          };
        };
      };
    };
    _count: {
      select: {
        postLike: true;
      };
    };
  };
}>;

// DB 접근 담당
@Injectable()
export class PostRepository {
  // Prisma 접근
  constructor(private readonly prisma: PrismaService) {}

  // 게시글 목록 전체 조회
  async findPosts(): Promise<PostWithLikeInfo[]> {
    const foundPosts = await this.prisma.post.findMany({
      include: {
        member: {
          select: {
            id: true,
            memberName: true,
          },
        },
        recipe: {
          select: {
            id: true,
            recipeTitle: true,
          },
        },
        postImage: {
          orderBy: {
            imageOrder: 'asc',
          },
        },
        postIngredientUsed: {
          include: {
            ingredient: true,
          },
        },
        postLike: {
          select: {
            memberId: true,
          },
        },
        comment: {
          include: {
            member: {
              select: {
                id: true,
                memberName: true,
              },
            },
          },
        },
        _count: {
          select: {
            postLike: true,
          },
        },
      },
    });

    return foundPosts;
  }

  // 게시글 단일 조회
  async findPostById(id: number): Promise<PostWithLikeInfo | null> {
    const foundPost = await this.prisma.post.findUnique({
      where: { id },
      include: {
        member: {
          select: {
            id: true,
            memberName: true,
          },
        },
        recipe: {
          select: {
            id: true,
            recipeTitle: true,
          },
        },
        postImage: {
          orderBy: {
            imageOrder: 'asc',
          },
        },
        postIngredientUsed: {
          include: {
            ingredient: true,
          },
        },
        postLike: {
          select: {
            memberId: true,
          },
        },
        comment: {
          include: {
            member: {
              select: {
                id: true,
                memberName: true,
              },
            },
          },
        },
        _count: {
          select: {
            postLike: true,
          },
        },
      },
    });

    return foundPost;
  }

  // 게시글 생성
  async save(postCreateDTO: PostCreateDTO, earnedXp: number) {
    const { ingredientNames, ...postData } = postCreateDTO;

    const cleanedIngredientNames = [
      ...new Set(
        (ingredientNames ?? []).map((name) => name.trim()).filter(Boolean),
      ),
    ];

    return await this.prisma.$transaction(async (tx) => {
      const ingredients: { id: number }[] = [];

      for (const name of cleanedIngredientNames) {
        let found = await tx.ingredient.findFirst({
          where: { ingredientName: name },
          select: { id: true },
        });

        if (!found) {
          found = await tx.ingredient.create({
            data: {
              ingredientName: name,
              ingredientCategory: '기타',
            },
            select: { id: true },
          });
        }

        ingredients.push(found);
      }

      // 게시글 생성
      const createdPost = await tx.post.create({
        data: {
          ...postData,
          postXp: earnedXp,
          postIngredientUsed: ingredients.length
            ? {
                create: ingredients.map((ingredient) => ({
                  ingredientId: ingredient.id,
                })),
              }
            : undefined,
        },
      });

      // 요리 완료 횟수 + 게시글 작성 횟수 +1
      await tx.member.update({
        where: {
          id: postCreateDTO.memberId,
        },
        data: {
          cookCount: {
            increment: 1,
          },
          postCount: {
            increment: 1,
          },
        },
      });

      return createdPost;
    });
  }

  // 게시글 수정
  async modify(id: number, postUpdatedDTO: PostUpdatedDTO): Promise<void> {
    const { ingredientNames, ...postData } = postUpdatedDTO;

    await this.prisma.$transaction(async (tx) => {
      const ingredients: { id: number }[] = [];

      if (ingredientNames) {
        for (const name of ingredientNames) {
          const trimmedName = name.trim();

          if (!trimmedName) continue;

          let found = await tx.ingredient.findFirst({
            where: { ingredientName: trimmedName },
            select: { id: true },
          });

          if (!found) {
            found = await tx.ingredient.create({
              data: {
                ingredientName: trimmedName,
                ingredientCategory: '기타',
              },
              select: { id: true },
            });
          }

          ingredients.push(found);
        }

        await tx.postIngredientUsed.deleteMany({
          where: { postId: id },
        });
      }

      await tx.post.update({
        where: { id },
        data: {
          ...postData,
          updatedAt: new Date(),

          ...(ingredientNames
            ? {
                postIngredientUsed: {
                  create: ingredients.map((ingredient) => ({
                    ingredientId: ingredient.id,
                  })),
                },
              }
            : {}),
        },
      });
    });
  }

  // 게시글 삭제
  async remove(id: number): Promise<void> {
    await this.prisma.post.delete({
      where: { id },
    });
  }
}
