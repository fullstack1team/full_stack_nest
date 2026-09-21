import { Injectable } from "@nestjs/common";
import { PrismaService } from "src/service/prisma/prisma.service";


@Injectable()
export class PostLikeRepository {
  constructor(private readonly prisma:PrismaService){;}

  // 좋아요 찾기
  async findPostLike(memberId: number, postId: number){
    return this.prisma.postLike.findUnique({
      where: {
        memberId_postId: {
          memberId,
          postId
        }
      }
    })
  }

  // 해당 유저가 누른 총 좋아요 개수 조회 (뱃지 검사용)
  async countByMemberId(memberId: number): Promise<number> {
    return this.prisma.postLike.count({
      where: { memberId },
    });
  }
  
  // 좋아요 생성
  async createPostLike(memberId: number, postId: number) {
    return this.prisma.postLike.create({
      data: {
        memberId,
        postId,
      }
    })
  }

  // 좋아요 삭제
  async deletePostLike(memberId: number, postId: number) {
    return this.prisma.postLike.delete({
      where: {
        memberId_postId: {
          memberId,
          postId,
        }
      }
    })
  }

}