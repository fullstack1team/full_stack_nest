import { Body, Controller, Delete, HttpCode, Post, Req, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ApiOperation } from '@nestjs/swagger';
import { PostLikeDTO } from 'src/domain/postlike/dto/postlike.dto';
import { PostlikeService } from 
'src/service/postlike/postlike.service';
// interface는 무조건 import type
import type { AuthRequest } from 'src/type/auth.type';

@Controller('postlike')
export class PostlikeController {
  constructor(private readonly postLikeService: PostlikeService) {}

  // 좋아요 생성
  @ApiOperation({ summary: '좋아요 생성' })
  @UseGuards(AuthGuard('jwt'))
  @HttpCode(201)
  @Post()
  async create(@Req() req: AuthRequest, @Body() postLikeCreateDTO: PostLikeDTO) {
    const result = await this.postLikeService.createPostLike({
      memberId: req.user.id,
      postId: postLikeCreateDTO.postId,
    });

    return {
      message: '좋아요가 등록되었습니다.', 
      like: result.like,
      unlockedBadges: result.unlockedBadges, 
    };
  }

  // 좋아요 삭제
  @ApiOperation({ summary: '좋아요 삭제' })
  @UseGuards(AuthGuard('jwt'))
  @HttpCode(200)
  @Delete()
  async delete(@Req() req: AuthRequest, @Body() postLikeDeletedDTO: PostLikeDTO) {
    return this.postLikeService.deletePostLike({
      memberId: req.user.id,
      postId: postLikeDeletedDTO.postId
    });
  }
}
