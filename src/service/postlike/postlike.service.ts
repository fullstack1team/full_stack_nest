import { Injectable } from '@nestjs/common';
import { PostLikeDTO, PostLikeServiceDTO } from 'src/domain/postlike/dto/postlike.dto';
import PostLikeException from 'src/exception/exception.postlike';
import { PostLikeRepository } from 'src/repository/postlike/postlike.repository';
import { PrismaService } from 'src/service/prisma/prisma.service'; 
import { Badge } from '@prisma/client'; 

@Injectable()
export class PostlikeService {
  constructor(
    private readonly postlikeRepository: PostLikeRepository,
    private readonly prisma: PrismaService, 
  ) {}

  // 좋아요 생성
  async createPostLike(postLikeCreateDTO: PostLikeServiceDTO) {
    const { memberId, postId } = postLikeCreateDTO;

    const existingLike = await this.postlikeRepository.findPostLike(memberId, postId);

    if (existingLike) {
      throw new PostLikeException('이미 좋아요를 눌렀습니다.');
    }

    // 좋아요 DB 생성
    const newLike = await this.postlikeRepository.createPostLike(memberId, postId);

    // 좋아요 뱃지 해금 조건 검사
    const unlockedBadges = await this.checkLikeBadges(memberId);

    return {
      message: '좋아요 생성 완료',
      like: newLike,
      unlockedBadges, // 새로 해금된 뱃지 목록 전달
    };
  }

  // 좋아요 뱃지 해금 검사 메서드
  private async checkLikeBadges(memberId: number): Promise<Badge[]> {
    // ① 해당 유저가 누른 총 좋아요 개수 조회
    const likeCount = await this.prisma.postLike.count({
      where: { memberId },
    });

    // ② LIKE_COUNT 조건 중 현재 좋아요 개수 이하인 뱃지 조회
    const eligibleBadges = await this.prisma.badge.findMany({
      where: {
        badgeConditionType: 'LIKE_COUNT',
        badgeConditionValue: { lte: likeCount },
      },
    });

    const newlyUnlockedBadges: Badge[] = [];

    // ③ 미획득 뱃지 확인 및 지급
    for (const badge of eligibleBadges) {
      const alreadyUnlocked = await this.prisma.userBadge.findUnique({
        where: {
          memberId_badgeId: {
            memberId,
            badgeId: badge.id,
          },
        },
      });

      if (!alreadyUnlocked) {
        await this.prisma.$transaction([
          // 뱃지 부여
          this.prisma.userBadge.create({
            data: {
              memberId,
              badgeId: badge.id,
            },
          }),
          // XP 증가
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

  // 좋아요 삭제 (기존 동일)
  async deletePostLike(postLikeDeleteDTO: PostLikeServiceDTO) {
    const { memberId, postId } = postLikeDeleteDTO;

    const existingLike = await this.postlikeRepository.findPostLike(memberId, postId);

    if (!existingLike) {
      throw new PostLikeException('좋아요가 없습니다.');
    }

    return this.postlikeRepository.deletePostLike(memberId, postId);
  }
}