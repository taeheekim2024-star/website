# DMSE Lab — Data-driven Materials Synthesis and Engineering Laboratory

데이터 기반 소재 합성 및 공학 연구실 웹사이트. 정적 사이트이며 빌드 단계가 없다. `dist/`를 그대로 호스팅하면 된다.

## 구조

| 파일 | 역할 |
|---|---|
| `dist/index.html` | 첫 화면. Three.js 인터랙티브 "material world" 히어로 + Our approach + 연구 분야 6개 + 대표 논문 + 뉴스 + Join |
| `dist/research.html` | 연구 소개. 4단계 접근법 + 연구 분야 6개(히어로의 6개 오브젝트와 같은 id: ai, synthesis, pores, capture, catalysis, energy) |
| `dist/people.html` | PI 소개 + 구성원(`data/people.json`) |
| `dist/publications.html` | 논문 전체 목록. 검색·연도 필터. `data/publications.json` |
| `dist/news.html` | 소식. `data/news.json` |
| `dist/join.html` | 모집 안내·지원 방법·연락처. 메일 버튼은 제목과 양식이 채워진 메일을 연다. 질문과 답은 `data/faq.json` |
| `dist/sim.html` | 연구 분야 시뮬레이션. 분야마다 모형 하나(`dist/sim.js`): AI 추천으로 조성 찾기, 졸에서 겔과 건조, CO₂ 흡착과 재생, 수소 발생과 결합 세기, 다공성 전극의 전하 저장. 장면은 Three.js로 그리고(`dist/vendor/three.module.js`를 importmap으로 불러옴), WebGL을 못 쓰는 브라우저에서는 2D 캔버스 그림으로 대신한다. 연구 페이지와 첫 화면의 분야 그림을 누르면 `sim.html#분야`로 온다. 페이지는 `tools/gen-pages.pl`이 만든다 |
| `dist/fit.html`, `dist/fit-*.html` | 연구 분야 찾기(질문 다섯 개)와 분야별 결과 페이지. 질문은 `dist/fit.js`, 페이지는 `tools/gen-pages.pl`이 만든다 |
| `dist/assets/og/` | 카카오톡 등 링크 미리보기용 카드 이미지(1200×630). `tools/render-og.ps1`이 `tools/og-card.html`에서 렌더 |
| `dist/gallery.html` | 갤러리. `data/gallery.json`의 사진을 격자로, 클릭하면 크게. 사진은 `dist/assets/gallery/`에 넣고 JSON에 추가 |
| `dist/software.html` | 소프트웨어. 연구실에서 공개한 프로그램(PikaXPS·PikaPDF) 소개와 내려받기. 설치 파일은 GitHub Releases에만 두고 "latest" 링크로 연결하며, 버전·날짜·파일 크기는 GitHub API로 자동 표시. 프로그램을 더하거나 고칠 때는 이 파일과 `dist/en/software.html`을 함께 수정 |
| `dist/style.css` | 히어로 페이지 원본 스타일(색·서체 토큰 포함) |
| `dist/site.css` | 서브페이지와 새 섹션의 공용 스타일 |
| `dist/site.js` | 내비게이션 현재 표시, `data/site.json` 주입, 논문·뉴스·구성원 렌더링 |
| `dist/*.html` | 한국어판(기본). 도메인 루트가 한국어 |
| `dist/en/*.html` | 영어판. `<base href="../">`로 같은 스크립트·데이터·이미지를 공유 |
| `dist/ko/*.html` | 예전 한국어 주소용 리다이렉트 스텁(루트로 보냄) |
| `dist/scene.js` 외 | 히어로 3D 장면. 페이지 `lang`이 ko이면 단계·라벨 문구만 한국어로 바뀜(`KO` 블록) |

## 내용 수정

HTML을 건드리지 않고 `dist/data/*.json`만 고치면 된다.

- `site.json` — 이메일·주소·대학·Scholar/ORCID/GitHub 링크. 비워 두면 해당 줄이 자동으로 숨겨진다.
  - `notice`/`notice_ko` — 모든 페이지 맨 위 모집 띠의 문구. 둘 다 비우면 띠와 구성원 페이지의 "모집 중" 카드가 사라진다.
  - `booking`, `kakao` — 지원 안내의 상담 시간 예약 링크와 카카오톡 오픈채팅 링크. 주소를 넣으면 버튼이 나타난다.
- `faq.json` — 지원 안내의 자주 묻는 질문. `q`/`q_ko`, `a`/`a_ko`. 비어 있으면 섹션이 숨겨진다.
- `publications.json` — 논문. `lead: true`는 주저자·교신 논문, `featured: true`는 첫 화면 대표 논문. 저자 이름 끝의 `*`는 교신저자, `§`는 공동 제1저자 표시이고 "Taehee Kim"은 자동으로 굵게. 영향력지수 같은 숫자는 싣지 않는다.
- `news.json` — `date`, `title`/`title_ko`, `body`/`body_ko`, `link`(선택).
- `gallery.json` — `src`(예: `assets/gallery/2026-09-lab.jpg`), `alt`, `caption`/`caption_ko`, `date`(YYYY-MM). 최신순 정렬.
- `people.json` — `groups[].members[]`에 `member_template` 형식으로 추가. 사진은 `dist/assets/people/이름.jpg` 같은 상대 경로.

로고: `dist/assets/logo.png`(원본, 푸터), `logo-mark.png`(헤더·파비콘용 투명 마크), 파비콘은 `favicon-64.png`·`apple-touch-icon.png`. 연구 그림은 `dist/assets/research/`(`work/logo/process-assets.ps1`로 원본에서 자름). PI 사진 `dist/assets/people/taehee-kim.jpg`.

연구 분야 찾기와 시뮬레이션: 두 페이지는 연구 페이지(`research.html`)의 분야 이름·설명·주제를 그대로 옮겨 쓴다. 연구 페이지 문구나 지원 안내 페이지의 머리·꼬리를 고친 뒤에는 `dist/`에서 `perl ../tools/gen-pages.pl`을 다시 실행한다. 시뮬레이션의 설명 문구와 모형, 3D 장면은 모두 `dist/sim.js` 안에 있다(모형은 `SIMS.*`, 장면은 `*View`, 공통 조명·카메라는 `makeStudio`). `sim.js`나 시뮬레이션 스타일(`light.css`의 `.sim-*`)을 고치면 `tools/gen-pages.pl`의 `sim3d` 버전 문자열을 올리고 페이지를 다시 만든다. 공유 카드 문구는 `tools/og-card.html`에 있고, 고친 뒤 `tools/render-og.ps1`을 실행한다.

## 로컬 확인

브라우저가 `fetch`로 JSON을 읽으므로 파일을 더블클릭해 열면 안 되고 HTTP 서버가 필요하다.

```bash
node ../../work/serve-site.mjs dist
```

또는 Python이 있으면 `python -m http.server 4173 -d dist`.

## 배포 (taeheekim.kr, GitHub Pages)

도메인은 가비아에서 구매한 `taeheekim.kr`. 호스팅은 GitHub Pages, 배포는 `.github/workflows/deploy.yml`이 `main`에 push될 때마다 `dist/`를 올린다. `dist/CNAME`에 도메인이 들어 있다.

1. GitHub에 저장소를 만들고 이 폴더를 push (`git remote add origin …` → `git push -u origin main`).
2. 저장소 Settings → Pages → Build and deployment → Source: **GitHub Actions**.
3. 같은 화면 Custom domain에 `taeheekim.kr` 입력 → Save. DNS 확인이 끝나면 **Enforce HTTPS** 체크.
4. 가비아 My가비아 → 도메인 → DNS 관리 → 레코드 추가:

| 타입 | 호스트 | 값 |
|---|---|---|
| A | @ | 185.199.108.153 |
| A | @ | 185.199.109.153 |
| A | @ | 185.199.110.153 |
| A | @ | 185.199.111.153 |
| CNAME | www | `<계정>.github.io` |

DNS 전파는 보통 10분~수 시간, 인증서 발급은 DNS 확인 후 최대 24시간. 이후 갱신은 `main`에 push만 하면 된다.

## 히어로 장면 메모

히어로는 Codex가 만든 원본을 유지한다. 6개 오브젝트(AI material design, Controlled synthesis, Nanoporous architecture, Selective adsorption, Molecular catalysis, Electrochemical energy)는 연구 페이지의 6개 분야와 일대일로 대응한다. 장면·상호작용·접근성 동작은 원본 README 내용과 같다: 마우스로 궤도 회전, 오브젝트 드래그, 라벨 선택으로 설명 보기, 키보드 조작, 시스템 모션 감소 설정 존중. Three.js 0.180.0(MIT), 라이선스는 `dist/vendor/THREE-LICENSE.txt`.
