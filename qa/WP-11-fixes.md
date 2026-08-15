# WP-11 검증 보고서 — 모바일 헤더 레이아웃 수정 및 1줄 최적화

- **검증 일시**: 2026-08-15
- **대상 브랜치**: `feat/16-responsive-compact`
- **검증 환경**: Next.js App Router (`npm run dev -- --port 3000`), Microsoft Edge Headless (CDP 실측)
- **수정 파일**:
  - `src/components/layout/SiteHeader.module.css`
  - `qa/shots/header-320.png`
  - `qa/shots/header-360.png`
  - `qa/shots/header-1440.png`
  - `qa/WP-11-fixes.md`

---

## 1. 문제 분석 및 수정 내용

### (1) 문제 배경 및 원인 (기존 Baseline 결함)
- **기존 상태**:
  - 데스크톱 규격(`padding: 0 2rem`, `.logo font-size: 1.5rem`, `.link font-size: 1rem`, `gap: 1rem`)이 모바일에서도 거의 그대로 유지됨.
  - 360px 모바일 화면에서 가용 폭(296px) 대비 로고+네비 필요 폭(363px)이 67px 부족하여, 링크 텍스트("수학 퍼즐", "컴퓨터 사이언스", "인공지능")가 2줄로 줄바꿈되고 로고 영역과 겹침 발생.
  - 320px 화면에서는 "컴퓨터 사이언스"가 4줄로 쪼개지며 헤더 높이(70px)를 초과하여 외부로 넘침 발생.
- **해결 원칙**:
  - 카테고리 텍스트 변경 없이 순수 CSS 반응형 치수 조정으로 **한 줄 정렬** 달성.
  - 14px 폰트 하한선 준수.
  - 햄버거 메뉴 없이 간결하고 가벼운 헤더 유지.
  - 모바일 링크 터치 타깃 44×44px 확보 및 액티브 밑줄 정렬.
  - 320px 초소형 뷰포트까지 가로 오버플로 0px 및 안전 마진 확보.
  - 데스크톱(1440px / 905px) 헤더 무변경 보존.

### (2) 적용된 CSS 규칙 (`SiteHeader.module.css`)

```css
@media (max-width: 768px) {
  .content {
    padding: 0 0.75rem;
  }

  .logo {
    font-size: 1.15rem;
    letter-spacing: -0.3px;
  }

  .nav ul {
    gap: 0.5rem;
  }

  .link {
    font-size: 0.875rem;
    white-space: nowrap;
    display: inline-flex;
    align-items: center;
    min-height: 44px;
    padding: 0.25rem 0;
  }

  .link.active::after {
    bottom: 6px;
  }
}

@media (max-width: 359px) {
  .content {
    padding: 0 0.5rem;
  }

  .logo {
    font-size: 1.05rem;
  }

  .nav ul {
    gap: 0.35rem;
  }
}
```

---

## 2. 6개 뷰포트 헤더 실측 데이터 (CDP 계측)

| 뷰포트 | 뷰포트 폭 | 로고 rect (x, w, r) | 로고 폰트 | 네비 링크 3종 폭 (수학 / CS / AI) | 링크 폰트 | 로고~네비 간격 | 겹침 여부 | 줄 수 | 헤더 높이 초과 |
|---|---|---|---|---|---|---|:---:|:---:|:---:|
| **320px** | 320px | x: 8, w: 73.5, r: 81.5 | 16.8px (1.05rem) | 54.2px / 93.0px / 51.5px | 14px (0.875rem) | **20.5px** | **0 (없음)** | **1줄** | **No (56.5px <= 70px)** |
| **360px** | 360px | x: 12, w: 80.8, r: 92.8 | 18.4px (1.15rem) | 54.2px / 93.0px / 51.5px | 14px (0.875rem) | **40.5px** | **0 (없음)** | **1줄** | **No (56.5px <= 70px)** |
| **390px** | 390px | x: 12, w: 80.8, r: 92.8 | 18.4px (1.15rem) | 54.2px / 93.0px / 51.5px | 14px (0.875rem) | **70.5px** | **0 (없음)** | **1줄** | **No (56.5px <= 70px)** |
| **768px** | 768px | x: 12, w: 80.8, r: 92.8 | 18.4px (1.15rem) | 54.2px / 93.0px / 51.5px | 14px (0.875rem) | **448.5px** | **0 (없음)** | **1줄** | **No (56.5px <= 70px)** |
| **905px** | 905px | x: 32, w: 104.3, r: 136.3 | 24px (1.5rem) | 61.9px / 106.3px / 58.9px | 16px (1.0rem) | **445.6px** | **0 (없음)** | **1줄** | **No (53.7px <= 70px)** |
| **1440px** | 1440px | x: 252, w: 104.3, r: 356.3 | 24px (1.5rem) | 61.9px / 106.3px / 58.9px | 16px (1.0rem) | **540.6px** | **0 (없음)** | **1줄** | **No (53.7px <= 70px)** |

---

## 3. 전체 7개 라우트 × 6개 뷰포트 오버플로 검증 (42조합 100% PASS)

| 라우트 | 320px | 360px | 390px | 768px | 905px | 1440px |
|---|:---:|:---:|:---:|:---:|:---:|:---:|
| `/` (홈) | 0px ✅ | 0px ✅ | 0px ✅ | 0px ✅ | 0px ✅ | 0px ✅ |
| `/math` | 0px ✅ | 0px ✅ | 0px ✅ | 0px ✅ | 0px ✅ | 0px ✅ |
| `/cs` | 0px ✅ | 0px ✅ | 0px ✅ | 0px ✅ | 0px ✅ | 0px ✅ |
| `/ai` | 0px ✅ | 0px ✅ | 0px ✅ | 0px ✅ | 0px ✅ | 0px ✅ |
| `/math/geometry-area` | 0px ✅ | 0px ✅ | 0px ✅ | 0px ✅ | 0px ✅ | 0px ✅ |
| `/math/honey-pots` | 0px ✅ | 0px ✅ | 0px ✅ | 0px ✅ | 0px ✅ | 0px ✅ |
| `/cs/floating-point` | 0px ✅ | 0px ✅ | 0px ✅ | 0px ✅ | 0px ✅ | 0px ✅ |

---

## 4. 터치 타깃 및 접근성 검증

- **모바일 네비 링크 (`.link`)**:
  - `min-height: 44px`, `display: inline-flex`, `align-items: center` 적용으로 **높이 44px 터치 타깃 100% 충족** (`touchH: true`).
  - 기존 `qa/WP-0-baseline.md`에 기록되었던 네비 링크 높이 20px 미달 결함 완전 해소.
- **액티브 밑줄 (`.link.active::after`)**:
  - `bottom: 6px` 지정으로 44px 박스 내부 텍스트 하단 2px 지점에 정확히 정렬.
- **데스크톱(1440px, 905px) 무변경 확인**:
  - 데스크톱에서는 기존 폰트(`1.5rem` / `1rem`), 패딩(`0 2rem`), 간격(`2rem`)이 100% 동일하게 유지됨.

---

## 5. 저장된 스크린샷

- `qa/shots/header-320.png`: 320px 화면에서 로고와 네비 링크 3개가 1줄로 겹침 없이 넉넉하게 표시됨.
- `qa/shots/header-360.png`: 360px 표준 모바일 화면에서 완벽한 1줄 배치 및 active 밑줄 렌더링.
- `qa/shots/header-1440.png`: 1440px 대형 데스크톱 화면에서 기존 디자인과 100% 일치.

---

## 6. 검증 스위트 4종 결과

| 검사 항목 | 명령어 | 결과 |
|---|---|:---:|
| Lint | `npm run lint` | **PASS ✅ (0 errors)** |
| Typecheck | `npm run typecheck` | **PASS ✅ (0 errors)** |
| Unit Test | `npm run test` | **PASS ✅ (3 test files, 11 tests passed)** |
| Production Build | `npm run build` | **PASS ✅ (10 routes prerendered successfully)** |
