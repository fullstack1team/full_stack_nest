import { forwardRef, Inject, Injectable } from '@nestjs/common';
import bcrypt from 'bcrypt';
import { JwtPayload } from 'src/type/auth.type';
import { TokenDTO } from 'src/domain/auth/dto/auth/auth.dto';
import { JwtTokenService } from '../jwt/jwt.service';
import { RedisService } from '../redis/redis.service';
import { MemberService } from '../member/member.service';
import { MemberResponse } from 'src/domain/member/dto/member.response';
import { MemberRegisterDTO, OAuthLoginDTO } from 'src/domain/member/dto/member.dto';
import { AuthProvider } from '@prisma/client';

// 회원 검증과 관련된 서비스
@Injectable()
export class AuthService {
    constructor(
        private readonly jwtTokenService: JwtTokenService,
        private readonly redisService: RedisService,
        @Inject(forwardRef(() => MemberService))
        private readonly memberService: MemberService,
    ){;}

    // 비밀번호 해싱
    private readonly saltRounds = 10;

    // 암호화
    async hashPassword(password: string):Promise<string>{
        return bcrypt.hash(password, this.saltRounds)
    }

    // 비밀번호 검사
    async comparePassword(password:string, hashedPassword:string):Promise<boolean>{
        return bcrypt.compare(password, hashedPassword);
    }

    // 로그인
    async login(payload: JwtPayload): Promise<TokenDTO>{
        const accessToken = await this.jwtTokenService.generateAccesstoken(payload)
        const refreshToken = await this.jwtTokenService.generateRefreshToken(payload);

        return {accessToken, refreshToken}
    }

    // 로그아웃
    async logout(refreshToken: string){
        let isLogout = false;
        try {
            const payload = await this.jwtTokenService.verifyAndExtractPayload(refreshToken);
            await this.redisService.deleteRefreshToken(payload);
            isLogout = true;
        } catch (err) {
            isLogout = false;
        }
        return isLogout;
    }

    async me(accessToken: string):Promise<MemberResponse>{
        const payload = await this.jwtTokenService.verifyAndExtractPayload(accessToken);
        return await this.memberService.getMember(payload.id);
    }

    async refresh(refreshToken: string):Promise<TokenDTO>{
        const payload = await this.jwtTokenService.validateRefreshToken(refreshToken)
        const accessToken = await this.jwtTokenService.generateAccesstoken(payload)

        return {
            accessToken, refreshToken
        }
    }

    // 소셜 로그인
    async socialLogin(socialMember: OAuthLoginDTO) {
    const { memberEmail, memberName, memberProfile, memberProvider, memberProviderId } = socialMember;

    // 1. 이미 동일한 소셜(Google, Kakao, Naver 등) 및 ProviderID로 가입된 회원이 있는지 확인
    const foundSocialMember = await this.memberService.getMemberByMemberProvider(socialMember);

    // 2. 이미 가입된 소셜 회원이면 즉시 로그인 (토큰 발급)
    if (foundSocialMember) {
        const payload: JwtPayload = {
            id: foundSocialMember.id,
            memberEmail: foundSocialMember.memberEmail
        };

        const accessToken = await this.jwtTokenService.generateAccesstoken(payload);
        const refreshToken = await this.jwtTokenService.generateRefreshToken(payload);

        return {
            status: "LOGIN",
            accessToken: accessToken,
            refreshToken: refreshToken
        };
    }

    // 3. 신규 소셜 회원가입 처리
    // 닉네임 중복 방지를 위한 난수 생성
    const baseName = memberName || "멘탈이 약한 개복치";
    const randomSuffix = Math.floor(1000 + Math.random() * 9000);
    const uniqueNickname = `${baseName}_${randomSuffix}`;

    const newMember: MemberRegisterDTO = {
        memberEmail: memberEmail,
        memberName: uniqueNickname,
        memberProvider: memberProvider,
        memberProviderId: memberProviderId,
        memberProfile: memberProfile
    };

    // DB에 회원 정보 저장
    await this.memberService.join(newMember);

    // 💡 [핵심] 이메일 대신 방금 가입한 Provider와 ProviderID 정보로 다시 정확히 조회
    const newInsertedMember = await this.memberService.getMemberByMemberProvider(socialMember);

    // 4. 회원가입 완료 후 바로 로그인 토큰 발급
    if (newInsertedMember) {
        const payload: JwtPayload = {
            id: newInsertedMember.id,
            memberEmail: newInsertedMember.memberEmail
        };

        const accessToken = await this.jwtTokenService.generateAccesstoken(payload);
        const refreshToken = await this.jwtTokenService.generateRefreshToken(payload);

        return {
            status: "JOIN",
            accessToken: accessToken,
            refreshToken: refreshToken
        };
    }

    // 예외적인 실패
    return { status: "NOT_FOUND" };
}
}
