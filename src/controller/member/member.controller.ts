import { Body, Controller, Delete, Get, HttpCode, Param, ParseIntPipe, Post, Put, UploadedFile, UseInterceptors, Logger, UseGuards } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiOperation } from '@nestjs/swagger';
import { AuthProvider } from '@prisma/client';
import { ApiResponse } from 'src/common/dto/api-response.dto';
import type { MemberRegisterDTO, MemberUpdateDTO, MulterFile, NicknameChangeDTO, ChangePasswordDTO } from 'src/domain/member/dto/member.dto';
import { JwtAuthGuard } from 'src/module/auth/guard/jwt-auth.guard';
import { MemberResponse } from 'src/domain/member/dto/member.response';
import { MemberService } from 'src/service/member/member.service';

@Controller('members')
export class MemberController {

    private readonly logger = new Logger(MemberController.name);

    constructor(private readonly memberService:MemberService){;}

    @ApiOperation({summary: "회원가입 서비스"})
    @Post("join")
    @HttpCode(201)
    async join(@Body() member:MemberRegisterDTO):Promise<ApiResponse>{
        // 컨트롤러에서 provider를 심는다.
        await this.memberService.join({...member, memberProvider: AuthProvider.LOCAL})
        // return값이 nest에서는 자동 응답(JSON)
        return new ApiResponse("회원가입이 완료되었습니다.");
    }

    // 회원 전체 목록 조회(원래 서비스X)
    @ApiOperation({summary: "회원 전체 목록 조회"})
    @Get("")
    @HttpCode(200)
    async getMembers():Promise<ApiResponse>{
        const members:MemberResponse[] = await this.memberService.getMembers()
        return new ApiResponse("회원 전체 조회 완료되었습니다.", members)
    }

    // 프로필사진 수정(AWS)
    @Put("/profile/:id")
    // react 쪽에서 form-data의 key이름을 "thumbnail"로 보낼 경우 가로챈다
    @UseInterceptors(FileInterceptor("thumbnail"))
    async updateProfile(
        @Param("id", ParseIntPipe) id: number,
        @UploadedFile() thumbnail: MulterFile,
        @Body() member:MemberUpdateDTO
    ){
        console.log("전송된 데이터 body:", member);
        console.log("업로드된 파일 데이터 ", thumbnail)

        const updatedMember = await this.memberService.updateProfile(id, thumbnail, member);
        return new ApiResponse("회원 정보가 수정되었습니다", updatedMember);
    }


    // 회원정보 수정
    @ApiOperation({summary: "회원 정보 수정"})
    @Put(":id")
    @HttpCode(200)
    async modify(
        @Param('id', ParseIntPipe) id:number,
        @Body() member:MemberUpdateDTO
    ):Promise<ApiResponse> {
        const updatedMember = await this.memberService.modify(id, member);
        return new ApiResponse("회원 정보 수정 완료", updatedMember)
    }
    
    // 닉네임 변경(회원정보 수정 세부 내용)
    @ApiOperation({ summary: "닉네임 변경" })
    @Put(":id/nickname")
    @HttpCode(200)
    async changeNickname(
        @Param('id', ParseIntPipe) id: number,
        @Body() member: NicknameChangeDTO
    ): Promise<ApiResponse> {

        this.logger.log(`[PUT /members/${id}/nickname] 닉네임 변경 요청 - Target Name: ${member.memberName}`);

        const updatedMember =
            await this.memberService.changeNickname(id, member);

        return new ApiResponse(
            "닉네임 변경이 완료되었습니다.",
            updatedMember
        );
    }

    // 비밀번호 변경
    @ApiOperation({ summary: "비밀번호 변경" })
    @HttpCode(200)
    @UseGuards(JwtAuthGuard) // 로그인된 사용자만 접근 가능
    @Put(':id/password')
    async changePassword(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: ChangePasswordDTO,
    ) {
    await this.memberService.changePassword(id, dto);
    return { message: '비밀번호가 성공적으로 변경되었습니다.' };
}

    // 회원 탈퇴
    @ApiOperation({summary: "회원 탈퇴"})
    @HttpCode(204)
    @Delete(":id")
    async withdraw(@Param("id", ParseIntPipe) id: number):Promise<ApiResponse>{
        await this.memberService.withdraw(id);
        return new ApiResponse("회원 탈퇴가 완료되었습니다.")
    }

}
