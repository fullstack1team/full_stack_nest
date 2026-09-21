import { Body, Controller, Delete, Get, HttpCode, Param, ParseIntPipe, Post, Put, Req, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ApiOperation } from '@nestjs/swagger';
import { CommentCreateDTO, CommentCreateServiceDTO, CommentDeleteSelectedDTO, CommentUpdateDTO } from 'src/domain/comment/dto/comment.dto';
import { CommentService } from 'src/service/comment/comment.service';
import type { AuthRequest } from 'src/type/auth.type';

// comment.service.ts 보고 짜면 됨
@Controller('comment')
@UseGuards(AuthGuard('jwt'))
export class CommentController {
  constructor(private readonly commentService: CommentService){;}

  // 댓글 생성
  @ApiOperation({summary: "댓글 생성"})
  @HttpCode(201)
  @Post()
  async create(@Req() req: AuthRequest, @Body() commentCreateDTO: CommentCreateDTO) {
    const commentCreateServiceDTO: CommentCreateServiceDTO = {
      memberId: req.user.id,
      postId: commentCreateDTO.postId,
      content: commentCreateDTO.content
    }
    
    const result = await this.commentService.createComment(commentCreateServiceDTO);

    return {
        message: "댓글이 생성되었습니다.", 
        unlockedBadges: result.unlockedBadges, 
      };

  }

  // 게시글별 댓글 조회
  @ApiOperation({summary: "게시글별 댓글 조회"})
  @HttpCode(200)
  @Get('post/:id')
  async getCommentsByPostId(@Param('id', ParseIntPipe) id: number) {
    return await this.commentService.getCommentByPostId(id)
  }

  // 댓글 수정
  @ApiOperation({summary: "댓글 수정"})
  @HttpCode(200)
  @Put(":id")
  async update(@Param('id', ParseIntPipe) id: number, @Req() req: AuthRequest, @Body() commentUpdateDTO: CommentUpdateDTO) {
    await this.commentService.updateComment(id, req.user.id, commentUpdateDTO)
    return { message: "댓글이 수정되었습니다."}

  }

  // 댓글 단일 삭제
  @ApiOperation({summary: "댓글 단일 삭제"})
  @HttpCode(200)
  @Delete(":id")
  async remove(@Param("id", ParseIntPipe) id: number, @Req() req: AuthRequest) {
    await this.commentService.deleteComment(id, req.user.id)
    return { message: "댓글이 삭제되었습니다."}
  }

  // 게시글별 댓글 전체 삭제
  @ApiOperation({summary: "게시글별 댓글 전체 삭제"})
  @HttpCode(200)
  @Delete("post/:id")
  async removeAllByPostId(@Param("id", ParseIntPipe) id: number, @Req() req: AuthRequest,) {
    await this.commentService.deleteAllCommentsByPostId(id, req.user.id)
    return { message: "댓글이 삭제되었습니다."}

  }

  // 선택한 댓글들 삭제(체크박스로 선택 삭제)
  @ApiOperation({summary: "선택한 댓글들 삭제"})
  @HttpCode(200)
  @Delete()
  async removeSelected(@Req() req: AuthRequest, @Body() commentSelectedDTO: CommentDeleteSelectedDTO) {
    await this.commentService.deleteSelectedComments(commentSelectedDTO.commentIds, req.user.id)
    return { message: "댓글이 삭제되었습니다."}

  }
}
