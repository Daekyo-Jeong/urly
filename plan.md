# Catalog — Implementation Plan

## MVP 1: 엔진 코어 (stub .app 생성 + 실행) ✅

디자인 없이 동작을 검증하는 단계. CLI 수준에서 앱 생성 → 실행이 되는지 확인.

### 1-1. 프로젝트 초기 설정
- [x] Electron 프로젝트 생성 (수동 구성)
- [x] 디렉토리 구조 확정: `src/engine/`, `src/generator/`, `src/renderer/`
- [x] `~/.catalog/` 디렉토리 초기화 로직

### 1-2. 공유 런타임 (Catalog Engine)
- [x] Electron main process: `--app-id`, `--user-data-dir` 인자 파싱
- [x] `~/.catalog/apps/{app-id}/config.json`에서 URL 읽어 BrowserWindow로 로드
- [x] `--user-data-dir`로 Chromium 프로필 격리
- [x] 타이틀바에 페이지 제목 표시
- [x] 창 위치·크기 기억 (config.json에 저장)

### 1-3. stub .app 생성기
- [x] Node.js로 .app 번들 구조 생성 (Contents/MacOS/launcher, Contents/Info.plist, Contents/Resources/app.icns)
- [x] Info.plist 생성 (plist 라이브러리): CFBundleName, CFBundleIdentifier, CFBundleIconFile
- [x] launcher 셸 스크립트 생성 + 실행 권한 부여 (chmod +x)
- [x] `/Applications/Catalog Apps/`에 .app 배치
- [x] 기본 placeholder 아이콘 포함

### 1-4. 검증
- [x] 터미널에서 생성 스크립트 실행 → .app 파일 생성 확인
- [x] 생성된 .app 더블클릭 → URL 로드 확인
- [x] Finder에서 앱 이름 검색 확인 (Spotlight mdfind 검증 완료)
- [x] Dock에 아이콘 표시 확인 (app.dock.setIcon 적용)
- [x] 두 개의 앱을 동시 실행 → 세션 격리 확인 (Google + GitHub 동시 실행, 별도 user-data-dir)

**완료 기준**: ~~URL을 하드코딩으로라도 넣으면 독립 앱으로 실행되고, Finder 검색·Dock 표시·세션 격리가 동작한다.~~ **달성**

### 알려진 한계 (후속 MVP에서 해결)

| 한계 | 원인 | 해결 시점 |
|------|------|-----------|
| Dock/Cmd+Tab에서 앱 이름이 "Electron"으로 표시 | launcher 스크립트가 Electron 바이너리를 직접 실행하므로 macOS가 원본 Electron.app의 CFBundleName을 사용 | **MVP 4** — 독립 Electron 빌드로 패키징하여 각 앱 고유 바이너리 이름 적용 |
| 아이콘이 시스템 기본 아이콘 | 아이콘 자동 추출 미구현 | **MVP 3** — URL에서 apple-touch-icon/favicon 자동 추출 + 수동 설정 |

---

## MVP 2: 브라우저 동작 완성 ✅

생성된 앱이 실제 브라우저처럼 쓸 수 있는 수준으로 만드는 단계.

### 2-1. 외부 링크 처리
- [x] 같은 도메인 / 서브도메인 → 앱 내 탐색
- [x] 외부 도메인 → `shell.openExternal()`로 시스템 브라우저에서 열기
- [x] OAuth 리다이렉트 도메인 허용 목록

### 2-2. 알림
- [x] Web Notifications API 권한 요청 처리 (preload + contextBridge로 IPC 연결)
- [x] macOS 알림 센터 연동 — ad-hoc 서명 stub은 `UNUserNotificationCenter` 권한을 못 받으므로, 번들된 `terminal-notifier.app`을 helper로 두고 `-sender com.catalog.app.<appId>`로 SSB 아이콘 + 클릭 활성화까지 위임
- [x] 알림 클릭 시 해당 SSB로 포커스 이동 (`-activate` 플래그)
- [x] 알림 아이콘이 SSB 아이콘으로 표시 (이전 osascript 방식의 Script Editor 아이콘 문제 해결)

### 2-3. 다운로드
- [x] `will-download` 이벤트 핸들링
- [x] ~/Downloads에 저장, 시스템 기본 동작에 위임

### 2-4. 기본 브라우저 기능
- [x] 윈도우 타이틀을 사용자 지정 앱 이름으로 고정 (페이지 `<title>` 변경 무시 — Google Chat 등 SPA에서 메뉴 이동 시 타이틀 바뀌던 문제 해결)
- [x] Cmd+W는 창만 닫고 프로세스는 유지 (Dock에 살아있음, 알림 계속 수신, Cmd+Q로만 완전 종료) — macOS 표준 동작
- [x] 키보드 단축키: 네이티브 앱 메뉴 (Edit: undo/redo/cut/copy/paste/selectAll, View: zoom, Navigate: reload)
- [x] 스와이프 네비게이션 (트랙패드 + Magic Mouse): wheel 이벤트 감지, 시각적 인디케이터 (화살표 + 파란색 활성 표시), 히스토리 유무에 따라 표시/비표시, 손을 떼면 판정
- [x] 파일 업로드 다이얼로그 (Chromium 기본 지원, sandbox 모드에서 동작)
- [x] 미디어 재생 (Chromium 기본 지원, media 권한 허용)
- [x] 컨텍스트 메뉴 (우클릭): 링크/텍스트/편집/이미지 컨텍스트별 동적 메뉴

### 2-5. 검증
- [x] Google, GitHub, Notion 3개 서비스 동시 실행 확인
- [x] Google OAuth 로그인 흐름 테스트
- [x] 알림 수신 테스트 (terminal-notifier 기반, SSB 아이콘 및 클릭 활성화 확인)
- [x] 파일 다운로드 테스트 (~/Downloads에 파일 저장 확인)
- [x] 외부 링크 클릭 → 시스템 브라우저 전환 확인
- [x] 외부 링크 처리 로직 단위 테스트 (8/8 통과)
- [x] 스와이프 제스처 뒤로/앞으로 (트랙패드 + Magic Mouse)

**완료 기준**: ~~실제 서비스를 일상적으로 쓸 수 있는 수준.~~ **달성**

---

## MVP 3: 카탈로그 관리 앱 (UI) — 진행 중

디자인 시스템 적용. 앱 등록/수정/삭제를 GUI로 수행.

### 3-1. 프로젝트 구조
- [x] React + Vite 셋업 (renderer 프로세스)
- [x] IPC 통신 설계: renderer ↔ main (앱 CRUD 요청/응답) — apps:list, apps:create, apps:update, apps:delete, apps:launch, apps:revealInFinder, meta:extract, dialog:pickIcon
- [x] 디자인 시스템 토큰 적용 (컬러, 타이포, 스페이싱) — tokens.js
- [x] Main process 진입점 분기: --app-id 없으면 카탈로그 관리 앱, 있으면 SSB 엔진

### 3-2. 앱 목록 화면 (홈)
- [x] 그리드 뷰 (Cozy 5열) / 리스트 뷰 (테이블+인스펙터) + 전환 토글
- [x] 검색 바 (앱 이름 + URL 기준 실시간 필터링)
- [x] 각 앱: Squircle 아이콘 + 이름 + URL 표시
- [x] 앱 클릭 → 선택 (label pill + ⋯ 메뉴), 더블클릭 → 실행
- [x] ⋯ 메뉴: Launch/Edit/Open in Browser/Reveal in Finder/Re-fetch Icon/Delete
- [x] 리스트 뷰 인스펙터: 선택된 앱 상세 + Launch/Edit/Delete 버튼
- [x] 빈 상태 (empty state) — 첫 실행 시 안내 + Add Your First App

### 3-3. 앱 등록 모달
- [x] URL 입력 필드 (blur 시 자동 추출 트리거)
- [x] URL 입력 후 → 사이트 title 자동 추출 (net.request) → 이름 필드에 자동 채움
- [x] URL 입력 후 → 아이콘 자동 추출 (apple-touch-icon → favicon → /favicon.ico)
- [x] 아이콘 미리보기 클릭 → 수동 이미지 선택 (dialog:pickIcon)
- [x] 이미지 → icns 변환 (sips + iconutil)
- [x] 생성 버튼 → stub .app 생성 → 목록에 추가
- [x] 로딩/성공/실패 상태 표시 (extracting 스피너 + done 체크)
- [x] 아이콘 URL 자동 다운로드 → icns 변환 파이프라인

### 3-4. 앱 수정 모달
- [x] 등록 모달과 동일 구조, 기존 값 프리필 (editApp prop)
- [x] 이름 변경 → .app 폴더 리네임 + Info.plist 업데이트
- [x] 아이콘 변경 → icns 교체
- [x] URL 변경 → config.json 업데이트

### 3-5. 앱 삭제
- [x] 확인 다이얼로그: "사용자 데이터도 함께 삭제할까요?" (radio 선택)
- [x] stub .app 삭제 + (선택적) userdata 삭제

### 3-6. 검증
- [x] 앱 등록 → Finder 검색 → 실행 전체 플로우
- [x] 앱 수정 (이름/아이콘/URL 각각) → 반영 확인
- [x] 앱 삭제 → .app 제거 확인
- [x] 그리드/리스트 전환 동작
- [x] 검색 필터링 동작
- [ ] 앱 10개 이상 등록 후 성능/레이아웃 확인

### 3-8. Tags / Favorites / Settings
- [x] **Tags** — 각 앱 `tags: string[]` 필드. 사이드바에 사용 중 태그 자동 표시 + 카운트. 태그 클릭 → 필터.
  - Edit/New App 모달에 자유 입력 + 자동완성 칩 UI (`TagInput`)
- [x] **Favorites** — 각 앱 `favorite: boolean`. ⋯ 메뉴에서 토글, 그리드/리스트에 별 표시. Favorites 사이드바 항목 필터링.
- [x] **Settings 모달** — 사이드바 푸터 톱니바퀴 + Cmd+, 단축키 (앱 메뉴 통합)
  - 액센트 컬러: 8가지 프리셋 + 커스텀 HEX. CSS 변수(`--cat-accent` 등)로 런타임 적용
  - 사이드바 섹션 보이기/숨기기 토글: Recently Added / Favorites / Tags
- [x] `~/.catalog/settings.json` 영구 저장 + IPC (`settings:get`, `settings:set`)

### 3-7. 추가 개선 (실사용 피드백 반영)
- [x] 그리드 카드 최대 너비 고정 (160px) — 일정한 그리드 유지
- [x] URL 표시 시 `http://`/`https://` 자동 제거 + ellipsis 처리
- [x] 빈 공간 클릭 시 선택/메뉴 자동 해제
- [x] URL 등록 시 프로토콜 자동 추가 (`https://`)
- [x] 액션 메뉴 React Portal + 자동 위치 조정 (스크롤 컨테이너 클리핑 방지)
- [x] 아이콘 다운로드 시 매직 넘버 검증 (HTML 에러 페이지 차단) + 깨진 이미지 onError 폴백
- [x] **Clear Cache** — HTTP 캐시만 비움 (로그인 유지)
- [x] **Sign Out & Reset** — 쿠키/스토리지/IndexedDB 등 전부 삭제 + 실행 중인 SSB 자동 종료
  - 중요 발견: `--user-data-dir` 단일 프로필 모드에서는 데이터가 `Default/` 아닌 userdata 루트에 저장됨

> **MVP 1 한계 해결**: 아이콘 자동 추출 + 수동 설정을 이 단계에서 구현 ✅

**완료 기준**: GUI로 앱 등록~수정~삭제~실행 전체 사이클이 동작한다. 디자인 시스템이 적용되어 있다.

---

## MVP 4: 마감 및 패키징

배포 가능한 상태로 마무리.

### 4-1. 안정화
- [ ] 에러 핸들링: 잘못된 URL, 네트워크 오류, 아이콘 추출 실패
- [ ] 공유 런타임 경로 검증 (엔진 없을 때 안내 메시지)
- [ ] 앱 중복 이름 처리

### 4-2. 패키징 ✅
- [x] electron-builder로 카탈로그 관리 앱 패키징 (`npm run build`)
- [x] 공유 런타임 추출 로직 — `bootstrap.js`로 ~/.catalog/engine/에 Electron.app + app.asar 복사
- [x] 첫 실행 시 초기 셋업 — 매니저 부팅 시 `ensureEngine` 호출, version.txt로 idempotent 처리
- [x] DMG 빌드 (Catalog-0.1.0-arm64.dmg, 112MB)
- [x] Helper 자동 리네이밍 — 각 stub의 CFBundleName에 맞춰 `<Name> Helper.app` + 내부 binary/plist 갱신 (electron-builder가 helper를 productName으로 rebrand하므로 필수)

### 4-3. Dock/Cmd+Tab 앱 이름 표시 해결 ✅
- [x] Stub .app에 Electron 바이너리 복사 (33KB) + Info.plist에 CatalogAppID 저장
- [x] main.js가 process.execPath 기준으로 부모 Info.plist 읽어 appId 결정
- [x] Frameworks (Electron Framework, Helpers, Mantle, ReactiveObjC, Squirrel) **APFS clonefile (`cp -c`)** 복사 — 디스크 공유 + macOS bundle 무결성 통과
- [x] launcher shell 스크립트 제거, Electron 바이너리 직접 실행
- [x] 두 stub 동시 실행 검증, 각각 고유 이름 표시 확인
- [x] Disk 점유: stub당 apparent 268MB, 실제 추가 0 (APFS COW)

> **MVP 1 한계 해결됨**: Dock/Cmd+Tab에서 stub 고유 이름 표시 ✅

### 4-4. 최종 검증
- [ ] 클린 환경에서 DMG 설치 → 첫 실행 → 앱 생성 → 실행 전체 플로우
- [ ] Gatekeeper 우회 (xattr -cr) 동작 확인
- [ ] 앱 5개 동시 실행 안정성

**완료 기준**: DMG 하나로 설치부터 사용까지 완결된다.

---

---

## Landing Page

마케팅/다운로드 페이지 (`landing/index.html`).

- [x] Hero — CatalogIcon, 타이틀, 태그라인, 다운로드 CTA 버튼, GitHub 링크
- [x] Before/After — 브라우저 탭 vs. 독립 앱 윈도우 비교 mock
- [x] Feature Grid — 6개 카드 (Spotlight, 세션 격리, macOS chrome, 아이콘 자동 추출, 캐시 초기화, 태그/즐겨찾기)
- [x] How It Works — 3단계 (URL 붙여넣기 → 추출 중 → Spotlight 실행) mock 포함
- [x] Architecture Note — 기술 설명 단락
- [x] Footer — 다운로드 버튼 반복, 제작자 링크, GitHub
- [x] Self-contained HTML (React+Babel CDN) — 빌드 단계 없이 GitHub Pages 배포 가능

---

## 작업 순서 요약

```
MVP 1 (엔진 코어)        ✅ 완료
  ↓
MVP 2 (브라우저 동작)     ✅ 완료
  ↓
MVP 3 (관리 UI)          ✅ 완료 (실사용 검증 완료, 10개+ 앱 부하 테스트만 남음)
  ↓
MVP 4 (패키징)           ← MVP 3 검증 완료 후
```
