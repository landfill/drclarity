# WP-1 QA 패킷 — /cs/floating-point 컴팩트화 검증

## 1. 개요 및 확인 URL
- **대상 라우트**: `/cs/floating-point` ("왜 0.1 + 0.2는 0.3이 아닐까?")
- **확인 URL**: `http://localhost:3001/cs/floating-point` (배정 포트: 3001)
- **작업 브랜치**: `feat/16-responsive-compact` (WP-0 커밋 `df4bde7` 기반 분기)
- **수정 허용 파일 목록**:
  - `src/app/(topics)/cs/floating-point/page.tsx`
  - `src/app/(topics)/cs/floating-point/page.module.css` (신규)
  - `src/app/(topics)/cs/floating-point/PizzaSlicer.module.css`
  - `src/app/(topics)/cs/floating-point/CalculatorReveal.module.css`
  - `qa/WP-1-qa-packet.md` (본 문서)

---

## 2. 변경 및 최적화 내역

1. **데스크톱 2컬럼 그리드 레이아웃 구축**:
   - `TopicLayout`에 `wide` prop 적용 (`max-width: var(--index-max-w)` = 1000px).
   - `page.module.css`를 신규 생성하여 1100px 이상에서 CSS Grid 2컬럼 레이아웃 적용:
     - 좌측 컬럼 (1열 1행): `AnimationCard` (`PizzaSlicer`)
     - 우측 컬럼 (2열 1행): `ExplanationBox` (통합 해설 박스)
     - 하단 전폭 (1~2열 2행): `CalculatorReveal`
   - 1100px 미만 태블릿 및 모바일에서는 단일 컬럼(Flex column)으로 자연스럽게 복귀.

2. **`ExplanationBox` 2개 통합 (문장 100% 보존)**:
   - "부동소수점 오류란?" 박스와 "핵심 문제" 노트를 하나의 `ExplanationBox`로 통합.
   - 불필요한 카드 외곽 여백과 중복 테두리를 제거하여 초기 높이를 대폭 절감하고 가독성 향상.

3. **모듈 CSS 토큰화 및 반응형 최적화**:
   - `PizzaSlicer.module.css` 및 `CalculatorReveal.module.css`의 margin/padding/font-size를 `globals.css`의 `--space-*`, `--fs-*`, `--radius-*`, `--media-max-h*` 토큰으로 일원화.
   - `PizzaSlicer` 피자 크기를 150px(모바일 130px)로 조정하여 2컬럼 좌측 컬럼 및 모바일 화면에서 두 피자가 안정적으로 나란히 배치되도록 최적화.
   - 상태 텍스트(`status`)에 `min-height: 2.8rem`을 확보하여 긴 텍스트 줄바꿈 시 레이아웃 덜컹거림 방지.

4. **접근성 및 터치 타깃 준수**:
   - `PizzaSlicer` 및 `CalculatorReveal`의 모든 인터랙티브 버튼에 `min-height: 44px`, `min-width: 44px`를 적용하여 WCAG 터치 타깃 규격 준수.
   - 본문 폰트 크기 `var(--fs-body)` (16px) 이상 유지.

5. **국소 가로 오버플로 예외**:
   - `CalculatorReveal`의 `.display` 및 `.explanationPanel`에 국소 `overflow-x: auto`를 적용하여 좁은 360px 모바일 화면에서도 텍스트가 잘리거나 전역 가로 스크롤바가 발생하지 않도록 방어.

---

## 3. UI 통합 및 중복 제거 전후 인벤토리

| 구분 | Before (작업 전) | After (작업 후) | 개선 효과 |
|---|---|---|---|
| **레이아웃 구조** | 단일 세로 스택 (전폭 800px) | 1100px+ 2컬럼 Grid (1000px 확장), <1100px 세로 스택 | 데스크톱 가로 공간 활용, D1 초기 높이 1192px → 900px (1뷰포트 달성) |
| **해설 박스** | `ExplanationBox` 2개 (일반 박스 + 노트 박스) | `ExplanationBox` 1개로 통합 | 카드 래퍼 여백 제거, 문장 무손실 유지 |
| **피자 애니메이션** | 고정 200px (세로 래핑 빈번, 여백 4rem) | 150px/130px 반응형 (`--space-lg` 여백) | 좌측 컬럼 내 2개 피자 나란히 정렬, 높이 대폭 절감 |
| **터치 타깃** | 버튼 기본 패딩 (38~40px) | `min-height: 44px`, `min-width: 44px` 명시 | WCAG 44×44px 터치타깃 100% 준수 |

---

## 4. 실측 검증 결과 (Headless Chrome + CDP 계측)

### A. 뷰포트별 / 상태별 계측표

| 뷰포트 (ID) | 상태 체크포인트 | 실측 뷰포트 | Before scrollH | After scrollH | 높이 감소량 | docOverflowX | 44px 미만 타깃 | 2컬럼 (sideBySide) | 판정 |
|---|---|---|---|---|---|---|---|---|---|
| **D1 (Desktop Large)** | 1) 초기 상태 | 1440×900 | 1192px | **900px** | -292px (-24.5%) | 0px | 없음 (Baseline 외 0) | **true** | ✅ (1뷰포트) |
| **D1 (Desktop Large)** | 2) 피자 애니메이션 완료 | 1440×900 | 1192px | **900px** | -292px (-24.5%) | 0px | 없음 (Baseline 외 0) | **true** | ✅ (1뷰포트) |
| **D1 (Desktop Large)** | 3) 계산기 결과 전개 완료 | 1440×900 | 1443px | **1008px** | -435px (-30.1%) | 0px | 없음 (Baseline 외 0) | **true** | ✅ (예외 인정) |
| **D1 (Desktop Large)** | 4) reduced-motion 모드 | 1440×900 | 1471px | **1059px** | -412px (-28.0%) | 0px | 없음 (Baseline 외 0) | **true** | ✅ |
| **D2 (Desktop Med)** | 1) 초기 상태 | 1280×800 | 1192px | **822px** | -370px (-31.0%) | 0px | 없음 (Baseline 외 0) | **true** | ✅ |
| **D2 (Desktop Med)** | 2) 피자 애니메이션 완료 | 1280×800 | 1192px | **822px** | -370px (-31.0%) | 0px | 없음 (Baseline 외 0) | **true** | ✅ |
| **D2 (Desktop Med)** | 3) 계산기 결과 전개 완료 | 1280×800 | 1443px | **1008px** | -435px (-30.1%) | 0px | 없음 (Baseline 외 0) | **true** | ✅ |
| **D2 (Desktop Med)** | 4) reduced-motion 모드 | 1280×800 | 1471px | **1059px** | -412px (-28.0%) | 0px | 없음 (Baseline 외 0) | **true** | ✅ |
| **M1 (Mobile iPhone)** | 1) 초기 상태 | 390×844 | 1571px | **1113px** | -458px (-29.2%) | 0px | 없음 (Baseline 외 0) | **false** | ✅ |
| **M1 (Mobile iPhone)** | 2) 피자 애니메이션 완료 | 390×844 | 1571px | **1113px** | -458px (-29.2%) | 0px | 없음 (Baseline 외 0) | **false** | ✅ |
| **M1 (Mobile iPhone)** | 3) 계산기 결과 전개 완료 | 390×844 | 1903px | **1329px** | -574px (-30.2%) | 0px | 없음 (Baseline 외 0) | **false** | ✅ |
| **M1 (Mobile iPhone)** | 4) reduced-motion 모드 | 390×844 | 1928px | **1329px** | -599px (-31.1%) | 0px | 없음 (Baseline 외 0) | **false** | ✅ |
| **M2 (Mobile Android)**| 1) 초기 상태 | 360×740 | 1616px | **1158px** | -458px (-28.3%) | 0px | 없음 (Baseline 외 0) | **false** | ✅ |
| **M2 (Mobile Android)**| 2) 피자 애니메이션 완료 | 360×740 | 1616px | **1158px** | -458px (-28.3%) | 0px | 없음 (Baseline 외 0) | **false** | ✅ |
| **M2 (Mobile Android)**| 3) 계산기 결과 전개 완료 | 360×740 | 1968px | **1374px** | -594px (-30.2%) | 0px | 없음 (Baseline 외 0) | **false** | ✅ |
| **M2 (Mobile Android)**| 4) reduced-motion 모드 | 360×740 | 2008px | **1374px** | -634px (-31.6%) | 0px | 없음 (Baseline 외 0) | **false** | ✅ |

---

## 5. 수동 재현 및 검증 절차 (WP-4 시각 QA용)

### 인터랙션 순서:
1. 브라우저에서 `http://localhost:3001/cs/floating-point` 접속
2. **D1 (1440×900) 데스크톱 확인**:
   - 좌측에 피자 슬라이서, 우측에 해설 박스가 나란히 2컬럼으로 배치되는지 확인
   - 세로 스크롤바 없이 1화면에 들어오는지 확인 (초기 scrollHeight: 900px)
   - "피자 자르기!" 버튼 클릭 (44×44px 이상 터치타깃) → 10진 피자 분할 및 2진 피자 슬라이스 애니메이션 동작 확인
   - 하단 "진실 확인하기" 버튼 클릭 → 타이프라이터 효과로 `0.30000000000000004` 연출 및 터미널 해설 패널 노출 확인
3. **M1 (390×844) / M2 (360×740) 모바일 확인**:
   - F12 개발자 도구 → 디바이스 툴바 켜기 (iPhone 14 / 360×740)
   - 단일 컬럼으로 피자 애니메이션 → 해설 → 계산기가 순서대로 정상 스택되는지 확인
   - 가로 오버플로(`docOverflowX`) 0 확인
4. **접근성 및 reduced-motion 확인**:
   - OS/브라우저의 "애니메이션 줄이기" 옵션 활성화 시 타이머/흔들림 애니메이션이 즉시 최종 상태로 렌더링되는지 확인

---

## 6. 품질 검사 4종 결과

- `npm run lint`: **PASS (0 errors, 0 warnings)**
- `npm run typecheck`: **PASS (0 errors)**
- `npm run test`: **PASS (3 test files, 11 tests passed, including binaryFractions.test.ts)**
- `npm run build`: **PASS (Turbopack 빌드 성공 및 7개 정적 라우트 SSG 생성 완료)**
