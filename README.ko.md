# Source Code Uploader

[English](README.md) | **한국어**

알고리즘 문제 사이트에서 통과한 소스 코드를 **버튼 한 번으로 GitHub · Notion에 업로드**하는 Chrome 확장 프로그램이에요. 별도 서버도, 토큰 직접 설정도 필요 없어요.

![데모: 프로그래머스 문제 페이지에서 에디터 옆 GitHub 버튼으로 정답 코드를 올리고, GitHub에서 커밋을 열어요](docs/demo.gif)

> **참고** — 백준 온라인 저지가 서비스를 종료해서 백준 지원을 제거했어요. 백준 지원이 있던 마지막 버전은 [`before_remove_boj`](https://github.com/Seojeonguk/sourceCodeUploader/tree/before_remove_boj) 태그에 남겨 두었어요.

## 기능

- **원클릭 업로드** — 맞은 제출에 GitHub / Notion 업로드 버튼을 붙여요.
- **자동 업로드** — 켜 두면 제출 결과가 *맞았습니다*로 바뀌는 순간 자동으로 올려요.
- **GitHub** — 선택한 저장소의 `{플랫폼}/{문제}.{확장자}`에 커밋해요. 내용이 같으면 커밋하지 않아요.
- **Notion** — 선택한 데이터베이스에 문제 제목 · 난이도 · 태그를 속성으로, 소스 코드를 코드 블록으로 담은 페이지를 만들어요.
- **로그인** — 팝업에서 GitHub(기기 코드) · Notion(OAuth)에 로그인하고, 목록에서 저장소 · 데이터베이스를 골라요. 확장 프로그램에는 client secret이 들어 있지 않고, GitHub 토큰은 GitHub App을 설치한 저장소에만 접근해요.

## 지원 플랫폼

| 사이트 | 페이지 | GitHub | Notion | 자동 업로드 | 상태 |
|---|---|:-:|:-:|:-:|---|
| [프로그래머스](https://school.programmers.co.kr/) | 문제 풀이 페이지 | ✅ | ✅ | ✅ (채점 결과 창) | 지원 중 |

## 설치

**[Chrome 웹 스토어](https://chromewebstore.google.com/detail/source-code-uploader/kgpilkohekdjpfpcckdlnlolddiheijn)**에서 설치해요. Chrome 116 이상이 필요하고, 업데이트는 스토어가 알아서 해요.

### 직접 불러오기 (개발용)

1. 이 저장소를 내려받거나 clone해요.
2. `chrome://extensions/`(**Chrome › 설정 › 확장 프로그램**)를 열어요.
3. 오른쪽 위 **개발자 모드**를 켜요.
4. **압축해제된 확장 프로그램을 로드합니다**를 누르고 저장소 폴더(`manifest.json`이 있는 폴더)를 선택해요.

스토어 버전은 직접 불러온 버전과 확장 프로그램 ID가 달라서, 로그인과 설정을 따로 가져요. 직접 불러온 버전에서 스토어 버전으로 옮기면 GitHub · Notion에 다시 로그인하고 저장소 · 데이터베이스를 다시 골라야 해요. 그다음 직접 불러온 버전은 삭제하면 돼요.

## 사용 방법

1. 확장 프로그램 아이콘을 눌러 팝업을 열어요.
2. **GitHub** — `Authorize`를 누르면 로그인 페이지에 코드가 나와요. GitHub에서 코드를 입력하고 접근을 허용해요. 업로드할 저장소에 GitHub App을 설치한 뒤(저장소 목록의 `+ Add repositories`) 저장소를 골라요. ([가이드](scripts/github/README.md))
3. **Notion** — `Authorize`를 누르고 데이터베이스가 있는 페이지에 접근을 허용한 뒤, 데이터베이스를 골라요. 업로드에 필요한 속성은 확장 프로그램이 데이터베이스에 추가해요([가이드](scripts/notion/README.md#prepare-the-database)).
4. (선택) 플랫폼별 **자동 업로드**를 켜요.
5. 문제를 풀어요. 프로그래머스 문제 풀이 페이지에서 GitHub 또는 Notion 업로드 버튼을 누르거나, 자동 업로드를 켜 두면 정답일 때 바로 올라가요.

## 동작 방식

```mermaid
flowchart LR
    CS["Content script<br/>(프로그래머스)"] -->|chrome.runtime.sendMessage| BG["Background<br/>service worker"]
    POP["Popup"] -->|OAuth · 설정| BG
    BG --> ST[("chrome.storage<br/>access token · 설정")]
    BG -->|host_permissions| GH["GitHub API"]
    BG -->|host_permissions| NO["Notion API"]
    BG -->|토큰 교환 · 취소| PX["Notion OAuth 프록시<br/>(Cloudflare Worker)"]
    PX --> NO
```

- **Content script**가 문제 페이지에서 문제 · 언어 · 제출 정보를 파싱하고 업로드 버튼을 그려요.
- **Background service worker**가 모든 네트워크 요청을 맡아요. `host_permissions` 덕분에 GitHub · Notion API를 CORS 문제 없이 호출할 수 있어서 서버가 필요 없어요.
- **프로그래머스**는 코드가 페이지의 에디터 객체 안에만 있는데, 분리된 환경에서 도는 content script는 이걸 읽을 수 없어요. 그래서 `scripts/programmers/sourceExtractor.js`를 페이지 컨텍스트에 주입하고 `window.postMessage`로 코드를 받아 와요.
- **Secret** — GitHub는 client ID만 있으면 되는 기기 코드 방식(device flow)으로 GitHub App에 로그인해요. 토큰은 8시간 뒤 만료되고 client secret 없이 갱신되며, App을 설치한 저장소에만 접근해요. Notion은 code를 토큰으로 바꿀 때 client secret이 필요해서, `proxy/notion-oauth/`의 작은 Worker가 secret을 보관해요. Notion 로그인은 `chrome.identity.launchWebAuthFlow`로 연 창에서 진행해요. Chrome이 `https://<확장 ID>.chromiumapp.org/`로의 리다이렉트를 가로채서 code가 다른 사이트로 가지 않고, 그 로그인에서 보낸 `state`가 맞을 때만 받아요.
- **메시지와 저장소** — background는 문제 페이지에서 오는 메시지 중 업로드 관련 메시지(`commit`, `upload`, 자동 업로드 옵션 읽기)만 받고, 나머지는 확장 프로그램 자체 페이지에서 온 것만 받아요(`scripts/senders.js`). access token을 보관하는 `chrome.storage.local`은 content script에서 읽을 수 없게 했고, 업로드 경로에는 정해진 플랫폼 폴더와 파일 확장자만 쓸 수 있어요.

### 권한

| 권한 | 이유 |
|---|---|
| `identity` | Notion 로그인 창을 열고 리다이렉트 받기 |
| `storage` | access token, 선택한 저장소 · 데이터베이스, 옵션 저장 |
| 호스트: `api.notion.com`, `github.com`, `programmers.co.kr` | API 호출, 문제 페이지에서 실행 |

확장 프로그램이 무엇을 읽고, 보내고, 보관하는지는 [개인정보처리방침](PRIVACY.md)(영어)에 있어요.

## 프로젝트 구조

```text
├─ manifest.json
├─ popup/                   # 팝업 UI와 GitHub 로그인 페이지 (html · css · js)
├─ proxy/notion-oauth/      # Notion client secret을 보관하는 Cloudflare Worker
├─ tools/                   # Chrome 웹 스토어용 zip 만들기
└─ scripts/
   ├─ background.js         # service worker, 메시지 라우팅
   ├─ programmers/          # 프로그래머스 content script + 페이지 컨텍스트 추출기
   ├─ github/               # 기기 코드 로그인, 저장소 목록, 커밋
   ├─ notion/               # OAuth (프록시 경유), 데이터베이스 목록, 페이지 · 블록 생성
   └─ common/               # 예외, chrome · fetch · 인코딩 유틸
```

## 개발

Node.js 22.22.2 이상 또는 24.15.0 이상이 필요해요 (`package.json`의 `engines`, CI는 Node 22).

```bash
npm install
npm run lint            # 린트 (ESLint 10 recommended + airbnb-base 규칙 + prettier)
npm run lint:fix        # 자동 수정 가능한 린트 오류 고치기
npm run format:check    # 포맷 검사 (prettier)
npm run format          # prettier로 포맷 적용
npm test                # 단위 테스트 (node:test)
npm run package         # Chrome 웹 스토어용 zip (dist/)
```

파일을 고친 뒤에는 `chrome://extensions/`의 확장 프로그램 카드에서 **새로고침**을 눌러요.

`manifest.json`의 `key` 덕분에 어느 폴더에서 불러오든 확장 프로그램 ID가 `mfhbpmbchemfhijjamldbkidlegfmaff`로 같아서, 배포된 [Notion OAuth 프록시](proxy/notion-oauth/README.md)가 모든 사용자의 로그인을 받아요. 사용자는 아무것도 배포하지 않아도 돼요. 관리자가 프록시를 한 번 배포하고 그 URL을 `scripts/notion/config/config.js`의 `TOKEN_PROXY_URL`에 넣어 두면 돼요.

Chrome 웹 스토어 등록 방법: [docs/chrome-web-store.md](docs/chrome-web-store.md)(영어)

컨벤션: `master`에서 브랜치를 따서 PR을 열어요. 커밋 메시지는 영어 동사로 시작하고 PR 번호로 끝내요(예: `Refactor notion (#177)`). `-s`로 서명을 남겨요.

## 변경 이력

| 버전 | 기간 | 구조 |
|---|---|---|
| v1 | 2022.01 – 02 | 내려받은 파일을 감지해 `.env` 토큰으로 업로드하는 로컬 Python 스크립트 |
| v2 | 2022.12 – 2023.01 | Extension + Django REST 서버(Docker · Nginx · Jenkins) — 스냅샷: [`before_remove_server`](https://github.com/Seojeonguk/sourceCodeUploader/tree/before_remove_server) |
| v3 | 2024.02 – | OAuth를 쓰는 서버 없는 Extension ([#102](https://github.com/Seojeonguk/sourceCodeUploader/issues/102), [#105](https://github.com/Seojeonguk/sourceCodeUploader/pull/105)) |
| v3.x | 2024.07 – 2026.04 | 채점 현황 업로드, Notion 길이 제한, UTF-8 인코딩, 리팩토링, 프로그래머스, 자동 업로드 |
| v3.x | 2026.10 | 프로그래머스 Notion 업로드 · 자동 업로드, 페이지 안 메시지, lint · 테스트 CI |
| v3.x | 2026.10 | 사이트 종료로 백준 지원 제거 — 스냅샷: [`before_remove_boj`](https://github.com/Seojeonguk/sourceCodeUploader/tree/before_remove_boj) |

## 문의

버그를 찾았거나 아이디어가 있다면 [이슈를 남겨 주세요](https://github.com/Seojeonguk/sourceCodeUploader/issues).
