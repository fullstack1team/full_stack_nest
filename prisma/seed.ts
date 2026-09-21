import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {

  // 기획서의 20개 뱃지 데이터 (일부 예시, 나머지도 같은 방식으로 추가 가능)
  const badgeData = [
    {
        badgeName: "냉장고 입주민",
        badgeDescription: "첫 재료 등록",
        badgeImageUrl: "fridge-resident",
        badgeRewardXp: 30,
        badgeConditionType: "INGREDIENT_COUNT",
        badgeConditionValue: 1,
        category: "ingredient", 
        unlockedDescription: "FrigoGo 냉장고에 첫 식재료를 채워 넣었어요.",
        lockedDescription: "첫 재료를 등록하면 해금돼요."
    },
    {
        badgeName: "냉장고 정리왕",
        badgeDescription: "재료 10개 등록",
        badgeImageUrl: "fridge-organizer",
        badgeRewardXp: 50,
        badgeConditionType: "INGREDIENT_COUNT",
        badgeConditionValue: 10,
        category: "ingredient",
        unlockedDescription: "냉장고 속 재료를 체계적으로 정리하기 시작했어요.",
        lockedDescription: "재료 10개를 등록하면 해금돼요."
    },
    {
        badgeName: "첫 한 접시",
        badgeDescription: "첫 요리 완성",
        badgeImageUrl: "first-plate",
        badgeRewardXp: 30,
        badgeConditionType: "COOK_COUNT",
        badgeConditionValue: 1,
        category: "cook", 
        unlockedDescription: "첫 번째 요리를 완성하며 집밥 여정을 시작했어요.",
        lockedDescription: "첫 요리를 완성하면 해금돼요."
    },
    {
        badgeName: "오늘의 요리사",
        badgeDescription: "요리 10개 완성",
        badgeImageUrl: "today-cook",
        badgeRewardXp: 50,
        badgeConditionType: "COOK_COUNT",
        badgeConditionValue: 10,
        category: "cook", 
        unlockedDescription: "어느새 요리를 자연스럽게 해내는 사람이 되었어요.",
        lockedDescription: "요리 10개를 완성하면 해금돼요."
    },
    {
        badgeName: "주방 탐험가",
        badgeDescription: "요리 30개 완성",
        badgeImageUrl: "kitchen-explorer",
        badgeRewardXp: 80,
        badgeConditionType: "COOK_COUNT",
        badgeConditionValue: 30,
        category: "cook", 
        unlockedDescription: "다양한 요리를 시도하며 나만의 식탁을 넓혀가고 있어요.",
        lockedDescription: "요리 30개를 완성하면 해금돼요."
    },
    {
        badgeName: "우리집 셰프",
        badgeDescription: "요리 50개 완성",
        badgeImageUrl: "home-chef",
        badgeRewardXp: 100,
        badgeConditionType: "COOK_COUNT",
        badgeConditionValue: 50,
        category: "cook", 
        unlockedDescription: "집에서 꾸준히 요리하며 실력을 쌓은 진짜 집밥러예요.",
        lockedDescription: "요리 50개를 완성하면 해금돼요."
    },
    {
        badgeName: "임박 구조대",
        badgeDescription: "임박 재료 5개 소진",
        badgeImageUrl: "expiry-rescue",
        badgeRewardXp: 50,
        badgeConditionType: "EXPIRY_RESCUE_COUNT",
        badgeConditionValue: 5,
        category: "ingredient", 
        unlockedDescription: "유통기한이 임박한 재료를 제때 구해냈어요.",
        lockedDescription: "임박 재료 5개를 소진하면 해금돼요."
    },
    {
        badgeName: "환경지킴이",
        badgeDescription: "임박 재료 30개 소진",
        badgeImageUrl: "eco-guardian",
        badgeRewardXp: 80,
        badgeConditionType: "EXPIRY_RESCUE_COUNT",
        badgeConditionValue: 30,
        category: "ingredient", 
        unlockedDescription: "버려질 뻔한 재료를 살려 환경까지 생각했어요.",
        lockedDescription: "임박 재료 30개를 소진하면 해금돼요."
    },
    {
        badgeName: "제로웨이스트 셰프",
        badgeDescription: "임박 재료 50개 소진",
        badgeImageUrl: "zero-waste-chef",
        badgeRewardXp: 100,
        badgeConditionType: "EXPIRY_RESCUE_COUNT",
        badgeConditionValue: 50,
        category: "ingredient", 
        unlockedDescription: "음식물 낭비를 줄이는 실천을 꾸준히 이어가고 있어요.",
        lockedDescription: "임박 재료 50개를 소진하면 해금돼요."
    },
    {
        badgeName: "냉털 요리사",
        badgeDescription: "남은 재료만으로 요리 5회 완성",
        badgeImageUrl: "leftover-cook",
        badgeRewardXp: 50,
        badgeConditionType: "LEFTOVER_COOK_COUNT",
        badgeConditionValue: 5,
        category: "cook", 
        unlockedDescription: "냉장고 속 남은 재료만으로도 훌륭한 한 끼를 만들었어요.",
        lockedDescription: "남은 재료만으로 요리 5회를 완성하면 해금돼요."
    },
    {
        badgeName: "재료 활용꾼",
        badgeDescription: "같은 재료를 10회 활용",
        badgeImageUrl: "ingredient-master",
        badgeRewardXp: 50,
        badgeConditionType: "SPECIFIC_INGREDIENT_REUSE_COUNT",
        badgeConditionValue: 10,
        category: "ingredient", 
        unlockedDescription: "하나의 재료도 다양하게 활용할 줄 아는 알뜰한 요리사예요.",
        lockedDescription: "같은 재료를 10번 요리에 활용하면 해금돼요."
    },
    {
        badgeName: "맛있는 첫 저장",
        badgeDescription: "첫 레시피 저장",
        badgeImageUrl: "delicious-first-save", // 사진 구하기.
        badgeRewardXp: 30,
        badgeConditionType: "RECIPE_SCRAP_COUNT",
        badgeConditionValue: 1,
        category: "recipe", 
        unlockedDescription: "마음에 드는 레시피를 저장하며 취향을 모으기 시작했어요.",
        lockedDescription: "첫 레시피를 저장하면 해금돼요."
    },
    {
        badgeName: "레시피 수집가",
        badgeDescription: "레시피 30개 저장",
        badgeImageUrl: "recipe-collector",
        badgeRewardXp: 80,
        badgeConditionType: "RECIPE_SCRAP_COUNT",
        badgeConditionValue: 30,
        category: "recipe", 
        unlockedDescription: "다양한 레시피를 차곡차곡 모으는 취향의 큐레이터예요.",
        lockedDescription: "레시피 30개를 저장하면 해금돼요."
    },
    {
        badgeName: "북마크 실천가",
        badgeDescription: "저장한 레시피로 10회 요리 완성",
        badgeImageUrl: "bookmark-achiever", // 사진 구하기.
        badgeRewardXp: 80,
        badgeConditionType: "SCRAPPED_RECIPE_COOK_COUNT",
        badgeConditionValue: 10,
        category: "cook", 
        unlockedDescription: "저장만 하지 않고 실제로 꺼내 요리하는 실천형 유저예요.",
        lockedDescription: "저장한 레시피로 10회 요리하면 해금돼요."
    },
    {
        badgeName: "맛있는 첫인사",
        badgeDescription: "첫 게시글 작성",
        badgeImageUrl: "yummy-first-hi", // 사진 구하기.
        badgeRewardXp: 30,
        badgeConditionType: "POST_COUNT",
        badgeConditionValue: 1,
        category: "community", 
        unlockedDescription: "FrigoGo 커뮤니티에 따뜻한 첫 소식을 전해주셨네요.",
        lockedDescription: "첫 게시글을 작성하면 해금돼요."
    },
    {
        badgeName: "커뮤니티 단골",
        badgeDescription: "게시글 10개 작성",
        badgeImageUrl: "badge-community-regular", // 사진 구하기.
        badgeRewardXp: 50,
        badgeConditionType: "POST_COUNT",
        badgeConditionValue: 10,
        category: "community", 
        unlockedDescription: "커뮤니티에서 꾸준히 이야기를 나누는 활발한 유저예요.",
        lockedDescription: "게시글 10개를 작성하면 해금돼요."
    },
    {
        badgeName: "인기 한 접시",
        badgeDescription: "좋아요 50개 획득",
        badgeImageUrl: "popular-plate", 
        badgeRewardXp: 100,
        badgeConditionType: "LIKE_COUNT",
        badgeConditionValue: 50,
        category: "community", 
        unlockedDescription: "많은 사람들이 당신의 요리와 기록에 공감했어요.",
        lockedDescription: "좋아요 50개를 획득하면 해금돼요."
    },
    {
        badgeName: "반응 좋은 이웃",
        badgeDescription: "댓글 30개 작성",
        badgeImageUrl: "popular-neighbor", // 사진 구하기 
        badgeRewardXp: 80,
        badgeConditionType: "COMMENT_WRITE_COUNT",
        badgeConditionValue: 30,
        category: "community", 
        unlockedDescription: "다른 사람들과 따뜻하게 소통하며 커뮤니티를 채우고 있어요.",
        lockedDescription: "댓글 30개를 작성하면 해금돼요."
    },
    {
        badgeName: "매일 열어보는 냉장고",
        badgeDescription: "7일 연속 접속",
        badgeImageUrl: "daily-fridge",
        badgeRewardXp: 80,
        badgeConditionType: "CONTINUOUS_ATTENDANCE_DAYS",
        badgeConditionValue: 7,
        category: "onboarding", 
        unlockedDescription: "매일 FriGoGo에 들러 냉장고와 식탁을 꾸준히 챙기고 있어요.",
        lockedDescription: "7일 연속 접속하면 해금돼요."
    },{
        badgeName: "끝까지 끓인 사람",
        badgeDescription: "챌린지 1회 완주",
        badgeImageUrl: "cooking-finisher", //사진 구하기
        badgeRewardXp: 100,
        badgeConditionType: "CHALLENGE_COMPLETE_COUNT",
        badgeConditionValue: 1,
        category: "challenge", 
        unlockedDescription: "시작한 도전을 끝까지 완주하며 성취를 이뤄냈어요.",
        lockedDescription: "챌린지 1회를 완주하면 해금돼요."
    },
  ];

  console.log('🌱 뱃지 데이터 심기 시작...');

  for (const item of badgeData) {
    await prisma.badge.upsert({
      where: { badgeName: item.badgeName }, 
      update: {}, 
      create: item,
    });
  }

  console.log('✅ 20개의 뱃지 데이터가 모두 저장되었습니다!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });