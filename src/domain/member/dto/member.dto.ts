import { ApiProperty } from "@nestjs/swagger";
import { AuthProvider } from "@prisma/client";
import { IsEnum, IsNotEmpty, IsNumber, IsOptional, IsString } from 'class-validator'

export class MemberRegisterDTO {
    // model Member
    @ApiProperty({example: "test123@gmail.com", description: "회원 이메일"})
    @IsString()
    memberEmail: string;
    
    @ApiProperty({example: "홍길동", description: "회원 이름"})
    @IsString() @IsNotEmpty()
    memberName: string;

    @ApiProperty({example: "유진", description: "회원 닉네임", required: false})
    @IsString() @IsOptional()
    memberNickname?: string;
    
    @ApiProperty({example: 20, description: "회원 나이"})
    @IsNumber() @IsOptional()
    memberAge?: number;
    
    @ApiProperty({example: "경기도 구리시", description: "회원 주소"})
    @IsString() @IsOptional()
    memberAddress?: string;
    
    @ApiProperty({example: "https://myprofile.com/myprofile.jpg", description: "회원 이미지"})
    @IsString() @IsOptional()
    memberProfile?: string;
    
    // model AuthAccount
    @ApiProperty({example: "LOCAL", description: "회원 가입 경로"})
    @IsEnum(AuthProvider)
    memberProvider: AuthProvider;
    
    @ApiProperty({example: "test123!@#", description: "회원 비밀번호"})
    @IsString() @IsOptional()
    memberPassword?: string;
    
    @ApiProperty({example: "10011004184", description: "소셜 고유 아이디"})
    @IsString() @IsOptional()
    memberProviderId?: string;
}

export class MemberUpdateDTO {
    @ApiProperty({example: "홍길동", description: "회원 이름"})
    @IsString() @IsNotEmpty()
    memberName: string;
    
    @ApiProperty({example: 20, description: "회원 나이"})
    @IsNumber() @IsOptional()
    memberAge?: number;
    
    @ApiProperty({example: "경기도 구리시", description: "회원 주소"})
    @IsString() @IsOptional()
    memberAddress?: string;
    
    @ApiProperty({example: "https://myprofile.com/myprofile.jpg", description: "회원 이미지"})
    @IsString() @IsOptional()
    memberProfile?: string;

    @ApiProperty({example: "test123!@#", description: "회원 비밀번호"})
    @IsString() @IsOptional()
    memberPassword?: string;
}

// 로컬에서 로그인 하는 경우
export class LocalLoginDTO {
    @ApiProperty({example: "test123@gmail.com", description: "회원 이메일"})
    @IsString()
    memberEmail: string;

    @ApiProperty({example: "test123!@#", description: "회원 비밀번호"})
    @IsString()
    memberPassword: string;
}

// 소셜 로그인
export class OAuthLoginDTO {
    // model Member
    @ApiProperty({example: "test123@gmail.com", description: "회원 이메일"})
    @IsString()
    memberEmail: string;
    
    @ApiProperty({example: "홍길동", description: "회원 이름"})
    @IsString() @IsNotEmpty()
    memberName: string;
    
    @ApiProperty({example: "https://myprofile.com/myprofile.jpg", description: "회원 이미지"})
    @IsString() @IsOptional()
    memberProfile?: string;
    
    // model AuthAccount
    @ApiProperty({example: "LOCAL", description: "회원 가입 경로"})
    @IsEnum(AuthProvider)
    memberProvider: AuthProvider;
    
    @ApiProperty({example: "10011004184", description: "소셜 고유 아이디"})
    @IsString() @IsOptional()
    memberProviderId?: string;
}

// 회원 조회
export class MemberResponseDTO {
    @ApiProperty({example: 1, description: "아이디"})
    @IsNumber()
    id: number;

    @ApiProperty({example: "test123@gmail.com", description: "회원 이메일"})
    @IsString()
    memberEmail: string;
    
    @ApiProperty({example: "홍길동", description: "회원 이름"})
    @IsString() @IsNotEmpty()
    memberName: string;

    @ApiProperty({example: "유진", description: "회원 닉네임"})
    @IsString() @IsOptional()
    memberNickname?: string;
    
    @ApiProperty({example: 20, description: "회원 나이"})
    @IsNumber() @IsOptional()
    memberAge?: number;
    
    @ApiProperty({example: "경기도 구리시", description: "회원 주소"})
    @IsString() @IsOptional()
    memberAddress?: string;
    
    @ApiProperty({example: "https://myprofile.com/myprofile.jpg", description: "회원 이미지"})
    @IsString() @IsOptional()
    memberProfile?: string;
}

// 닉네임 변경
export class NicknameChangeDTO {

    @ApiProperty({
        example: "유진",
        description: "변경할 닉네임"
    })
    @IsString()
    @IsNotEmpty()
    memberName: string;
}

// 비밀번호 확인 (현재 비밀번호 검증용)
export class CheckPasswordDTO {
  @ApiProperty({ example: "test123!@#", description: "현재 비밀번호" })
  @IsString()
  @IsNotEmpty()
  currentPassword!: string;
}

// 비밀번호 변경
export class ChangePasswordDTO {
  @ApiProperty({ example: "test123!@#", description: "현재 비밀번호" })
  @IsString()
  @IsNotEmpty()
  currentPassword!: string;

  @ApiProperty({ example: "newPassword123!@#", description: "새로운 비밀번호" })
  @IsString()
  @IsNotEmpty()
  newPassword!: string;
}

// 파일 입출력용 추가
export type MulterFile = {
  fieldname: string;
  originalname: string;
  encoding: string;
  mimetype: string;
  size: number;
  destination: string;
  filename: string;
  path: string;
  buffer: Buffer; 
}
