# task-manager-extension-v1

VS Code Webview 기반 로컬 task 관리 확장입니다.

현재 정리 버전: `0.9.3`

## 기능

- Webview에서 task 생성, 작성, 수정, 삭제
- Activity Bar의 Task Manager 탭에서 실행
- task 완료 여부 체크
- task 검색 및 category 필터링
- category 버튼 다중 선택 필터 및 초기화
- task tag 추가 및 표시
- 왼쪽 task 목록에서 상세 내용 펼침/접힘
- 왼쪽 task 목록 전체 펼침/전체 접음
- task 선택 시 왼쪽 목록 상세 자동 펼침
- Task Manager를 열면 아무 task도 선택하지 않은 상태로 시작
- Task Manager를 열면 task 작성/수정 패널은 접힌 상태로 시작
- 왼쪽 목록 상세에서 하이퍼링크 일반 클릭으로 외부 브라우저 열기
- 새 task 작성 시 시작 시간 오늘 날짜 자동 입력
- 우선순위 1~5 선택, 높은 우선순위가 왼쪽 목록 상단에 표시
- Daily, Weekly, Monthly 반복 task 설정
- 단일 rich editor에 개요, 진행상황, 관련 링크, 관련 메일 항목 템플릿 제공
- `How to Use` 팝업으로 Task 내용 작성 예시 제공
- React 기반 Webview UI
- Tiptap rich editor로 Task 내용 편집
- rich editor 내용은 Tiptap JSON으로 저장
- VS Code extension 내부 storage에 task 저장
- `task_examples` 기반 초기 샘플 task 생성

## 실행

```bash
npm install
npm run compile
```

VS Code Extension Host에서 명령 팔레트로 `Task Manager: Open`을 실행합니다.

또는 VS Code의 Run and Debug에서 `Run Task Manager Extension`을 실행합니다.

설치 후 왼쪽 Activity Bar의 `Task Manager` 탭에서도 바로 열 수 있습니다.

## 배포

VSIX 파일 생성:

```bash
npm run package:vsix
```

생성된 파일:

```text
task-manager-extension-v1-0.9.3.vsix
```

로컬 설치:

```bash
code --install-extension task-manager-extension-v1-0.9.3.vsix
```

Marketplace 배포는 `package.json`의 `publisher`를 실제 VS Code Marketplace publisher ID로 바꾼 뒤 Personal Access Token으로 로그인하고 실행합니다.

```bash
npx vsce login <publisher-id>
npm run publish:marketplace
```

## 단축키

| 단축키 | 동작 | 사용 위치 |
| --- | --- | --- |
| `Ctrl+S` | 현재 task 저장 | 새 task 작성, task 수정 |

## Version 0.9.0

- React/Vite 기반 VS Code Webview task manager
- Tiptap rich editor와 Tiptap JSON 저장
- VS Code extension internal JSON 저장소
- task CRUD, 완료 체크, 검색, category 다중 필터, tag chip 입력
- 우선순위 정렬, Daily/Weekly/Monthly 반복 설정
- 왼쪽 목록 상세 펼침/접힘, 자동 펼침, 일반 클릭 링크 열기

## Version 0.9.1

- Activity Bar의 Task Manager 탭 지원
- Activity Bar 아이콘 파일명을 `task-manager-extension-icon.svg`로 정리
- VSIX 패키징 스크립트와 배포 문서 정리

## Version 0.9.2

- task 저장 위치를 워크스페이스 폴더에서 VS Code extension 내부 storage로 변경
- 기존 워크스페이스 `.task-manager/tasks.json` 최초 1회 import 지원
- Task Manager open 시 아무 task도 선택되지 않은 상태로 시작
- task 작성/수정 패널 접기/열기 지원 및 기본 접힘 상태 적용

## Version 0.9.3

- `skill.md`에 안전한 Git workflow 문서화
- 신규 작업 시작 전 `main` 최신화, 작업 상태 확인, branch 생성 절차 정리
- `git add -A`, branch push, PR/merge 중심의 릴리즈 흐름 정리

## Unreleased

- task 작성 영역을 개요, 진행상황, 관련 링크, 관련 메일 4개 editor에서 단일 `Task 내용` editor로 통합
- 새 task 기본 내용을 항목명만 있는 1단계 bullet 템플릿으로 제공
- Task 내용 작성 예시는 `How to Use` 팝업으로 분리
- 기존 저장 데이터의 4개 rich field는 로드 시 단일 `content` 필드로 자동 변환

## 개발 구조

- `src/extension.ts`: VS Code command, Webview view, internal storage, message bridge
- `media/task-manager-extension-icon.svg`: Activity Bar 아이콘
- `src/webview/`: React + Tiptap Webview 앱
- `out/webview/`: Vite가 생성하는 Webview 정적 asset
