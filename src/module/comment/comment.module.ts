import { Module } from '@nestjs/common';
import { CommentController } from 'src/controller/comment/comment.controller';
import { CommentRepository } from 'src/repository/comment/comment.repository';
import { CommentService } from 'src/service/comment/comment.service';
import { PrismaModule } from '../prisma/prisma.module';
import { PostModule } from '../post/post.module';
import { PrismaService } from 'src/service/prisma/prisma.service';

@Module({
  imports: [PrismaModule, PostModule],
  controllers: [CommentController],
  providers: [CommentService, CommentRepository, PrismaService],
  exports: [CommentService]
})
export class CommentModule {}
