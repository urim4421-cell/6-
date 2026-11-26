import type { LongPassage, ShortSentence, Subject, SubjectFilter, WordPoolItem } from '../types.ts';

export const SUBJECTS: Subject[] = ['국어', '수학', '사회', '과학'];

export const SUBJECT_META: Record<
  Subject,
  { label: string; badgeText: string; accentBg: string; accentText: string; accentBorder: string; description: string }
> = {
  국어: {
    label: '국어',
    badgeText: '2022 개정 국어 6학년',
    accentBg: 'bg-sky-50',
    accentText: 'text-sky-700',
    accentBorder: 'border-sky-200',
    description: '비유적 표현, 타당한 근거의 주장, 매체 자료 읽기',
  },
  수학: {
    label: '수학',
    badgeText: '2022 개정 수학 6학년',
    accentBg: 'bg-emerald-50',
    accentText: 'text-emerald-700',
    accentBorder: 'border-emerald-200',
    description: '분수·소수 나눗셈, 비와 비율, 원의 넓이, 직육면체',
  },
  사회: {
    label: '사회',
    badgeText: '2022 개정 사회 6학년',
    accentBg: 'bg-amber-50',
    accentText: 'text-amber-700',
    accentBorder: 'border-amber-200',
    description: '대한민국 민주주의 발전, 경제 성장, 세계 여러 나라와 평화',
  },
  과학: {
    label: '과학',
    badgeText: '2022 개정 과학 6학년',
    accentBg: 'bg-indigo-50',
    accentText: 'text-indigo-700',
    accentBorder: 'border-indigo-200',
    description: '지구와 달의 운동, 여러 가지 기체, 식물의 광합성, 빛과 렌즈',
  },
};

export const SHORT_SENTENCES: ShortSentence[] = [
  // 국어 - 1단계 (기초)
  { id: 'kor-1-1', subject: '국어', level: 1, text: '마음을 담아 비유하는 표현을 써 봅니다.', keyWord: '비유표현' },
  { id: 'kor-1-2', subject: '국어', level: 1, text: '알맞은 속담과 관용 표현을 찾아봅니다.', keyWord: '관용표현' },
  { id: 'kor-1-3', subject: '국어', level: 1, text: '글의 중심 내용을 바르게 요약해 봅니다.', keyWord: '중심내용' },
  // 국어 - 2단계 (도약)
  { id: 'kor-2-1', subject: '국어', level: 2, text: '대상의 특징을 살려 직유법과 은유법으로 표현합니다.', keyWord: '직유법' },
  { id: 'kor-2-2', subject: '국어', level: 2, text: '주장하는 글에서는 알맞고 타당한 근거가 필요합니다.', keyWord: '타당한근거' },
  { id: 'kor-2-3', subject: '국어', level: 2, text: '토론할 때는 상대방의 의견을 끝까지 경청해야 합니다.', keyWord: '경청' },
  // 국어 - 3단계 (숙달)
  { id: 'kor-3-1', subject: '국어', level: 3, text: '인터넷과 뉴스 등 다양한 매체 자료의 신뢰성을 꼼꼼히 따져 봅니다.', keyWord: '신뢰성' },
  { id: 'kor-3-2', subject: '국어', level: 3, text: '독서 토의를 통해 서로 다른 생각의 차이를 넓고 깊게 이해합니다.', keyWord: '독서토의' },
  { id: 'kor-3-3', subject: '국어', level: 3, text: '문맥에 어울리는 낱말과 높임 표현을 바르게 구분하여 사용합니다.', keyWord: '높임표현' },

  // 수학 - 1단계 (기초)
  { id: 'mat-1-1', subject: '수학', level: 1, text: '분수의 나눗셈은 곱셈으로 고쳐 풉니다.', keyWord: '분수나눗셈' },
  { id: 'mat-1-2', subject: '수학', level: 1, text: '기준량에 대한 비교하는 양이 비율입니다.', keyWord: '비율' },
  { id: 'mat-1-3', subject: '수학', level: 1, text: '원주율은 지름에 대한 원주의 비율입니다.', keyWord: '원주율' },
  // 수학 - 2단계 (도약)
  { id: 'mat-2-1', subject: '수학', level: 2, text: '비율에 100을 곱한 값을 백분율이라고 부릅니다.', keyWord: '백분율' },
  { id: 'mat-2-2', subject: '수학', level: 2, text: '비례식에서 외항의 곱과 내항의 곱은 서로 같습니다.', keyWord: '비례식' },
  { id: 'mat-2-3', subject: '수학', level: 2, text: '직육면체의 부피는 가로와 세로와 높이를 곱해 구합니다.', keyWord: '직육면체' },
  // 수학 - 3단계 (숙달)
  { id: 'mat-3-1', subject: '수학', level: 3, text: '원의 넓이는 반지름 곱하기 반지름 곱하기 원주율로 계산합니다.', keyWord: '원의넓이' },
  { id: 'mat-3-2', subject: '수학', level: 3, text: '전체를 주어진 비로 나누는 방법을 비례배분이라고 합니다.', keyWord: '비례배분' },
  { id: 'mat-3-3', subject: '수학', level: 3, text: '원기둥과 원뿔, 구의 공통점과 차이점을 정확하게 비교합니다.', keyWord: '원기둥' },

  // 사회 - 1단계 (기초)
  { id: 'soc-1-1', subject: '사회', level: 1, text: '대한민국의 모든 주권은 국민에게 있습니다.', keyWord: '국민주권' },
  { id: 'soc-1-2', subject: '사회', level: 1, text: '국회와 정부와 법원이 권력을 나누어 가집니다.', keyWord: '삼권분립' },
  { id: 'soc-1-3', subject: '사회', level: 1, text: '세계 여러 나라의 다양한 문화를 존중합니다.', keyWord: '문화다양성' },
  // 사회 - 2단계 (도약)
  { id: 'soc-2-1', subject: '사회', level: 2, text: '4·19 혁명과 5·18 민주화 운동은 민주주의를 지켜냈습니다.', keyWord: '민주주의' },
  { id: 'soc-2-2', subject: '사회', level: 2, text: '우리나라는 수출과 무역을 통해 빠른 경제 성장을 이루었습니다.', keyWord: '경제성장' },
  { id: 'soc-2-3', subject: '사회', level: 2, text: '지구촌의 평화를 지키기 위해 국제 기구가 함께 협력합니다.', keyWord: '국제협력' },
  // 사회 - 3단계 (숙달)
  { id: 'soc-3-1', subject: '사회', level: 3, text: '기후 위기와 빈곤 문제를 해결하려면 지속가능발전이 꼭 필요합니다.', keyWord: '지속가능발전' },
  { id: 'soc-3-2', subject: '사회', level: 3, text: '가계와 기업은 시장에서 서로 필요한 자원과 노동력을 주고받습니다.', keyWord: '시장경제' },
  { id: 'soc-3-3', subject: '사회', level: 3, text: '세계 시민으로서 지구촌 갈등을 평화롭게 해결하려는 태도를 기릅니다.', keyWord: '세계시민' },

  // 과학 - 1단계 (기초)
  { id: 'sci-1-1', subject: '과학', level: 1, text: '지구는 하루에 한 바퀴씩 스스로 자전합니다.', keyWord: '지구자전' },
  { id: 'sci-1-2', subject: '과학', level: 1, text: '산소는 다른 물질이 타는 것을 도와주는 기체입니다.', keyWord: '산소' },
  { id: 'sci-1-3', subject: '과학', level: 1, text: '식물의 뿌리는 물과 양분을 흙에서 흡수합니다.', keyWord: '증산작용' },
  // 과학 - 2단계 (도약)
  { id: 'sci-2-1', subject: '과학', level: 2, text: '식물은 빛에너지를 받아 잎에서 광합성으로 양분을 만듭니다.', keyWord: '광합성' },
  { id: 'sci-2-2', subject: '과학', level: 2, text: '볼록 렌즈를 통과한 빛은 한곳으로 모여 굴절하게 됩니다.', keyWord: '볼록렌즈' },
  { id: 'sci-2-3', subject: '과학', level: 2, text: '전류가 흐를 때만 자석의 성질을 띠는 것을 전자석이라 합니다.', keyWord: '전자석' },
  // 과학 - 3단계 (숙달)
  { id: 'sci-3-1', subject: '과학', level: 3, text: '지구의 자전축이 기울어진 채 태양 주위를 공전하여 계절이 변합니다.', keyWord: '계절변화' },
  { id: 'sci-3-2', subject: '과학', level: 3, text: '이산화탄소는 석회수를 뿌옇게 흐리게 만드는 무색의 기체입니다.', keyWord: '이산화탄소' },
  { id: 'sci-3-3', subject: '과학', level: 3, text: '물질이 빛과 열을 내며 타는 연소에는 탈 물질과 산소가 필요합니다.', keyWord: '연소조건' },
];

export const LONG_PASSAGES: LongPassage[] = [
  // 국어 2022 개정 교육과정
  {
    id: 'long-kor-1',
    subject: '국어',
    unitTitle: '1단원. 비유적 표현과 시의 감상',
    achievementStandard: '2022 개정 [6국05-02] 작품 속 비유적 표현의 효과 이해하기',
    difficulty: '기초',
    sentences: [
      '시인은 사물의 특징을 생생하게 전하기 위해 비유적 표현을 자주 활용합니다.',
      "직유법은 '~처럼', '~같이' 같은 말을 써서 빗대는 대상을 직접 드러냅니다.",
      "은유법은 '내 마음은 호수요'처럼 두 대상을 하나로 이어 깊은 여운을 남깁니다.",
    ],
    keywords: ['비유적표현', '직유법', '은유법', '생생하게', '여운'],
  },
  {
    id: 'long-kor-2',
    subject: '국어',
    unitTitle: '2단원. 타당한 근거로 주장하는 글쓰기',
    achievementStandard: '2022 개정 [6국03-04] 적절한 근거와 알맞은 표현으로 주장하기',
    difficulty: '표준',
    sentences: [
      '주장하는 글에서는 글쓴이의 의견과 이를 뒷받침하는 타당한 근거가 뚜렷해야 합니다.',
      '설득력을 높이려면 사실 자료와 통계, 전문가의 의견을 근거로 제시하는 것이 좋습니다.',
      '문단의 흐름을 자연스럽게 잇는 접속어를 알맞게 사용하면 주장이 더욱 선명해집니다.',
    ],
    keywords: ['타당한근거', '설득력', '사실자료', '접속어', '주장하는글'],
  },
  {
    id: 'long-kor-3',
    subject: '국어',
    unitTitle: '3단원. 매체 자료의 신뢰성과 관용 표현',
    achievementStandard: '2022 개정 [6국02-05] 매체 자료의 신뢰성 판단 및 관용 표현 활용',
    difficulty: '심화',
    sentences: [
      '디지털 시대에는 뉴스나 인터넷 매체 자료를 읽을 때 출처와 신뢰성을 먼저 확인해야 합니다.',
      '사실과 의견을 구분하여 비판적으로 읽으면 잘못된 정보에 휩쓸리지 않을 수 있습니다.',
      '상황에 알맞은 속담과 관용 표현을 함께 사용하면 말의 뜻을 재치 있게 전달합니다.',
    ],
    keywords: ['매체자료', '신뢰성', '비판적읽기', '관용표현', '출처확인'],
  },

  // 수학 2022 개정 교육과정
  {
    id: 'long-mat-1',
    subject: '수학',
    unitTitle: '1단원. 분수와 소수의 나눗셈 원리',
    achievementStandard: '2022 개정 [6수01-09] 분수·소수 나눗셈 계산 원리 이해하기',
    difficulty: '기초',
    sentences: [
      '분수의 나눗셈은 나누는 분수의 분자와 분모를 바꾸어 곱셈으로 나타내어 계산합니다.',
      '소수의 나눗셈은 나누는 수와 나누어지는 수에 똑같이 10이나 100을 곱해 풀 수 있습니다.',
      '계산한 뒤에는 어림한 값과 비교하며 몫의 크기와 소수점 위치를 꼼꼼히 확인합니다.',
    ],
    keywords: ['분수나눗셈', '소수나눗셈', '분자분모', '어림하기', '소수점'],
  },
  {
    id: 'long-mat-2',
    subject: '수학',
    unitTitle: '2단원. 비와 비율, 비례식과 비례배분',
    achievementStandard: '2022 개정 [6수04-02] 비례식 성질과 비례배분 활용하기',
    difficulty: '표준',
    sentences: [
      '비율은 기준량에 대한 비교하는 양의 크기를 나타내며 분수나 소수로 표현합니다.',
      '비율에 100을 곱한 백분율은 할인율이나 득표율처럼 생활 속에서 널리 쓰입니다.',
      '비례식에서는 외항의 곱과 내항의 곱이 같다는 성질로 비례배분 문제를 해결합니다.',
    ],
    keywords: ['비와비율', '기준량', '백분율', '비례식', '비례배분'],
  },
  {
    id: 'long-mat-3',
    subject: '수학',
    unitTitle: '3단원. 원의 넓이와 직육면체의 부피',
    achievementStandard: '2022 개정 [6수03-04] 원주율과 원의 넓이, 입체도형 부피 탐구',
    difficulty: '심화',
    sentences: [
      '원의 지름에 대한 원주의 비율인 원주율은 원의 크기와 상관없이 항상 일정합니다.',
      '원의 넓이는 원을 잘게 잘라 이어 붙인 직사각형을 떠올리며 반지름 제곱에 원주율을 곱합니다.',
      '직육면체의 겉넓이와 부피를 구하면 상자의 크기와 들어가는 양을 정확히 알 수 있습니다.',
    ],
    keywords: ['원주율', '원의넓이', '직육면체', '겉넓이', '부피측정'],
  },

  // 사회 2022 개정 교육과정
  {
    id: 'long-soc-1',
    subject: '사회',
    unitTitle: '1단원. 대한민국 민주주의 발전과 국민 주권',
    achievementStandard: '2022 개정 [6사04-02] 민주화 과정과 민주 정치 원리 이해하기',
    difficulty: '기초',
    sentences: [
      '대한민국의 민주주의는 4·19 혁명과 5·18 민주화 운동 등 시민들의 노력으로 자랐습니다.',
      '국회와 정부와 법원은 각각 입법·행정·사법을 나누어 맡아 삼권분립을 이룹니다.',
      '선거와 투표, 시민 참여는 국민 주권을 실현하고 권력을 견제하는 소중한 방법입니다.',
    ],
    keywords: ['민주주의', '삼권분립', '국민주권', '시민참여', '민주화운동'],
  },
  {
    id: 'long-soc-2',
    subject: '사회',
    unitTitle: '2단원. 우리나라의 경제 성장과 세계 무역',
    achievementStandard: '2022 개정 [6사06-02] 경제 성장 과정과 무역의 특징 파악하기',
    difficulty: '표준',
    sentences: [
      '우리나라 경제는 1960년대 경공업에서 시작해 중화학 공업과 첨단 산업으로 발전했습니다.',
      '가계와 기업은 시장에서 물건과 일자리를 나누며 서로 도움을 주고받는 경제 주체입니다.',
      '오늘날에는 여러 나라와 기술과 자원을 교류하며 활발한 무역과 경제 협력을 이어갑니다.',
    ],
    keywords: ['경제성장', '첨단산업', '시장경제', '경제주체', '국제무역'],
  },
  {
    id: 'long-soc-3',
    subject: '사회',
    unitTitle: '3단원. 세계 여러 나라와 지속가능한 지구촌',
    achievementStandard: '2022 개정 [6사08-03] 지구촌 문제 해결과 세계 시민의 자세',
    difficulty: '심화',
    sentences: [
      '세계 각 지역은 기후와 지형에 따라 서로 다른 의식주와 고유한 문화를 가꾸어 왔습니다.',
      '기후 변화와 환경 오염, 자원 부족 같은 지구촌 문제는 한 나라만의 힘으로 풀기 어렵습니다.',
      '미래 세대를 배려하는 지속가능발전 목표를 실천하며 세계 시민의식을 길러야 합니다.',
    ],
    keywords: ['문화다양성', '지구촌문제', '기후변화', '지속가능발전', '세계시민'],
  },

  // 과학 2022 개정 교육과정
  {
    id: 'long-sci-1',
    subject: '과학',
    unitTitle: '1단원. 지구와 달의 운동 및 계절의 변화',
    achievementStandard: '2022 개정 [6과02-02] 자전과 공전에 따른 천체 및 계절 변화 이해',
    difficulty: '기초',
    sentences: [
      '지구가 하루에 한 바퀴씩 서쪽에서 동쪽으로 자전하기 때문에 낮과 밤이 번갈아 생깁니다.',
      '달은 지구 주위를 공전하면서 태양 빛을 반사하는 면이 달라져 모양이 변해 보입니다.',
      '지구의 자전축이 기울어진 채 태양 주위를 공전하므로 우리나라에는 사계절이 나타납니다.',
    ],
    keywords: ['지구자전', '공전운동', '낮과밤', '자전축', '계절변화'],
  },
  {
    id: 'long-sci-2',
    subject: '과학',
    unitTitle: '2단원. 식물의 구조와 광합성 작용',
    achievementStandard: '2022 개정 [6과04-02] 뿌리·줄기·잎의 기능과 광합성 이해하기',
    difficulty: '표준',
    sentences: [
      '식물의 뿌리가 흡수한 물은 줄기의 물관을 따라 잎까지 이동하고 기공으로 빠져나갑니다.',
      '잎의 엽록체는 빛을 받아 물과 이산화탄소로 스스로 살아갈 양분을 만드는 광합성을 합니다.',
      '잎에서 수증기가 빠져나가는 증산 작용 덕분에 물이 꼭대기까지 힘차게 올라갈 수 있습니다.',
    ],
    keywords: ['광합성', '증산작용', '엽록체', '이산화탄소', '기공'],
  },
  {
    id: 'long-sci-3',
    subject: '과학',
    unitTitle: '3단원. 여러 가지 기체와 빛, 연소와 소화',
    achievementStandard: '2022 개정 [6과06-01] 기체의 성질과 빛의 굴절, 연소 조건 탐구',
    difficulty: '심화',
    sentences: [
      '산소는 불꽃을 크게 타오르게 돕고, 이산화탄소는 석회수를 뿌옇게 흐리게 만듭니다.',
      '볼록 렌즈를 지나는 빛은 굴절하여 한 점에 모이므로 사물을 크게 확대해 볼 수 있습니다.',
      '불을 끄는 소화는 탈 물질을 없애거나 산소 공급을 막고 발화점 아래로 온도를 낮춥니다.',
    ],
    keywords: ['산소기체', '석회수', '볼록렌즈', '빛의굴절', '발화점'],
  },
];

export function buildSubjectWordPool(
  subjectFilter: SubjectFilter,
  customPassages: LongPassage[] = []
): WordPoolItem[] {
  const allPassages = [...LONG_PASSAGES, ...customPassages];
  const seen = new Set<string>();
  const pool: WordPoolItem[] = [];

  // 1. Prioritize keywords extracted directly from the 2022 Long Sentence Curriculum Board
  for (const passage of allPassages) {
    if (subjectFilter !== '전체' && passage.subject !== subjectFilter) continue;
    for (const rawWord of passage.keywords) {
      const word = rawWord.trim();
      if (!word || seen.has(word)) continue;
      seen.add(word);
      pool.push({
        word,
        subject: passage.subject,
        unitTitle: passage.unitTitle,
        fromLongBoard: true,
      });
    }
  }

  // 2. Supplement with short-sentence key terms
  for (const s of SHORT_SENTENCES) {
    if (subjectFilter !== '전체' && s.subject !== subjectFilter) continue;
    const word = s.keyWord.trim();
    if (!word || seen.has(word)) continue;
    seen.add(word);
    pool.push({
      word,
      subject: s.subject,
      unitTitle: '단문 연습 핵심어',
      fromLongBoard: false,
    });
  }

  return pool;
}

export function buildRacePrompts(
  subjectFilter: SubjectFilter,
  customPassages: LongPassage[] = []
): string[] {
  const words = buildSubjectWordPool(subjectFilter, customPassages).map((w) => w.word);
  const shortLines = SHORT_SENTENCES.filter(
    (s) => subjectFilter === '전체' || s.subject === subjectFilter
  ).map((s) => s.text);

  // Mix 8 key curriculum words (from Long Board) + 4 concise curriculum sentences for an exciting race!
  const shuffledWords = [...words].sort(() => Math.random() - 0.5).slice(0, 8);
  const shuffledSentences = [...shortLines].sort(() => Math.random() - 0.5).slice(0, 3);
  return [...shuffledWords, ...shuffledSentences];
}
