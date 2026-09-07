import { Injectable } from "@nestjs/common";
import { MemberRegisterDTO, MemberUpdateDTO, OAuthLoginDTO } from "src/domain/member/dto/member.dto";
import { MemberEntity } from "src/domain/member/entity/member.entity";
import { PrismaService } from "src/service/prisma/prisma.service";

@Injectable()
export class MemberRepository {

    // 생성자 주입
    constructor(private readonly prisma:PrismaService){;}

    // 회원 추가
    async save(member:MemberRegisterDTO):Promise<MemberEntity>{
        const memberCreate = {
            memberEmail: member.memberEmail,
            memberNickname: member.memberName ?? null,
            memberName: member.memberName,
            memberAge: member.memberAge,
            memberAddress: member.memberAddress,
            memberProfile: member.memberProfile
        }

        // 소셜
        const memberSocialCreate = {
            memberProviderId: member.memberProviderId,
            memberProvider: member.memberProvider,
            memberPassword: member.memberPassword
        }

        const result = await this.prisma.member.create({
            data: {
                ...memberCreate,
                socials: {
                    create: memberSocialCreate
                }
            },
            include: {
                socials: true
            }
        });

        console.log(`✅ 새 회원 가입 성공: ${result.memberEmail} (${result.memberNickname})`);

        return result;
    }

    // 회원 전체 조회
    async findMemberAll():Promise<MemberEntity[]> {
        return await this.prisma.member.findMany({
            include: {
                socials: true
            }
        })
    }

    // 회원 단일 조회(ID)
    async findMemberById(id: number):Promise<MemberEntity | null>{
        return await this.prisma.member.findUnique({
            where: { id },
            include: { socials: true }
        })
    }

    // 회원 단일 조회(memberEmail)
    async findMemberByMemberEmail(memberEmail:string):Promise<MemberEntity | null>{
        return await this.prisma.member.findFirst({
            where: { memberEmail },
            include: { socials: true }
        })
    }

    // 소셜 로그인으로 로그인했을 때 회원을 조회하는 방법!
    // 회원 단일 조회(Provider)
    async findByProvider(socialMember:OAuthLoginDTO): Promise<MemberEntity | null>{
        return await this.prisma.member.findFirst({
            where: {
                socials: {
                    some: {
                        memberProviderId: socialMember.memberProviderId,
                        memberProvider:  socialMember.memberProvider
                    }
                }
            },
            include: {
                socials: true
            }
        })
    }

    // 로컬(LOCAL) 가입자 중 해당 이메일을 사용하는 회원 조회 (일반 회원가입 중복 체크용)
    async findLocalMemberByEmail(memberEmail: string): Promise<MemberEntity | null> {
        return await this.prisma.member.findFirst({
            where: {
                memberEmail,
                socials: {
                    some: {
                        memberProvider: 'LOCAL' // enum AuthProvider.LOCAL 사용 가능
                    }
                }
            },
            include: {
                socials: true
            }
        });
    }

    // 회원 비밀번호 수정
    async updatePassword(memberId: number, memberPassword: string): Promise<void> {
    await this.prisma.authAccount.updateMany({
        where: {
        memberId: memberId, // member_id 외래키 조건
        memberProvider: 'LOCAL', // 선택 사항: 로컬 로그인 계정만 업데이트
        },
        data: {
        memberPassword: memberPassword,
        },
    });
    }

    // 회원 정보 수정
    async updateProfile(id: number, member:MemberUpdateDTO):Promise<MemberEntity | null>{
        const {memberPassword, ...removedPasswordMember} = member;

        await this.prisma.member.update({
            data: removedPasswordMember,
            where: { id }
        })

        return await this.findMemberById(id)
    }

    // 회원 삭제
    async delete(id: number){
        try {
            await this.prisma.member.delete({
                where: { id }
            })
            return true
        } catch (err) {
            console.log("member respository delete failed")
            return false
        }
    }

    // 닉네임 중복 확인
    async findMemberByName(memberName: string): Promise<MemberEntity | null> {
        return await this.prisma.member.findFirst({
            where: {
                memberName
            },
            include: {
                socials: true
            }
        });
    }

    // 닉네임 수정
    async updateNickname(
        id: number,
        memberName: string
    ): Promise<MemberEntity | null> {

        await this.prisma.member.update({
            where: {
                id
            },
            data: {
                memberName
            }
        });

        return await this.findMemberById(id);
    }

}