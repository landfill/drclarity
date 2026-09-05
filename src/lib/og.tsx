import { ImageResponse } from 'next/og';
import { palette } from '@/styles/palette';
import { getCategory, getTopicByHref } from '@/content/registry';

export const OG_SIZE = { width: 1200, height: 630 };
export const OG_CONTENT_TYPE = 'image/png';

/** 모든 OG 이미지 우하단에 찍히는 워드마크. */
const WORDMARK = 'Dr.Clarity';

/**
 * Google Fonts 의 text= 서브셋을 받아온다.
 *
 * 한글 폰트 전체는 수 MB 라 Satori 의 500KB 번들 한도를 넘는다. 실제로 그릴 글자만
 * 요청하면 한 이미지당 수십 KB 로 떨어지고, 주제가 늘어도 서브셋이 자동으로 따라온다.
 *
 * User-Agent 를 비우는 것이 핵심이다. 최신 UA 를 보내면 Google 이 woff2 를 주는데
 * Satori 는 ttf/otf/woff 만 읽는다. UA 가 없으면 truetype 으로 응답한다.
 */
const fontCache = new Map<string, Promise<ArrayBuffer>>();

function fetchFontSubset(family: string, weight: number, text: string): Promise<ArrayBuffer> {
  const key = `${family}:${weight}:${text}`;
  const hit = fontCache.get(key);
  if (hit) return hit;

  const task = (async () => {
    const cssUrl =
      `https://fonts.googleapis.com/css2?family=${family}:wght@${weight}` +
      `&text=${encodeURIComponent(text)}`;
    const css = await fetch(cssUrl, { headers: { 'User-Agent': '' } }).then(r => r.text());

    const src = css.match(/src:\s*url\(([^)]+)\)/)?.[1];
    const format = css.match(/format\('([^']+)'\)/)?.[1];
    if (!src) {
      throw new Error(`OG 폰트: ${family} ${weight} 의 CSS 에서 url 을 찾지 못했습니다.\n${css.slice(0, 300)}`);
    }
    if (format && format !== 'truetype' && format !== 'opentype' && format !== 'woff') {
      // 조용히 넘기면 한글이 통째로 □□□ 로 나간다. 빌드에서 잡는 편이 낫다.
      throw new Error(`OG 폰트: Satori 가 읽을 수 없는 형식 '${format}'. User-Agent 처리를 확인하세요.`);
    }
    return fetch(src).then(r => r.arrayBuffer());
  })();

  // 실패한 Promise 를 그대로 캐시에 두면 같은 키의 이후 요청이 재시도 없이 계속
  // 실패한다. 워드마크처럼 여러 라우트가 공유하는 키에서 특히 문제가 된다 —
  // Gemini/Google Fonts 쪽 일시적 503 하나가 나머지 이미지까지 끌고 내려간다.
  // 캐시와 반환에 같은 Promise 를 쓰므로 처리되지 않은 rejection 은 생기지 않는다.
  const guarded = task.catch(err => {
    fontCache.delete(key);
    throw err;
  });
  fontCache.set(key, guarded);
  return guarded;
}

/**
 * 이 이미지에 실제로 그려질 글자만 모은다. 중복은 없애고 첫 등장 순서를 유지한다.
 *
 * split('') 이 아니라 전개 연산자를 쓴다. split('') 은 UTF-16 코드 유닛으로 잘라서
 * 이모지 같은 보조 평면 문자의 서로게이트 페어를 반으로 쪼갠다. 그러면 Google Fonts 의
 * text= 파라미터에 짝 잃은 서로게이트가 실려 나간다.
 */
export function glyphsOf(...parts: (string | undefined)[]): string {
  return [...new Set(parts.filter(Boolean).join(''))].join('');
}

export interface OgCardProps {
  /** 제목 위 작은 줄. 주제면 카테고리 라벨, 카테고리 인덱스면 '카테고리'. */
  eyebrow?: string;
  title: string;
  /** 제목 아래 한 줄 설명. 홈/카테고리에서 쓴다. */
  subtitle?: string;
  /** 1~3. 주어지면 카드와 같은 점 3개를 그린다. */
  difficulty?: 1 | 2 | 3;
  /**
   * 제목 자체가 워드마크인 경우(홈). 제목을 브랜드 서체로 그리고 우하단 워드마크를 지운다.
   * 그러지 않으면 같은 'Dr.Clarity' 가 서로 다른 서체로 두 번 찍힌다.
   */
  brand?: boolean;
}

/**
 * 모든 OG 이미지의 공통 레이아웃.
 *
 * Satori 는 flexbox 만 지원한다(grid 불가). 자식이 둘 이상인 요소에는 display:flex 를
 * 명시해야 하며, 생략하면 레이아웃이 조용히 어긋난다.
 */
export async function renderOgImage({
  eyebrow,
  title,
  subtitle,
  difficulty,
  brand = false,
}: OgCardProps) {
  const [bold, regular, brandFont] = await Promise.all([
    // 서브셋이 비면 Google 이 400 을 돌려주므로 최소 한 글자는 넘긴다.
    fetchFontSubset('Noto+Sans+KR', 700, glyphsOf(brand ? undefined : title) || 'A'),
    fetchFontSubset('Noto+Sans+KR', 400, glyphsOf(eyebrow, subtitle) || 'A'),
    fetchFontSubset('Outfit', 700, glyphsOf(WORDMARK, brand ? title : undefined)),
  ]);

  // 제목이 길면 줄 수가 늘어 세로로 넘친다. 글자 수로 단순 조절한다.
  const titleSize = title.length > 24 ? 62 : title.length > 16 ? 76 : 92;

  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          background: palette.bg,
          padding: '72px 80px',
          // 좌측 액센트 바 — 카드/사이트와 같은 강조색
          borderLeft: `24px solid ${palette.accent}`,
        }}
      >
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          {eyebrow && (
            <div
              style={{
                display: 'flex',
                fontFamily: 'Noto Sans KR',
                fontWeight: 400,
                fontSize: 34,
                color: palette.accent,
                marginBottom: 24,
              }}
            >
              {eyebrow}
            </div>
          )}
          <div
            style={{
              display: 'flex',
              fontFamily: brand ? 'Outfit' : 'Noto Sans KR',
              fontWeight: 700,
              fontSize: titleSize,
              lineHeight: 1.25,
              color: palette.text,
              letterSpacing: '-0.02em',
            }}
          >
            {title}
          </div>
          {subtitle && (
            <div
              style={{
                display: 'flex',
                fontFamily: 'Noto Sans KR',
                fontWeight: 400,
                fontSize: 32,
                lineHeight: 1.5,
                color: palette.muted,
                marginTop: 28,
              }}
            >
              {subtitle}
            </div>
          )}
        </div>

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          {/* 난이도 점 3개 — TopicCard 와 같은 크기·색 (8px, accent / muted-2) */}
          <div style={{ display: 'flex', alignItems: 'center' }}>
            {difficulty
              ? Array.from({ length: 3 }).map((_, i) => (
                  <div
                    key={i}
                    style={{
                      width: 18,
                      height: 18,
                      borderRadius: 9,
                      marginRight: 10,
                      background: i < difficulty ? palette.accent : palette['muted-2'],
                    }}
                  />
                ))
              : null}
          </div>
          {!brand && (
            <div
              style={{
                display: 'flex',
                fontFamily: 'Outfit',
                fontWeight: 700,
                fontSize: 40,
                color: palette.text,
              }}
            >
              {WORDMARK}
            </div>
          )}
        </div>
      </div>
    ),
    {
      ...OG_SIZE,
      fonts: [
        { name: 'Noto Sans KR', data: bold, weight: 700, style: 'normal' },
        { name: 'Noto Sans KR', data: regular, weight: 400, style: 'normal' },
        { name: 'Outfit', data: brandFont, weight: 700, style: 'normal' },
      ],
    }
  );
}

/**
 * 주제 페이지용. href 로 레지스트리를 조회한다.
 * 각 주제 디렉터리의 opengraph-image.tsx 가 자기 href 를 넘긴다.
 */
export async function renderTopicOgImage(href: string) {
  const topic = getTopicByHref(href);
  if (!topic) {
    // 폰트 형식 검사와 같은 이유로 빌드를 실패시킨다. 경고만 남기고 기본 이미지를
    // 돌려주면 빌드는 성공하는데 공유 카드만 조용히 틀린 채로 배포된다.
    throw new Error(
      `OG: 레지스트리에 없는 경로 '${href}'. opengraph-image.tsx 의 href 를 확인하거나 generate:registry 를 다시 돌리세요.`
    );
  }

  return renderOgImage({
    eyebrow: getCategory(topic.categoryId)?.label,
    title: topic.title,
    difficulty: topic.difficulty,
  });
}
