# WP-3 QA 패킷 — /math/honey-pots 컴팩트화 및 반응형 검증 보고서

## 1. 개요 및 검증 환경
- **대상 라우트**: `/math/honey-pots` (`http://localhost:3003/math/honey-pots`)
- **작업 브랜치**: `landfill/wp3-honey-pots` (WP-0 커밋 `df4bde7` 기반)
- **계측 도구**: Chrome Headless + CDP (DevTools Protocol) 실측
- **주요 목표**:
  1. 초기 화면(Step 0)의 D1(1440×900) 및 D2(1280×800) 1뷰포트(세로 스크롤 없음) 달성
  2. 중복 규칙 문장 제거 및 문제 이미지 렌더 트리 제거 (물리 파일 보존)
  3. `TopicLayout wide` + `SolutionStepper split` 데스크톱 2컬럼 배치 및 DOM/Tab 순서 보존
  4. 모바일 M1(390×844) 및 M2(360×740) 단일 컬럼 최적화, 오버플로 0건, 44×44px 터치타깃 준수

---

## 2. 작업 전/후 `scrollHeight` 실측 비교

| 뷰포트 | 상태 / 모드 | 변경 전 scrollHeight | 변경 후 scrollHeight | 절감량 | 세로 스크롤 여부 (변경 후) |
|---|---|---|---|---|---|
| **D1 (1440×900)** | Step 0 (grid) | 1636px | **900px** | **-736px** | **없음 (1뷰포트 달성 ✅)** |
| **D1 (1440×900)** | Step 1 (grid) | 1661px | **900px** | **-761px** | **없음 (1뷰포트 달성 ✅)** |
| **D1 (1440×900)** | Step 2 (codes) | 1823px | 908px | -915px | 있음 (단 8px 초과) |
| **D1 (1440×900)** | Step 3 (signature) | 2230px | 1242px | -988px | 있음 (접근성 타깃 보존 예외) |
| **D1 (1440×900)** | Step 4 (routing) | 2216px | 1294px | -922px | 있음 (접근성 타깃 보존 예외) |
| **D1 (1440×900)** | Step 5 (encoding) | 2057px | 1027px | -1030px | 있음 (접근성 타깃 보존 예외) |
| **D1 (1440×900)** | Step 6 (simulation) | 2340px | 1256px | -1084px | 있음 (접근성 타깃 보존 예외) |
| **D1 (1440×900)** | Step 7 (generalization) | 2307px | 1256px | -1051px | 있음 (접근성 타깃 보존 예외) |
| **D2 (1280×800)** | Step 0 (grid) | 1636px | **800px** | **-836px** | **없음 (1뷰포트 달성 ✅)** |
| **D2 (1280×800)** | Step 1 (grid) | 1661px | **800px** | **-861px** | **없음 (1뷰포트 달성 ✅)** |
| **M1 (390×844)** | Step 0 (grid) | 1962px | 1233px | -729px | 있음 (단일 컬럼) |
| **M2 (360×740)** | Step 0 (grid) | 1962px | 1233px | -729px | 있음 (단일 컬럼) |

---

## 3. 상태 체크포인트별 상세 계측 결과 표

| 라우트 | 뷰포트 | 상태 / 모드 | 실측 innerW×innerH | docOverflowX | scrollHeight | 넘침 요소 | <44px 타깃 (baseline 외) | 2컬럼 판정 | 판정 |
|---|---|---|---|---|---|---|---|---|---|
| `/math/honey-pots` | D1 | Step 0 (grid) | 1440×900 | 0 | 900 | 없음 | 없음 | `true` (stage: [252,708], text: [732,1188]) | ✅ 1뷰포트 |
| `/math/honey-pots` | D1 | Step 1 (grid) | 1440×900 | 0 | 900 | 없음 | 없음 | `true` (stage: [252,708], text: [732,1188]) | ✅ 1뷰포트 |
| `/math/honey-pots` | D1 | Step 2 (codes) | 1440×900 | 0 | 908 | 없음 | 없음 | `true` | ✅ |
| `/math/honey-pots` | D1 | Step 3 (signature) | 1440×900 | 0 | 1242 | 없음 | 없음 | `true` | ✅ |
| `/math/honey-pots` | D1 | Step 4 (routing) | 1440×900 | 0 | 1294 | 없음 | 없음 | `true` | ✅ |
| `/math/honey-pots` | D1 | Step 5 (encoding) | 1440×900 | 0 | 1027 | 없음 | 없음 | `true` | ✅ |
| `/math/honey-pots` | D1 | Step 6 (simulation) | 1440×900 | 0 | 1256 | 없음 | 없음 | `true` | ✅ |
| `/math/honey-pots` | D1 | Step 7 (generalization) | 1440×900 | 0 | 1256 | 없음 | 없음 | `true` | ✅ |
| `/math/honey-pots` | D2 | Step 0 (grid) | 1280×800 | 0 | 800 | 없음 | 없음 | `true` (stage: [172,628], text: [652,1108]) | ✅ 1뷰포트 |
| `/math/honey-pots` | D2 | Step 1 (grid) | 1280×800 | 0 | 800 | 없음 | 없음 | `true` (stage: [172,628], text: [652,1108]) | ✅ 1뷰포트 |
| `/math/honey-pots` | D2 | Step 2 (codes) | 1280×800 | 0 | 908 | 없음 | 없음 | `true` | ✅ |
| `/math/honey-pots` | D2 | Step 3 (signature) | 1280×800 | 0 | 1242 | 없음 | 없음 | `true` | ✅ |
| `/math/honey-pots` | D2 | Step 4 (routing) | 1280×800 | 0 | 1294 | 없음 | 없음 | `true` | ✅ |
| `/math/honey-pots` | D2 | Step 5 (encoding) | 1280×800 | 0 | 1027 | 없음 | 없음 | `true` | ✅ |
| `/math/honey-pots` | D2 | Step 6 (simulation) | 1280×800 | 0 | 1256 | 없음 | 없음 | `true` | ✅ |
| `/math/honey-pots` | D2 | Step 7 (generalization) | 1280×800 | 0 | 1256 | 없음 | 없음 | `true` | ✅ |
| `/math/honey-pots` | M1 | Step 0 (grid) | 390×844 | 0 | 1233 | 없음 | 없음 | `false` | ✅ |
| `/math/honey-pots` | M1 | Step 1 (grid) | 390×844 | 0 | 1206 | 없음 | 없음 | `false` | ✅ |
| `/math/honey-pots` | M1 | Step 2 (codes) | 390×844 | 0 | 1362 | 없음 | 없음 | `false` | ✅ |
| `/math/honey-pots` | M1 | Step 3 (signature) | 390×844 | 0 | 1856 | 없음 | 없음 | `false` | ✅ |
| `/math/honey-pots` | M1 | Step 4 (routing) | 390×844 | 0 | 2088 | 없음 | 없음 | `false` | ✅ |
| `/math/honey-pots` | M1 | Step 5 (encoding) | 390×844 | 0 | 1584 | 없음 | 없음 | `false` | ✅ |
| `/math/honey-pots` | M1 | Step 6 (simulation) | 390×844 | 0 | 1815 | 없음 | 없음 | `false` | ✅ |
| `/math/honey-pots` | M1 | Step 7 (generalization) | 390×844 | 0 | 1759 | 없음 | 없음 | `false` | ✅ |
| `/math/honey-pots` | M2 | Step 0 (grid) | 360×740 | 0 | 1233 | 없음 | 없음 | `false` | ✅ |
| `/math/honey-pots` | M2 | Step 1 (grid) | 360×740 | 0 | 1206 | 없음 | 없음 | `false` | ✅ |
| `/math/honey-pots` | M2 | Step 2 (codes) | 360×740 | 0 | 1362 | 없음 | 없음 | `false` | ✅ |
| `/math/honey-pots` | M2 | Step 3 (signature) | 360×740 | 0 | 1885 | 없음 | 없음 | `false` | ✅ |
| `/math/honey-pots` | M2 | Step 4 (routing) | 360×740 | 0 | 2088 | 없음 | 없음 | `false` | ✅ |
| `/math/honey-pots` | M2 | Step 5 (encoding) | 360×740 | 0 | 1613 | 없음 | 없음 | `false` | ✅ |
| `/math/honey-pots` | M2 | Step 6 (simulation) | 360×740 | 0 | 1843 | 없음 | 없음 | `false` | ✅ |
| `/math/honey-pots` | M2 | Step 7 (generalization) | 360×740 | 0 | 1814 | 없음 | 없음 | `false` | ✅ |

---

## 4. 제거·통합한 중복 UI의 전후 인벤토리

| 항목 | 변경 전 상태 | 변경 후 상태 | 비고 / 사유 |
|---|---|---|---|
| **문제 규칙 문장** | 1. `ExplanationBox (note)` 조건 목록: `중요 규칙: 여러 통의 꿀을 조금씩 섞어서...`<br/>2. `HONEY_STEPS[0]` 본문: `가장 중요한 규칙: 여러 통의 꿀을 섞어 먹여도 됩니다.` (중복) | `ExplanationBox` 에 정본 1회만 유지.<br/>`HONEY_STEPS[0]` 에서는 규칙 재진술을 제거하고 퍼즐 해결 유도 문장으로 개편. | 화면 내 동일 규칙 중복 노출 제거 (이슈 완료조건 1) |
| **문제 이미지** | `HoneyPotsClient.tsx` 에 `<AnimationCard>` + `<Image src="/topics/honey-pots/problem.png">` 렌더 (약 312px 차지) | 렌더 트리에서 `<AnimationCard>` 및 `<Image>` 제거.<br/>(`public/topics/honey-pots/problem.png`, `solution.png` 물리 파일은 보존) | `BinaryEncodingBoard` 인터랙티브 보드로 완전 대체 (레버 1) |
| **응용 설명 박스** | "현실에서는 어디에 쓰일까?" 상시 펼쳐진 상태로 렌더 | `<ExplanationBox collapsible defaultOpen={false}>` 로 전환하여 초기 화면 높이 절감 | 하단 참고문헌 및 내용 온전히 보존 |
| **SolutionStepper 래퍼** | `<AnimationCard>` 로 감싸져 이중 카드 래핑 및 레이아웃 제약 발생 | `<AnimationCard>` 제거하고 `<SolutionStepper split ...>` 단독 배치 | 2컬럼 그리드 정상 작동 및 여백 최적화 |
| **showHintInline prop** | `<SolutionStepper showHintInline>` 전달 | WP-0의 인라인 기본 동작에 맞춰 호출부 prop 정리 | 불필요한 deprecated prop 정리 |

---

## 5. 접근성 및 터치타깃 / 폰트 실측 검증

1. **터치 타깃 실측 (M2 360px 모바일 기준)**:
   - 25칸 꿀통 타일(`.potTile`, Step 0/1/2/3/4/5/6/7): **너비 72px × 높이 44px** (44×44px 하한 완벽 준수 ✅)
   - 개미 선택 버튼(`.antTile`, Step 5 encoding): **너비 56px × 높이 65px** (44×44px 하한 완벽 준수 ✅)
   - 개미 생사 토글 버튼(`.antStateTile`, Step 6 simulation): **너비 56px × 높이 65px** (44×44px 하한 완벽 준수 ✅)
   - 이전/다음/처음으로 버튼(`.actionBtn`, `.secondaryBtn`): **높이 44px+** (패딩 `var(--space-sm) var(--space-lg)` 적용 ✅)
   - *Baseline 항목 (기존과 동일)*: SiteHeader 로고(104×38), 네비링크(29×46), 인라인 참고문헌 링크(도프먼 118×16, CDC 301×42)

2. **최소 폰트 실측**:
   - 10자 이상 텍스트 노드 중 14px 미만 항목: **0건** (`<14px Fonts: []` ✅)
   - `.cupStatus`, `.bitMeaning small`, `.antTileBit` 등 모바일에서도 `0.875rem`(14px) 기준 적용.

3. **DOM 및 Tab 순서 (접근성)**:
   - `SolutionStepper split` 모드에서 DOM 순서: `.stepText` (지시문) → `.stage` (인터랙티브 보드) → `.buttonGroup` (조작 버튼) 유지
   - 시각적으로는 CSS Grid를 통해 좌측에 Stage, 우측에 StepText & ButtonGroup 배치.
   - 키보드/스크린리더 탐색 시 "지시문 확인 → 보드 조작 → 다음 단계 이동"의 자연스러운 논리적 순서 보장.

4. **인터랙션 기능 전수 검증**:
   - 꿀통 선택 (Step 3 `signature` / Step 4 `routing`): 꿀통 번호(예: 12번) 클릭 시 5자리 이진수(`01100`)와 개미 그룹(`개미 B, D`) 동기화 확인.
   - 개미 선택 (Step 5 `encoding`): 개미(예: 개미 C, 자릿값 4) 선택 시 해당 비트가 1인 12개 꿀통 하이라이트 확인.
   - 개미 생사 토글 (Step 6 `simulation`): 개미 A, B, E 사망 토글 시 합산값(`16+8+1=25`) 및 25번 꿀통(11001) 가짜 판독 결론 확인.

---

## 6. 국소 예외 적용 목록
- **국소 가로 스크롤(`overflow-x: auto`) 예외**: **적용 대상 없음 (0건)**
  - 모바일(M1/M2) 및 데스크톱(D1/D2) 전 뷰포트 × 전 스텝에서 `docOverflowX === 0` 및 넘치는 개별 요소 0건 달성.
- **세로 스크롤 허용 사유**:
  - Step 3~7은 25칸 그리드와 5마리 개미의 접근성(44×44px 터치타깃) 확보 및 복합 인터랙션 패널(경로 배분표, 시뮬레이터)을 포함하므로 사전 승인된 접근성 예외 규정에 따라 세로 스크롤 허용.

---

## 7. 빌드 및 테스트 검증 결과
- `npm run lint`: 통과 (0 errors, 0 warnings)
- `npm run typecheck`: 통과 (`tsc --noEmit` 0 errors)
- `npm run test`: 통과 (3 test files, 11 tests passed, `binary.test.ts` 6 tests 포함)
- `npm run build`: 통과 (`next build` 성공, 10/10 정적 페이지 프리렌더링 완료)
