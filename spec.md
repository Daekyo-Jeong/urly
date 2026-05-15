# Urly — Site-Specific Browser Generator for macOS

## 개요

URL을 등록하면 독립적인 macOS 앱(.app)을 생성하는 도구.
각 앱은 Chromium 기반 브라우저로 동작하며, Finder 검색·Dock 고정·Cmd+Tab 전환이 가능하다.

## 아키텍처

### 하이브리드 구조 (공유 런타임 + stub .app)

```
~/.urly/
├── engine/                    # 공유 Electron 런타임 (~200MB, 1벌)
│   ├── Urly Engine.app/    # Electron 바이너리
│   └── version.txt
├── apps/                      # 앱별 설정·데이터
│   └── {app-id}/
│       ├── config.json        # name, url, icon, created, updated
│       ├── icon.icns          # 앱 아이콘
│       └── userdata/          # Chromium 프로필 (쿠키·세션 격리)
└── apps.json               # 등록된 앱 목록 인덱스

/Applications/Urly Apps/
├── Slack.app                  # stub .app (~1MB)
├── Gmail.app
└── Figma.app
```

### stub .app 구조

각 stub .app은 최소한의 파일로 구성:

```
Slack.app/
└── Contents/
    ├── Info.plist             # 앱 이름, 번들 ID, 아이콘 지정
    ├── MacOS/
    │   └── launcher           # 셸 스크립트: 공유 런타임에 config 경로를 인자로 전달하여 실행
    └── Resources/
        └── app.icns           # 앱 아이콘
```

**launcher 스크립트 동작:**
```bash
#!/bin/bash
exec "$HOME/.urly/engine/Urly Engine.app/Contents/MacOS/Urly Engine" \
  --app-id="slack" \
  --user-data-dir="$HOME/.urly/apps/slack/userdata"
```

### 데이터 격리

- 각 앱은 독립된 Chromium `--user-data-dir`을 사용
- 쿠키, 세션, localStorage, IndexedDB가 앱별로 완전 분리
- 다운로드 폴더는 시스템 기본 다운로드 폴더(~/Downloads) 공유

## 기능 명세

### 1. 카탈로그 관리 앱 (메인 앱)

등록된 앱을 관리하는 UI. Electron 앱으로 구현.

#### 앱 등록
- URL 입력
- 앱 이름 지정 (기본값: 사이트 title 자동 추출)
- 아이콘 설정:
  - 자동: URL에서 apple-touch-icon → favicon 순으로 추출
  - 수동: 사용자가 이미지 파일 선택 (png/jpg/svg → icns 변환)
- "생성" 버튼 → stub .app 생성 → /Applications/Urly Apps/ 에 배치

#### 앱 수정
- 이름 변경 → Info.plist 업데이트, .app 폴더명 변경
- 아이콘 변경 → icns 교체, Finder 아이콘 캐시 갱신 (touch + killall Dock)
- URL 변경 → config.json 업데이트

#### 앱 삭제
- stub .app 삭제
- 사용자 데이터(userdata/) 삭제 여부 선택

#### 앱 목록
- 등록된 앱 리스트 (이름, URL, 아이콘, 마지막 수정일)
- 각 앱에 대한 편집/삭제/실행 버튼

### 2. 생성된 앱 (Site-Specific Browser)

각 stub .app 실행 시 공유 런타임이 아래 기능을 제공:

#### 브라우저 기능 (필수)
- 등록된 URL을 메인 윈도우로 로드
- 알림 (Web Notifications API + macOS 알림 센터 연동)
- 파일 다운로드 (~/Downloads로 저장, 시스템 기본 동작에 위임)
- 하이퍼링크 탐색:
  - 같은 도메인 링크 → 앱 내 탐색
  - 외부 도메인 링크 → 기본 브라우저에서 열기
- 폼 입력, 파일 업로드
- 미디어 재생 (오디오/비디오)
- 클립보드 복사/붙여넣기
- 키보드 단축키 (Cmd+C/V/A/Z 등 기본 편집 단축키)
- 뒤로 가기 / 앞으로 가기 (트랙패드 제스처 또는 Cmd+[ / Cmd+], 별도 버튼 없음)
- 확대/축소 (Cmd+/-)

#### 브라우저 기능 (제외)
- 상단 탭바, 북마크바, 주소창
- 확장 프로그램
- 개발자 도구 (필요 시 단축키로 토글 가능하도록 옵션)

#### 창 관리
- 마지막 창 위치·크기 기억
- 타이틀바: 현재 페이지 제목 표시
- Dock 아이콘: 등록된 앱 아이콘 표시
- Cmd+Tab: 독립 앱으로 표시

## 기술 스택

| 구성 요소 | 기술 |
|-----------|------|
| 공유 런타임 | Electron (Chromium) |
| 카탈로그 관리 UI | Electron + React |
| stub .app 생성 | Node.js (fs로 .app 번들 구성, plist 라이브러리로 Info.plist 생성) |
| 아이콘 변환 | png2icons 또는 iconutil (macOS 내장) |
| 아이콘 자동 추출 | node-fetch로 HTML 파싱 → apple-touch-icon/favicon URL 추출 |
| 설정 저장 | JSON 파일 (apps.json, config.json) |

## 외부 링크 처리 정책

| 시나리오 | 동작 |
|----------|------|
| 같은 도메인 (서브도메인 포함) | 앱 내 탐색 |
| 등록된 URL의 서브도메인 | 앱 내 탐색 |
| OAuth/로그인 리다이렉트 (accounts.google.com 등) | 앱 내 팝업으로 처리 |
| 완전히 다른 외부 도메인 | 시스템 기본 브라우저로 열기 |

## Finder 검색 보장

- .app 번들을 `/Applications/Urly Apps/`에 배치
- Info.plist에 `CFBundleName`, `CFBundleDisplayName` 정확히 설정
- Spotlight 인덱싱 자동 (별도 작업 불필요 — .app은 기본적으로 인덱싱됨)
- 아이콘 변경 시 `touch` + Finder 캐시 리셋으로 즉시 반영

## 배포

- 본인 전용, 앱스토어 배포 없음
- 코드 서명/공증 없음 (Gatekeeper: `xattr -cr` 또는 시스템 설정에서 우회)
- 업데이트: 수동 (최신 버전 직접 다운로드)

## 빌드·실행

```bash
# 개발
npm install
npm run dev          # 카탈로그 관리 앱 실행

# 빌드
npm run build        # 공유 런타임 + 카탈로그 관리 앱 패키징
npm run package      # DMG 생성
```

## 제약 사항

- 공유 런타임 삭제 시 모든 생성된 앱이 동작 불가
- Electron 버전 업데이트 시 공유 런타임 재빌드 필요
- PWA manifest 기반 자동 설정은 미지원 (향후 확장 가능)
