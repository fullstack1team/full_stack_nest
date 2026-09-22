import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import {
  CreateFridgeDto,
  UpdateFridgeDto,
} from 'src/domain/fridge/dto/fridge.dto';
import { FridgeService } from 'src/service/fridge/fridge.service';

@Controller('fridge')
export class FridgeController {
  constructor(private readonly fridgeService: FridgeService) {}

  @UseGuards(AuthGuard('jwt'))
  @Get('/recommend')
  recommend(@Req() req) {
    const memberId = req.user.id; // jwt.strategy 만들어진 이후에 밑줄 삭제 및 이 줄 활성화

    return this.fridgeService.recommendRecipe(memberId);
  }

  @UseGuards(AuthGuard('jwt'))
    @Post()
    async create(@Req() req, @Body() dto: CreateFridgeDto) {
      const memberId = req.user.id;

      const result = await this.fridgeService.create({
        ...dto,
        memberId,
      });

      return {
        message: '식재료가 등록되었습니다.',
        data: result,
        unlockedBadges: result.unlockedBadges || [], // 💡 실시간 뱃지 해금 팝업용
      };
    }

  @UseGuards(AuthGuard('jwt'))
  @Get()
  findAll(@Req() req) {
    const memberId = req.user.id; // jwt.strategy 만들어진 이후에 밑줄 삭제 및 이 줄 활성화

    return this.fridgeService.findAll(memberId);
  }

  @UseGuards(AuthGuard('jwt'))
  @Patch(':id')
  update(@Param('id') id: string, @Req() req, @Body() dto: UpdateFridgeDto) {
    const memberId = req.user.id;
    return this.fridgeService.update(Number(id), memberId, dto);
  }

  @UseGuards(AuthGuard('jwt'))
  @Delete(':id')
  remove(@Param('id') id: string, @Req() req) {
    const memberId = req.user.id;
    return this.fridgeService.remove(Number(id), memberId);
  }
}
