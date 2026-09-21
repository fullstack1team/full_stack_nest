import { ForbiddenException, Injectable } from '@nestjs/common';
import {
  CommentCreateDTO,
  CommentCreateServiceDTO,
  CommentUpdateDTO,
} from 'src/domain/comment/dto/comment.dto';
import CommentException from 'src/exception/exception.comment';
import { CommentRepository } from 'src/repository/comment/comment.repository';
import { PostRepository } from 'src/repository/post/post.repository';
import { PrismaService } from 'src/service/prisma/prisma.service'; 
import { Badge } from '@prisma/client'; 

@Injectable()
export class CommentService {
  constructor(
    private readonly commentRepository: CommentRepository,
    private readonly postRepository: PostRepository,
    private readonly prisma: PrismaService, 
  ) {}

  // 댓글 생성 (수정)
  async createComment(
    commentCreateDTO: CommentCreateServiceDTO,
  ) {
    // 댓글 생성
    await this.commentRepository.save(commentCreateDTO);

    // 댓글 작성 뱃지 해금 조건 검사
    const unlockedBadges = await this.checkCommentBadges(commentCreateDTO.memberId);

    return {
      message: '댓글 작성 완료',
      unlockedBadges, // 새로 해금된 뱃지 목록 전달
    };
  }

  // 댓글 작성 뱃지 해금 검사 메서드
  private async checkCommentBadges(memberId: number): Promise<Badge[]> {
    // ① 해당 유저가 작성한 총 댓글 개수 조회
    const commentCount = await this.prisma.comment.count({
      where: { memberId },
    });

    // ② COMMENT_WRITE_COUNT 조건 중 현재 작성 개수 이하인 뱃지 조회
    const eligibleBadges = await this.prisma.badge.findMany({
      where: {
        badgeConditionType: 'COMMENT_WRITE_COUNT',
        badgeConditionValue: { lte: commentCount },
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

  // 게시글별 댓글 조회 (기존 동일)
  async getCommentByPostId(postId: number) {
    return await this.commentRepository.findCommentsByPostId(postId);
  }

  // 댓글 수정 (기존 동일)
  async updateComment(
    id: number,
    memberId: number,
    commentUpdateDTO: CommentUpdateDTO,
  ): Promise<void> {
    const foundComment = await this.commentRepository.findCommentById(id);

    if (!foundComment) {
      throw new CommentException('수정할 댓글이 없습니다.');
    }

    if (foundComment.memberId !== memberId) {
      throw new ForbiddenException('본인 댓글만 수정할 수 있습니다.');
    }

    await this.commentRepository.modify(id, commentUpdateDTO);
  }

  // 댓글 단일 삭제 (기존 동일)
  async deleteComment(id: number, memberId: number): Promise<void> {
    const foundComment = await this.commentRepository.findCommentById(id);

    if (!foundComment) {
      throw new CommentException('삭제할 댓글이 없습니다.');
    }

    const foundPost = await this.postRepository.findPostById(
      foundComment.postId,
    );

    if (!foundPost) {
      throw new CommentException('게시글을 찾을 수 없습니다.');
    }

    const isCommentOwner = foundComment.memberId === memberId;
    const isPostOwner = foundPost.memberId === memberId;

    if (!isCommentOwner && !isPostOwner) {
      throw new ForbiddenException('삭제 권한이 없습니다.');
    }

    await this.commentRepository.remove(id);
  }

  // 게시글별 댓글 전체 삭제 (기존 동일)
  async deleteAllCommentsByPostId(
    postId: number,
    memberId: number,
  ): Promise<void> {
    const foundPost = await this.postRepository.findPostById(postId);

    if (!foundPost) {
      throw new CommentException('게시글을 찾을 수 없습니다.');
    }

    if (foundPost.memberId !== memberId) {
      throw new ForbiddenException('내 게시글에서만 전체 삭제할 수 있습니다.');
    }

    const foundComments =
      await this.commentRepository.findCommentsByPostId(postId);

    if (!foundComments || foundComments.length === 0) {
      throw new CommentException('삭제할 댓글이 없습니다.');
    }

    await this.commentRepository.removeAllByPostId(postId);
  }

  // 선택한 댓글들 삭제 (기존 동일)
  async deleteSelectedComments(
    commentIds: number[],
    memberId: number,
  ): Promise<void> {
    const foundComments =
      await this.commentRepository.findCommentsByIds(commentIds);

    if (!foundComments || foundComments.length === 0) {
      throw new CommentException('삭제할 댓글이 없습니다.');
    }

    if (foundComments.length !== commentIds.length) {
      throw new CommentException('일부 댓글을 찾을 수 없습니다.');
    }

    const allMine = foundComments.every(
      (comment) => comment.memberId === memberId,
    );

    if (allMine) {
      await this.commentRepository.removeSelected(commentIds);
      return;
    }

    const firstPostId = foundComments[0].postId;
    const samePost = foundComments.every(
      (comment) => comment.postId === firstPostId,
    );

    if (!samePost) {
      throw new ForbiddenException(
        '다른 게시글의 댓글을 함께 삭제할 수 없습니다.',
      );
    }

    const foundPost = await this.postRepository.findPostById(firstPostId);

    if (!foundPost) {
      throw new CommentException('게시글을 찾을 수 없습니다.');
    }

    const isPostOwner = foundPost.memberId === memberId;

    if (!isPostOwner) {
      throw new ForbiddenException('선택한 댓글을 삭제할 권한이 없습니다.');
    }

    await this.commentRepository.removeSelected(commentIds);
  }
}

  // async deleteSelectedComments(commentIds: number[], memberId: number): Promise<void> {
  //   const foundComments =
  //     await this.commentRepository.findCommentsByIds(commentIds);

  //   if (!foundComments || foundComments.length === 0) {
  //     throw new CommentException('삭제할 댓글이 없습니다.');
  //   }

  //   const notMine = foundComments.some((comment) => comment.memberId !== memberId)

  //   if(notMine) {
  //     throw new ForbiddenException("본인 댓글만 선택 삭제할 수 있습니다.")
  //   }

  //   await this.commentRepository.removeSelected(commentIds);
  // }

