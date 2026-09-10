import { Injectable } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

@Injectable()
export class OptionalJwtAuthGuard extends AuthGuard('jwt') {
  handleRequest(err: any, user: any) {
    return user || null;
  }
}

// 로직 설명
// 로그인 O → req.user 있음
// 로그인 X → req.user = null
//             ↓
//  그래도 요청 통과
