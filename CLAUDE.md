# CLAUDE.md

이 파일은 Claude Code가 이 저장소에서 작업할 때 참고하는 안내 파일입니다. 사람이 읽는 설명은 `README.md`(영어) · `README.ko.md`를 보세요.

## 프로젝트 개요

- **Source Code Uploader**: 알고리즘 문제 사이트에서 통과한 코드를 버튼 한 번으로 **GitHub · Notion**에 올리는 Chrome 확장 프로그램 (Manifest V3, 서버 없음).
- 배포: [Chrome 웹 스토어](https://chromewebstore.google.com/detail/source-code-uploader/kgpilkohekdjpfpcckdlnlolddiheijn) (스토어 ID `kgpilkohekdjpfpcckdlnlolddiheijn`), 압축 해제 설치는 `manifest.json`의 `key`로 ID `mfhbpmbchemfhijjamldbkidlegfmaff` 고정.
- 지원 사이트: **프로그래머스**(필수 사이트), **Codeforces**(선택 사이트, #267), **정올**(선택 사이트, #261, 자동 업로드 #279). 백준은 서비스 종료로 제거됨(`before_remove_boj` 태그).
- 최소 Chrome 116 (`launchWebAuthFlow`가 서비스 워커 5분 제한에서 빠지는 버전).

### 구조

```text
manifest.json          # MV3, default_locale en, __MSG_extDescription__
_locales/{en,ko}/      # 사용자에게 보이는 모든 문구
popup/                 # 팝업(탭 + 단계) · GitHub 로그인 페이지
scripts/background.js  # 서비스 워커, 메시지 라우팅
scripts/senders.js     # 메시지 보낸 쪽 검사 (확장 페이지 / 문제 페이지)
scripts/judgeSites.js  # 문제 사이트 목록 (필수 / 선택)
scripts/sitePermissions.js  # 선택 사이트 권한 ↔ content script 등록 동기화
scripts/content/       # 문제 사이트 공용 content script UI (버튼 · 토스트 · 메시지)
scripts/programmers/   # 프로그래머스 content script + 페이지 컨텍스트 추출기
scripts/codeforces/    # Codeforces content script
scripts/jungol/        # 정올 content script + 페이지 쪽(MAIN world) 채점 감시
scripts/github/        # GitHub App device flow 로그인, 저장소 목록, 커밋
scripts/notion/        # Notion OAuth(프록시 경유), data source 검색 · 페이지 생성
scripts/common/        # 예외, fetch(재시도 · 타임아웃), i18n, chrome 유틸
proxy/notion-oauth/    # Notion client secret을 보관하는 Cloudflare Worker
tools/package-extension.js  # 스토어용 zip
docs/chrome-web-store.md    # 스토어 등록 문구 · 절차
```

### 핵심 설계

- **GitHub**: GitHub App(`source-code-uploader`, Client ID `Iv23ctAQwmFPO2fLbZqs`) + **device flow** → client secret 없음. 토큰은 8시간 만료, refresh token으로 갱신(single-flight). App을 설치한 저장소에만 접근.
- **Notion**: `chrome.identity.launchWebAuthFlow`로 로그인, 코드 교환은 `proxy/notion-oauth` Worker가 secret을 붙여 처리. Worker는 `ALLOWED_EXTENSION_IDS`의 확장만 받고, 그 ID의 `https://<id>.chromiumapp.org/`로 교환함. Notion API `2026-03-11`, **data source** 기준(검색 · 조회 · 페이지 생성). DB를 고르면 필요한 속성(`info`, `tags`, `URL`, `Date`, `mime`)을 자동으로 추가함.
- **권한 분리**: `chrome.storage.local`은 `TRUSTED_CONTEXTS`(content script에서 읽을 수 없음). 문제 페이지는 업로드 관련 메시지(`commit`, `upload`, `getAutoUpload`)만 보낼 수 있음. 업로드 폴더는 `scripts/github/utils/path.js`의 `UPLOAD_TYPES`만 허용.
- **선택 사이트** (#259): 새 사이트는 `host_permissions`에 넣지 않음. 새 필수 권한은 스토어 업데이트 때 **기존 사용자 확장을 꺼 버림**. 대신 `JUDGE_SITES`에 `optional: true`로 추가 → `optional_host_permissions` → 팝업 스위치가 `chrome.permissions.request` → background가 `chrome.scripting.registerContentScripts`로 등록.

## 빌드 및 실행 명령어

Node.js 22.22.2+ 또는 24.15.0+ (CI는 Node 22 · 24, zip artifact는 Node 22에서 올림).

```bash
npm install
npm run lint          # ESLint 10 (recommended + airbnb-base 규칙 + prettier), --max-warnings 0
npm run format:check  # Prettier (코드 · Markdown 문서 · .github), 고치려면 npm run format
npm test              # node --test --import ./tests/setup.js (영어 chrome.i18n mock 포함)
npm run package       # dist/source-code-uploader-<version>.zip (key 제거, 확장이 쓰는 파일만)
```

- 확장 확인: `chrome://extensions/` → 압축해제된 확장 프로그램 로드 → 저장소 폴더, 고친 뒤 **새로고침**.
- Worker 배포(관리자): `cd proxy/notion-oauth && npx wrangler deploy`. `wrangler.toml`이나 `src/index.js`가 바뀌면 필요.
- CI(`.github/workflows/ci.yml`): Node 22 · 24에서 lint · format · test · package, zip은 Node 22 잡에서 artifact로 업로드. `release.yml`은 GitHub Release 발행 시 zip을 첨부함.

## 코드 스타일 및 컨벤션

### 코드

- 확장 코드는 네이티브 ES 모듈이고 의존성이 없음. import에 `.js` 확장자를 꼭 씀. content script는 **classic script**라 import를 못 쓰므로 `globalThis.SCU_*`로 공유함.
- 주석 · JSDoc은 영어로, 주변 코드의 밀도에 맞춰 씀.
- 사용자에게 보이는 문구는 **반드시 `_locales/en`과 `ko` 둘 다**에 넣음. 스크립트는 `t('key', ...)`, HTML은 `data-i18n` · `data-i18n-aria-label`. `tests/common/i18n.test.js`가 키 일치, 미사용 키, 빠진 키를 검사함. 한국어는 해요체로 씀.
- 문제 지문은 업로드하지 않음(정올 약관 §10 · §17). 코드와 메타데이터(제목 · 난이도 · 태그 · URL)만 올림.

### 테스트

- `node:test` + jsdom. content script는 `node:vm`이나 jsdom `runScripts: 'outside-only'`로 실행함.
- 새 동작에는 테스트를 먼저 쓰고, **옛 코드 / 일부러 망가뜨린 코드에서 실패하는지 확인**함(mutation check). 이 결과를 PR 본문에 적음.
- 외부 사이트 구조는 가능하면 **실제 페이지를 잘라 fixture로** 씀(`tests/fixtures/codeforces/`). 못 가져온 구조는 재구성했다고 명시함.
- DOM 변화에 반응하는 content script 테스트에는 suite timeout을 걸어서, 무한 반복이 멈추지 않고 실패하게 함.

### Git · PR (squash merge, 브랜치 자동 삭제 켜짐)

- `master`에서 브랜치를 따서 PR을 염. 커밋은 `git commit -s`(DCO 검사), GPG 서명(`commit.gpgsign=true`).
- **커밋 메시지**: 짧은 명령형 영어 제목 + 본문 **한 줄** `This will <커밋이 미치는 결과>.` 줄바꿈과 "since …"는 쓰지 않음. 자세한 이유 · 테스트는 PR 본문에 씀.
- **Claude attribution 금지**: `Co-Authored-By: Claude`나 "Generated with Claude Code"를 커밋 · PR에 넣지 않음.
- **PR 본문**: 맨 위에 `Closes #N` → `## Summary` → `## Tests` → 마지막에 **`## Please check in the browser`** 체크리스트(사용자가 직접 확인할 동작, "행동 → 기대 결과" 형식. 배포 · 설정 단계도 포함).
- **PR · 이슈 생성 시**: 레이블(`feat`, `bug`, `enhancement`, `documentation`, `refactoring`, `release`, …), `--assignee @me`, 맞는 마일스톤을 항상 지정함.

### 버전 · 릴리스

- **메이저**: 기존 사용자가 무언가 해야 할 때(다시 로그인 · 설치 · 선택). **마이너**: 새 기능이나 보이는 변경. **패치**: 수정만.
- 사용자가 할 일이 없어도, 큰 기능을 여러 개 묶어 내는 릴리스는 사용자가 정하면 메이저로 올릴 수 있음(v4.0.0). 릴리스 노트의 Upgrading에 "할 일 없음"을 적음.
- 버전은 `manifest.json` · `package.json` · `package-lock.json`(`npm version X --no-git-tag-version`)에 있음.
- 마일스톤의 이슈가 끝나면 "Release X.Y.Z" PR(버전 올리기 + 본문에 릴리스 노트 초안)을 만듦. 머지 후 머지 커밋에 서명 태그 `git tag -s vX.Y.Z`를 붙이고, 사용자에게 확인받고 GitHub Release를 발행함(zip은 워크플로가 첨부함). 그다음 마일스톤을 닫음.
- 스토어: 릴리스 zip을 대시보드에 올리는 건 사용자가 함. 설명 · 권한 사유 문구는 `docs/chrome-web-store.md`에 맞춰 둠.

## 주의사항

- **새 사이트를 `host_permissions` · `content_scripts`에 넣지 말 것.** `tests/background/judgeSites.test.js`가 막음. 사이트를 추가할 때 고칠 곳(Codeforces #267 때 문서를 빠뜨려 #271에서 고침, 한 PR에서 모두 고침):
  - **코드**: `scripts/judgeSites.js`의 `JUDGE_SITES` 항목(`optional: true`, `origins` `https://<host>/*`, `contentScripts`) · `manifest.json`의 `optional_host_permissions` · 아이콘(`icon/*.png`)의 `web_accessible_resources` `matches` · `scripts/github/utils/path.js`의 `UPLOAD_TYPES` · `scripts/<site>/` content script(`globalThis.SCU_CONTENT` 사용) · `_locales/{en,ko}`의 `extDescription`과 사이트 문구.
  - **테스트**: `tests/<site>/`(content script · helpers), 실제 페이지를 자른 `tests/fixtures/<site>/`.
  - **문서**: `README.md` · `README.ko.md`(Supported Platforms 표, Usage, How It Works의 다이어그램 · 설명 · Permissions 표, Project Structure, History) · `scripts/github/README.md`(사용법, 커밋 경로, 자동 업로드) · `scripts/notion/README.md`(`info` · `tags` 속성 예시, 사용법, 자동 업로드) · `PRIVACY.md`(첫 문단, 사이트에서 하는 일) · `docs/chrome-web-store.md`(Summary · Description, Korean listing, Images, single purpose, 선택 호스트 권한 사유, data usage, Test instructions) · 이 파일(지원 사이트, 구조).
- 권한을 추가하면 스토어 사용자에게 경고가 뜨는지 먼저 확인함(`scripting`, 선택 권한은 경고 없음).
- 스토어 빌드와 압축 해제 빌드는 확장 ID가 다름. Notion 로그인은 Worker 허용 목록과 Notion integration의 Redirect URI에 **둘 다** 등록돼 있어야 함.
- 커밋 · 태그 GPG 서명이 가끔 멈추므로 `timeout 60 git commit -s ...`처럼 시간 제한을 둠. 서명을 건너뛰지 않음.
- Windows Git Bash에서 heredoc 안에 백틱이 든 Python을 쓰면 깨질 때가 있음. 스크립트는 scratchpad에 파일로 써서 실행함. 이 환경에서는 일부 도구(ffmpeg, `curl -o`)가 파일을 직접 못 쓰니 stdout으로 받아 저장함.
- 정올 API(`api.jungol.co.kr`)는 봇 차단 헤더(`X-Fp`, `X-Api`)가 있어야 해서 확장이 부르지 않음. 코드 · 판정은 페이지의 채점 요청(`saet.jungol.co.kr/judge`)을 `judgeWatcher.js`가 `document_start`에 MAIN world에서 지켜봐서 얻음(사이트가 `fetch`를 미리 잡아 둠). 조사 결과는 #277 · #261 댓글.
- Codeforces 제출 페이지는 브라우저 밖 요청을 Cloudflare가 막음(문제 · 현황 페이지와 `/api`는 열림). content script는 같은 출처 요청(사용자 세션)으로 읽음.
- 최신 Chrome(브랜드 빌드)은 `--load-extension`을 막아서 헤드리스로 확장을 띄워 확인할 수 없음. 실제 동작은 PR 체크리스트로 사용자가 확인함.
- 저장소 루트에 녹화 · 임시 파일(mp4 등)을 커밋하지 않음. `dist/`는 ignore됨.
- Notion 문서(포트폴리오 · 개발일지 · 서비스 소개)는 사용자가 요청할 때만 갱신함.
  - 프로젝트 페이지의 PROJECT SUMMARY는 **최신 버전 기준으로만** 씀(표 · 주요 기능 · 구조 · 기술적 고민). 이전 버전 내용(버전별 변화, v2 구조 · 배포, 백준)은 개발 워크스페이스의 **버전 히스토리** 페이지에 씀.
