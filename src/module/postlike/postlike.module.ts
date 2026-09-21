import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { PostlikeController } from 'src/controller/postlike/postlike.controller';
import { PostlikeService } from 'src/service/postlike/postlike.service';
import { PostLikeRepository } from 'src/repository/postlike/postlike.repository';
import { PrismaService } from 'src/service/prisma/prisma.service';

@Module({
  imports: [PrismaModule],
  controllers: [PostlikeController],
  providers: [PostlikeService, PostLikeRepository, PrismaService],
  exports: [PostlikeService]
})
export class PostlikeModule {;}
