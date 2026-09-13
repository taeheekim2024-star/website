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
| `dist/join.html` | 모집 안내·지원 방법·연락처 |
| `dist/style.css` | 히어로 페이지 원본 스타일(색·서체 토큰 포함) |
| `dist/site.css` | 서브페이지와 새 섹션의 공용 스타일 |
| `dist/site.js` | 내비게이션 현재 표시, `data/site.json` 주입, 논문·뉴스·구성원 렌더링 |
| `dist/scene.js` 외 | 히어로 3D 장면(원본 그대로) |

## 내용 수정

HTML을 건드리지 않고 `dist/data/*.json`만 고치면 된다.

- `site.json` — 이메일·주소·대학·Scholar/ORCID/GitHub 링크. 비워 두면 해당 줄이 자동으로 숨겨진다.
- `publications.json` — 논문. `featured: true`인 항목이 첫 화면 "Selected publications"에 먼저 나온다. `doi`를 채우면 링크가 생긴다. 저자 이름 끝의 `*`는 교신저자 표시, "Taehee Kim"은 자동으로 굵게.
- `news.json` — `date`(YYYY-MM-DD), `title`, `body`, `link`(선택).
- `people.json` — `groups[].members[]`에 `member_template` 형식으로 추가. 사진은 `dist/assets/people/이름.jpg` 같은 상대 경로.

로고: `dist/assets/logo-mark.png`(투명 배경 마크)를 넣으면 헤더에 자동으로 표시된다. 원본 로고(흰 배경)에서 마크를 잘라내는 스크립트는 `../../work/logo/cutout.ps1`.

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
