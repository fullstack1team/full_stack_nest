import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { RedisService } from '../redis/redis.service';
import { JwtPayload } from 'src/type/auth.type';

@Injectable()
export class JwtTokenService {
    constructor(
        private readonly jwtService: JwtService,
        private readonly redisService: RedisService
    ) {;}
    
    // Access Token 생성
    // 최소한 정보, 이메일
    // 1d: 1일, 1h: 1시간, 1m: 1분, 1s: 1초
    async generateAccesstoken(payload: JwtPayload): Promise<string> {
        const accessToken = await this.jwtService.signAsync({
            id: payload.id,
            memberEmail: payload.memberEmail
        },
        {
            issuer: "sehwan",
            expiresIn: "24h"
        })

        return accessToken
    }

    // refreshToken 생성
    async generateRefreshToken(payload: JwtPayload): Promise<string> {
        const refreshToken = await this.jwtService.signAsync({
            id: payload.id,
            memberEmail: payload.memberEmail
        },
        {
            issuer: "sehwan",
            expiresIn: "7d"
        })

        // redis Token 저장
        const ttl = 60 * 60 * 24 * 7
        await this.redisService.setRefreshToken(payload, refreshToken, ttl)
        return refreshToken
    }

    // 토큰이 유효한지 자체를 검사
    async verifyAndExtractPayload(token: string){
        try {
            return await this.jwtService.verifyAsync(token, {
                issuer: "sehwan"
            })
        } catch (err) {
            throw new UnauthorizedException("유효하지 않은 토큰입니다. (verifyAndExtractPayload)")
        }
    }

    // Redis에 저장된 토큰과 동일한지 확인
    async validateRefreshToken(refreshToken: string){
        // 1. 토큰이 만들어 진적이 있는가?
        const payload = await this.verifyAndExtractPayload(refreshToken)

        // 2. redis에 저장된 유효한 토큰인가?
        const storedToken = await this.redisService.getRefreshToken(payload);
        if(!storedToken || storedToken !== refreshToken){
            throw new UnauthorizedException("refresh token이 유효하지 않습니다 (validateRefreshToken)")
        }

        return payload
    }

    // 토큰의 남은 시간 확인 
    async getTokenExpriesIn(token: string){
        const payload = await this.verifyAndExtractPayload(token)

        if(!payload.exp){
            throw new UnauthorizedException("토큰 만료로 정보를 확인할 수 없습니다.")
        }
        const now = Math.floor(Date.now() / 1000)
        return payload.exp - now; // seconds
    }


}
