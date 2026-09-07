import { Controller, Get, Post, Req, Res, UnauthorizedException, UseGuards } from '@nestjs/common';
import { ApiOperation, ApiTags, ApiCookieAuth } from '@nestjs/swagger';
import { AuthProvider } from '@prisma/client';
import { AuthGuard } from '@nestjs/passport';
import type { Response } from 'express';
import { ApiResponse } from 'src/common/dto/api-response.dto';
import { OAuthLoginDTO } from 'src/domain/member/dto/member.dto';
import { GoogleAuthGuard } from 'src/module/auth/guard/google-auth.guard';
import { KakaoAuthGuard } from 'src/module/auth/guard/kakao-auth.guard';
import { LocalAuthGuard } from 'src/module/auth/guard/local-auth.guard';
import { NaverAuthGuard } from 'src/module/auth/guard/naver-auth.guard';
import { AuthService } from 'src/service/auth/auth.service';
import type { AuthRequest } from 'src/type/auth.type';
import { MemberService } from 'src/service/member/member.service';

@Controller('auth')
export class AuthController {

    constructor(
        private readonly authService: AuthService,
        private readonly memberService: MemberService
    ){;}

    // 로그인
    @ApiOperation({summary: "로그인 서비스"})
    @Post("login")
    @UseGuards(LocalAuthGuard) 
    // request -> guard -> local.strategy -> validate -> return -> req.user
    // auth login -> token 생성 -> cookie (httpOnly)
    async login(
        @Req() req:AuthRequest,
        @Res({passthrough: true}) res: Response
    ) {
        console.log("controller", req.user)

        const {accessToken, refreshToken} = await this.authService.login(req.user)

        // 토큰 프론트로 보내긴하는데.. 쥐도새도 모르게 프론트는 모른다.
        res.cookie('refreshToken', refreshToken, {
            httpOnly: true,
            path: "/",
            sameSite: 'lax'
        })

        res.cookie('accessToken', accessToken, {
            httpOnly: true,
            path: "/",
            sameSite: 'lax'
        })

        // [수정 핵심] req.user(최소정보) 대신 DB에서 전체 정보를 조회해서 반환합니다.
        const userDetail = await this.memberService.getMember(req.user.id);

        // 이제 프론트의 Login.jsx는 상세 정보가 담긴 userDetail을 받게 됩니다.
        return new ApiResponse("로그인이 성공하였습니다", userDetail);
    }

    @ApiOperation({summary: "로그아웃 서비스"})
    @Post("logout")
    async logout(
        @Req() req: AuthRequest,
        @Res({ passthrough: true }) res: Response
    ){
        const refreshToken = req.cookies["refreshToken"]

        // Redis 삭제
        const isLogin = await this.authService.logout(refreshToken);
        if(!isLogin){
            // 오류
        }

        // 쿠키 삭제
        res.clearCookie("refreshToken", {
            httpOnly: true,
            path: "/",
            sameSite: "lax"
        })

        res.clearCookie("accessToken", {
            httpOnly: true,
            path: "/",
            sameSite: "lax"
        })

        return new ApiResponse("로그아웃이 완료되었습니다.")
    }
    
    @ApiOperation({summary: "AccessToken으로 유저의 정보를 반환"})
    @Get("me")
    async me(@Req() req:AuthRequest){
        const { accessToken } = req.cookies;
        if(!accessToken) throw new UnauthorizedException();

        const foundMember = await this.authService.me(accessToken)
        return new ApiResponse("회원 조회 성공", foundMember);

    }

    @ApiOperation({summary: "Access Token 재발급"})
    @Post("refresh")
    async refresh(
        @Req() req: AuthRequest,
        @Res({passthrough: true}) res: Response
    ){
        const { refreshToken } = req.cookies
        if(!refreshToken) throw new UnauthorizedException("Refresh Token이 없습니다.")
        
        const { accessToken } = await this.authService.refresh(refreshToken)

        res.cookie('accessToken', accessToken, {
            httpOnly: true,
            path: "/",
            sameSite: 'lax'
        })

        return new ApiResponse("Access Token 재발급 완료")
    }

    @Get("google")
    @UseGuards(GoogleAuthGuard)
    async googleLogin(){;}

    @Get("google/callback")
    @UseGuards(GoogleAuthGuard)
    async googleCallback(
        @Req() req: AuthRequest,
        @Res({passthrough: true}) res: Response
    ){
        console.log(req.user)
        const user = req.user as any;
        const googleMember: OAuthLoginDTO = {
            memberEmail: user.email,
            memberName: user.firstName + ' ' + user.lastName,
            memberProfile: user.picture,
            memberProvider: AuthProvider.GOOGLE,
            memberProviderId: user.id
        }

        // 소셜 서비스 실행!
        const { status, ...others } = await this.authService.socialLogin(googleMember)
        if(status === "JOIN" || status === "LOGIN"){
            const { accessToken, refreshToken } = others;

            res.cookie('refreshToken', refreshToken, {
                httpOnly: true,
                path: "/",
                sameSite: 'lax'
            })

            res.cookie('accessToken', accessToken, {
                httpOnly: true,
                path: "/",
                sameSite: 'lax'
            })
            return res.redirect("http://localhost:3000/")
        }

        // 통합 계정 로그인 할 수 페이지 X
        return res.redirect("http://localhost:3000/auth/merge")
    }

    @Get("kakao")
    @UseGuards(KakaoAuthGuard)
    async kakaoLogin(){;}

    @Get("kakao/callback")
    @UseGuards(KakaoAuthGuard)
    async kakaoLoginCallback(
        @Req() req: AuthRequest,
        @Res({passthrough: true}) res: Response
    ){
        const user = req.user as any;
        const kakaoMember:OAuthLoginDTO = {
            memberEmail: user.email,
            memberName: user.userName,
            memberProfile: user.profileImage,
            memberProviderId: String(user.id),
            memberProvider: AuthProvider.KAKAO
        }

        // 소셜 서비스 실행!
        const { status, ...others } = await this.authService.socialLogin(kakaoMember)
        if(status === "JOIN" || status === "LOGIN"){
            const { accessToken, refreshToken } = others;

            res.cookie('refreshToken', refreshToken, {
                httpOnly: true,
                path: "/",
                sameSite: 'lax'
            })

            res.cookie('accessToken', accessToken, {
                httpOnly: true,
                path: "/",
                sameSite: 'lax'
            })
            return res.redirect("http://localhost:3000/")
        }

        // 통합 계정 로그인 할 수 페이지 X
        return res.redirect("http://localhost:3000/auth/merge")
    }

    @Get("naver")
    @UseGuards(NaverAuthGuard)
    async naverLogin(){;}

    @Get("naver/callback")
    @UseGuards(NaverAuthGuard)
    async naverLoginCallback(
        @Req() req: AuthRequest,
        @Res({passthrough: true}) res: Response
    ){
        const user = req.user as any;
        console.log('Naver Auth User:', user); // 💡 터미널 로그 확인용
        const naverMember:OAuthLoginDTO = {
            memberEmail: user.email,
            memberName: user.name,
            memberProfile: user.profileImage,
            memberProvider: AuthProvider.NAVER,
            memberProviderId: user.id
        }

        // 소셜 서비스 실행!
        const { status, ...others } = await this.authService.socialLogin(naverMember)
        if(status === "JOIN" || status === "LOGIN"){
            const { accessToken, refreshToken } = others;

            res.cookie('refreshToken', refreshToken, {
                httpOnly: true,
                path: "/",
                sameSite: 'lax'
            })

            res.cookie('accessToken', accessToken, {
                httpOnly: true,
                path: "/",
                sameSite: 'lax'
            })
            // 💡 프론트엔드가 로그인 성공 상태를 인지할 수 있도록 query parameter 추가
            return res.redirect("http://localhost:3000/?loginStatus=success");
        }

        // 실패 시 로그인 실패 status를 들고 로그인 페이지로 리다이렉트
        return res.redirect(`http://localhost:3000/login?error=${status}`);
    }

    @ApiOperation({ summary: 'JWT 검증 테스트', description: '쿠키의 토큰을 읽어 유저 정보를 반환합니다.' })
    @ApiCookieAuth('accessToken')
    @UseGuards(AuthGuard('jwt')) // 우리가 만든 JwtStrategy 실행
    @Get('test-jwt')
    async testJwt(@Req() req) {
    // req.user에는 { id: 15 }만 있을 테니, 이걸로 전체 정보를 조회합니다.
    const userDetail = await this.memberService.getMember(req.user.id); 
    return {
        message: "JWT 인증 성공",
        data: userDetail // 여기에 memberName, createdAt 등이 포함됩니다.
    };
}





}
