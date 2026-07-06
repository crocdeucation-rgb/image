---
version: alpha
name: Araon Growth
description: 아라온스쿨/픽클래스 그로스 산출물의 디자인 규칙. 단일 시스템이 아닌 스코프 4개의 모음 — 스코프 판별이 모든 작업의 첫 단계다.
typography:
  landing-h2:
    fontFamily: Spoqa Han Sans Neo
    fontSize: clamp(28px, 4vw, 64px)
    fontWeight: 900
    lineHeight: 1.2
    letterSpacing: -3px
  landing-eyebrow:
    fontFamily: Spoqa Han Sans Neo
    fontSize: 13px
    fontWeight: 500
    letterSpacing: 2px
  cardnews-body:
    fontFamily: Pretendard
    fontSize: 16px
    fontWeight: 400
  cardnews-quote:
    fontFamily: Georgia
    fontSize: 840px
    fontWeight: 400
rounded:
  card: 16px
  cta: 60px
  eyebrow: 20px
spacing:
  landing-max: 1500px
  landing-pad-y: 100px
  landing-pad-x: 24px
  card-pad: 24px 28px
components:
  landing-cta:
    rounded: "{rounded.cta}"
    padding: 22px 56px
  landing-card:
    rounded: "{rounded.card}"
    padding: "{spacing.card-pad}"
  landing-eyebrow:
    typography: "{typography.landing-eyebrow}"
    rounded: "{rounded.eyebrow}"
    padding: 6px 14px
---

# Araon Growth DESIGN.md

## Overview

이 문서는 하나의 브랜드 시스템이 아니라 **스코프 4개의 규칙 모음**이다.
어떤 디자인 작업이든 첫 단계는 스코프 판별이고, 해당 스코프의 규칙만 적용한다.

| 스코프 | 구조 규칙 | 색·폰트 결정 |
|---|---|---|
| ① 랜딩 (arawiki.kr) | CSS 표준·prefix 네이밍 준수 | 유동 — 작업 시 레퍼런스 확인 |
| ② 카드뉴스 | 상단 마커·하단 라벨 구조 | 유동 — 작업 시 레퍼런스 확인 |
| ③ 광고 소재 | 1:1 규격·에디터 워크플로우 | 유동 — **레퍼런스 없으면 질문 먼저** |
| ④ 내부 도구 | 기존 파일 수정 시 그 파일 톤 유지 | 자유 |

타겟은 초중등 자녀를 둔 30~40대 학부모. 랜딩은 신뢰와 기술력을,
광고 소재는 브랜드 통일성보다 **피드에서 눈에 띄는 것**을 우선한다.

## Colors

**전 스코프 공통: 고정 색상 없음.** 색감은 매 작업마다 사용자가 레퍼런스를 제공하고,
없으면 만들기 전에 색감 방향을 먼저 질문한다. 과거 다크+민트 조합(#060810/#00e5c8,
#0F1419/#2DDDB0)은 히스토리일 뿐 디폴트가 아니다.

- 로고·브랜드명 노출 시 가독성 확보는 필수.
- 광고 소재는 브랜드 통일성보다 피드에서 눈에 띄는 것 우선.
- 기존 파일(랜딩 섹션, 대시보드 등)을 수정할 땐 그 파일의 현재 팔레트를 유지한다.

## Typography

- **랜딩(①)**: 모든 메인 타이틀 = {typography.landing-h2}. 아임웹 자체 h2 CSS가
  덮어쓰므로 셀렉터 강화(`h2.클래스명, .클래스명`) + 전 속성 `!important` 필수.
  h2 내부는 `<span>`으로 감싸 `white-space: nowrap`, `word-break: keep-all`.
- **카드뉴스(②)**: Pretendard 본문 + Georgia 여는따옴표({typography.cardnews-quote},
  max-height로 클리핑). 상단 ●CHAPTER 0X 마커 + 페이지카운트, 하단 영문라벨 + 아라온스쿨.
- **광고 소재·내부 도구(③④)**: 고정 폰트 없음. 작업 성격에 맞게 웹폰트를 제안한다 —
  임팩트 훅이면 굵은 고딕 계열, 감성 소재면 명조/손글씨 계열, 문서면 가독성 계열.
  산돌구름은 웹 임베드 불가이므로 사용하지 않는다.

## Layout

- **광고 소재 규격: 1:1 (1080×1080) 단일 통일.** 단일이미지·캐러셀·카드뉴스 전부 동일.
- 랜딩 컨테이너: max-width {spacing.landing-max}, padding {spacing.landing-pad-y} {spacing.landing-pad-x}.
- 영상 소재의 학생 연령: 항상 13~14세.

## Elevation & Depth

랜딩(①)의 깊이는 그림자보다 **투명도 레이어**로 만든다 — 표면은 흰색 저투명도,
보더는 1px 저투명도, 호버 시 액센트색으로 물들며 4px 떠오르는 패턴.
배경 격자(액센트색 4% 투명도, 80px)로 기술적 질감. 구체 색값은 그때그때 팔레트를 따른다.

## Components

### 랜딩 CSS 표준 (재사용 코드 자산)

아래 스니펫은 구조 기준(셀렉터 강화, 레이아웃, 애니메이션 패턴)이다.
색값(민트 계열)은 현재 랜딩 기준 예시일 뿐 — 팔레트가 바뀌면 색만 치환해서 쓴다.

```css
/* 헤드라인 — 아임웹 덮어쓰기 대응 */
h2.클래스명, .클래스명 {
  font-family: 'Spoqa Han Sans Neo', var(--fn) !important;
  font-size: clamp(28px, 4vw, 64px) !important;
  font-weight: 900 !important;
  letter-spacing: -3px !important;
  line-height: 1.2 !important;
  color: #fff !important;
  word-break: keep-all;
}

/* 컨테이너 */
.wrap { width:100%; max-width:1500px; margin:0 auto; padding:100px 24px; }

/* 배경 격자 */
.section::before {
  content:''; position:absolute; inset:0;
  background-image:
    linear-gradient(rgba(0,229,200,0.04) 1px, transparent 1px),
    linear-gradient(90deg, rgba(0,229,200,0.04) 1px, transparent 1px);
  background-size:80px 80px; pointer-events:none; z-index:0;
}

/* Eyebrow 배지 */
.eyebrow {
  display:inline-block; font-size:13px; color:var(--teal,#00e5c8);
  letter-spacing:2px; padding:6px 14px;
  border:1px solid rgba(0,229,200,0.3); border-radius:20px;
  background:rgba(0,229,200,0.05); margin-bottom:18px;
}

/* 카드 */
.card {
  background:rgba(255,255,255,0.04);
  border:1px solid rgba(255,255,255,0.08);
  border-radius:16px; padding:24px 28px;
}
.card:hover {
  border-color:rgba(0,229,200,0.4); transform:translateY(-4px);
  box-shadow:0 12px 30px rgba(0,229,200,0.15);
}

/* CTA (민트 필 버튼) */
.cta {
  display:inline-flex; align-items:center; gap:14px;
  font-size:clamp(17px,1.6vw,22px); font-weight:900; color:#060810;
  background:linear-gradient(135deg, var(--teal,#00e5c8), #00b89c);
  padding:22px 56px; border:none; border-radius:60px; cursor:pointer;
  animation:cta-pulse 2.4s infinite;
}
@keyframes cta-pulse {
  0%,100% { box-shadow:0 8px 28px rgba(0,229,200,0.4); }
  50%     { box-shadow:0 12px 36px rgba(0,229,200,0.55); }
}

/* 모바일 패턴 — PC CTA 숨기고 화살표로 (CTA 중복 방지) */
.mo-arrow { display:none; }
@media (max-width:768px) {
  .cta { display:none; }
  .mo-arrow { display:flex; flex-direction:column; align-items:center; margin-top:14px; gap:4px; }
  .mo-arrow-text { font-size:12px; font-weight:900; color:var(--teal,#00e5c8); animation:mo-pulse 1.5s ease-in-out infinite; }
  .mo-arrow-icon { color:var(--teal,#00e5c8); animation:mo-bounce 0.9s ease-in-out infinite; }
  @keyframes mo-bounce { 0%,100%{transform:translateY(0);opacity:.6;} 50%{transform:translateY(6px);opacity:1;} }
}
@media (min-width:769px) { #ara-mob-bar { display:none !important; } }
```

### 클래스 네이밍

섹션별 고유 prefix(s6v-, opv-, rv-, cls- 등)를 모든 자식 요소에 붙여
아임웹 전역 CSS 충돌을 방지한다.

### 소재 제작 워크플로우

포토샵 없음. 에이전트가 **수정 가능한 HTML 에디터/템플릿**을 제공하면
사용자가 브라우저에서 조정 후 PNG로 추출한다(1080×1080 canvas export).
에디터 표준 기능: 이미지 크롭/줌/기울임, 훅 텍스트(*별표* 강조), 라벨·배지 드래그, PNG export.

## Do's and Don'ts

- **Do** 작업 시작 시 스코프(①~④)부터 판별하고 그 스코프의 규칙만 적용
- **Do** 광고 소재는 매번 색감 레퍼런스 확인 — 없으면 만들기 전에 질문
- **Do** 기존 파일 수정 시 그 파일의 기존 팔레트·톤 유지
- **Do** 내보내기 전 내부 메모 텍스트 잔존 여부 확인
- **Don't** 아임웹 섹션 코드에 `<body>`, `<html>` 태그 포함
- **Don't** 모바일에서 CTA 버튼 중복 노출 (섹션 CTA + 플로팅 바 동시 표시 금지)
- **Don't** 4:5(1080×1350) 규격 제안 — 소재는 1:1만
- **Don't** 산돌구름·포토샵 전제의 산출물 제안
