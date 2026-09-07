import { ConflictException ,forwardRef, Inject, Injectable, BadRequestException, NotFoundException, Logger } from '@nestjs/common';
import { MemberRepository } from 'src/repository/member/member.repository';
import { AuthService } from '../auth/auth.service';
import { MemberRegisterDTO, MemberUpdateDTO, MulterFile, OAuthLoginDTO, NicknameChangeDTO, ChangePasswordDTO } from 'src/domain/member/dto/member.dto';
import MemberException from 'src/exception/exception.member';
import { AuthProvider } from '@prisma/client';
import { MemberResponse } from 'src/domain/member/dto/member.response';
import { S3Service } from '../s3/s3.service'; 
import * as bcrypt from 'bcrypt';

@Injectable()
export class MemberService {
    private readonly logger = new Logger(MemberService.name);

    constructor(
        private readonly memberRepository: MemberRepository,
        @Inject(forwardRef(() => AuthService))
        private readonly authService: AuthService,
        private readonly s3Service: S3Service,
    ) {}

    /**
     * [내부 로직] 기획안 기준: 다음 레벨이 되기 위해 필요한 '총 누적 XP' 목표치 계산
     */
    private getNextLevelMaxXp(level: number): number {
        // 팀원 가이드라인을 누적치로 환산한 테이블
        const xpTable: Record<number, number> = {
            1: 100,  // Lv.1 -> 2 (100 필요)
            2: 250,  // Lv.2 -> 3 (100 + 150)
            3: 450,  // Lv.3 -> 4 (250 + 200)
            4: 700,  // Lv.4 -> 5 (450 + 250)
            5: 1000, // Lv.5 -> 6 (700 + 300)
            6: 1400, // Lv.6 -> 7 (1000 + 400)
            7: 1900, // Lv.7 -> 8 (1400 + 500)
            8: 2550, // Lv.8 -> 9 (1900 + 650)
            9: 3350, // Lv.9 -> 10 (2550 + 800)
        };
        return xpTable[level] || 3350; // 만렙 이후는 일단 고정
    }

    // 회원 가입 서비스
    async join(member: MemberRegisterDTO): Promise<void> {
        this.logger.log(`[회원가입 요청] Email: ${member.memberEmail}`);
        
        // 💡 일반 폼 회원가입(LOCAL)일 때만 LOCAL 이메일 중복 체크
        if (member.memberProvider === AuthProvider.LOCAL) {
            const foundLocalMember = await this.memberRepository.findLocalMemberByEmail(member.memberEmail);
            if (foundLocalMember) {
                this.logger.warn(`[회원가입 실패] 이미 존재하는 로컬 이메일: ${member.memberEmail}`);
                throw new MemberException("이미 일반 회원으로 가입된 이메일입니다.");
            }
        }

        let hashedPassword = member.memberPassword;
        if (member.memberProvider === AuthProvider.LOCAL && member.memberPassword) {
            hashedPassword = await this.authService.hashPassword(member.memberPassword);
        }
        await this.memberRepository.save({ ...member, memberPassword: hashedPassword });
        this.logger.log(`[회원가입 성공] Email: ${member.memberEmail}`);
    }

    /**
     * 회원 단일 조회 (레벨 및 경험치 진행도 포함)
     */
    async getMember(id: number): Promise<any> {
        const member = await this.memberRepository.findMemberById(id);

        if (!member) { 
            this.logger.warn(`[회원 조회 실패] 존재하지 않는 Member ID: ${id}`);
            throw new MemberException("멤버를 찾을 수 없습니다.");
        }

        // --- 경험치 진행도 계산 로직 추가 ---
        const nextLevelMaxXp = this.getNextLevelMaxXp(member.memberLevel);
        
        // 진행률(%) 계산: (현재 총 XP / 목표 총 XP) * 100
        const progress = Math.min(
            Math.floor((member.memberXp / nextLevelMaxXp) * 100), 
            100
        );

        // 프론트엔드 연동을 위해 계산된 필드들을 추가하여 반환
        return {
            ...member,
            socials: member.socials.map(({ memberPassword, ...rest }) => rest),
            // 추가된 필드
            nextLevelMaxXp, // 다음 레벨 목표치
            progress,       // 경험치 바 % (0~100)
            currentXp: member.memberXp
        };
    }

    // 단일 회원 이메일로 조회
    async getMemberByMemberEmail(memberEmail: string): Promise<any | null> {
        const member = await this.memberRepository.findMemberByMemberEmail(memberEmail);
        if (member) {
            return this.getMember(member.id); // 공통된 계산 로직 적용을 위해 getMember 호출
        }
        return null;
    }

    // 단일 회원 Provider로 조회
    async getMemberByMemberProvider(socialMember: OAuthLoginDTO): Promise<any | null> {
        const member = await this.memberRepository.findByProvider(socialMember);
        if (member) {
            return this.getMember(member.id);
        }
        return null;
    }

    // 회원 전체 목록 조회
    async getMembers(): Promise<MemberResponse[]> {
        const members = await this.memberRepository.findMemberAll();
        return members.map((member) => ({
            ...member,
            socials: member.socials.map(({ memberPassword, ...rest }) => rest)
        }));
    }

    // 회원 프로필 이미지 수정
    async updateProfile(id: number, thumbnail: MulterFile, member: MemberUpdateDTO) {
        this.logger.log(`[프로필 이미지 수정 요청] Member ID: ${id}`);
        if (thumbnail) {
            const s3Result = await this.s3Service.uploadFile(thumbnail, "profiles");
            
            const foundMember = await this.memberRepository.findMemberById(id);
            if (!foundMember) { 
                this.logger.warn(`[프로필 이미지 수정 실패] Member ID: ${id} 회원 없음`);
                throw new MemberException("회원 조회 실패");
            }

            await this.memberRepository.updateProfile(id, { 
                memberName: foundMember.memberName,
                memberProfile: s3Result.originalUrl
            });
            this.logger.log(`[프로필 이미지 수정 완료] Member ID: ${id} -> URL: ${s3Result.originalUrl}`);
        }
        return await this.getMember(id);
    }

    // 회원 정보 수정
    async modify(id: number, member: MemberUpdateDTO) {
        this.logger.log(`[회원정보 수정 요청] Member ID: ${id}`);
        const foundMember = await this.memberRepository.findMemberById(id);
        if (!foundMember) {
            this.logger.warn(`[회원정보 수정 실패] Member ID: ${id} 회원 없음`);
            throw new MemberException("회원을 찾을 수 없습니다");
        }

        await this.memberRepository.updateProfile(id, member);
        this.logger.log(`[회원정보 수정 완료] Member ID: ${id}`);
        return await this.getMember(id);
    }

    // 회원 탈퇴
    async withdraw(id: number): Promise<void> {
        this.logger.log(`[회원 탈퇴 요청] Member ID: ${id}`);
        await this.memberRepository.delete(id);
        this.logger.log(`[회원 탈퇴 완료] Member ID: ${id}`);
    }

    // 닉네임 변경
    async changeNickname(
    id: number,
    member: NicknameChangeDTO
) {
    this.logger.log(`[닉네임 변경 요청] Member ID: ${id} -> 새 닉네임: ${member.memberName}`);
    const foundMember = await this.memberRepository.findMemberById(id);

    if (!foundMember) {
        this.logger.warn(`[닉네임 변경 실패] Member ID: ${id} 회원 없음`);
        throw new MemberException("회원을 찾을 수 없습니다"); 
    }

    const duplicateMember =
        await this.memberRepository.findMemberByName(member.memberName);

    if (duplicateMember && duplicateMember.id !== id) {
        this.logger.warn(`[닉네임 변경 실패] 중복된 닉네임: ${member.memberName}`);
        throw new ConflictException("중복된 닉네임 입니다.");
    }

    const updatedMember =
        await this.memberRepository.updateNickname(
            id,
            member.memberName
        );
        this.logger.log(`[닉네임 변경 성공] Member ID: ${id} -> ${member.memberName}`);

    return updatedMember;
}

    // 비밀번호 변경
    async changePassword(memberId: number, dto: ChangePasswordDTO): Promise<void> {
        this.logger.log(`[비밀번호 변경 요청] Member ID: ${memberId}`);

        const { currentPassword, newPassword } = dto;

        // 1. 회원 존재 확인
        const member = await this.memberRepository.findMemberById(memberId);
        if (!member) {
            this.logger.error(`[비밀번호 변경 실패] 존재하지 않는 Member ID: ${memberId}`);
            throw new NotFoundException('존재하지 않는 회원입니다.');
        }

        // 2. 소셜/로컬 계정 비밀번호 추출
        const localSocial = member.socials?.find((s: any) => s.memberPassword);
        const currentHashedPassword = localSocial?.memberPassword;

        // 3. 비밀번호 해시 존재 여부 검증 (bcrypt 호출 전 방어 로직)
        if (!currentHashedPassword) {
            this.logger.warn(`[비밀번호 변경 실패] Member ID: ${memberId} - 비밀번호 정보 없음/소셜계정`);
            throw new BadRequestException(
            '소셜 로그인 계정이거나 저장된 비밀번호 정보가 없어 변경할 수 없습니다.',
            );
        }

        // 4. 현재 비밀번호 일치 여부 확인
        const isPasswordValid = await bcrypt.compare(
            currentPassword,
            currentHashedPassword,
        );
        if (!isPasswordValid) {
            this.logger.warn(`[비밀번호 변경 실패] Member ID: ${memberId} - 현재 비밀번호 불일치`);
            throw new BadRequestException('현재 비밀번호가 일치하지 않습니다.');
        }

        // 5. 새 비밀번호가 기존 비밀번호와 동일한지 확인
        const isSameAsOld = await bcrypt.compare(
            newPassword,
            currentHashedPassword,
        );
        if (isSameAsOld) {
            this.logger.warn(`[비밀번호 변경 실패] Member ID: ${memberId} - 기존 비밀번호와 동일`);
            throw new BadRequestException(
            '기존 비밀번호와 동일한 비밀번호로 변경할 수 없습니다.',
            );
        }

        // 6. 새 비밀번호 해싱 및 저장
        const hashedPassword = await bcrypt.hash(newPassword, 10);
        await this.memberRepository.updatePassword(memberId, hashedPassword);

        this.logger.log(`[비밀번호 변경 성공] Member ID: ${memberId}`);
        }
    }
