# task-manager-extension-v1

VS Code Webview 기반 로컬 task 관리 확장입니다.

현재 정리 버전: `0.9.0`

## 기능

- Webview에서 task 생성, 작성, 수정, 삭제
- task 완료 여부 체크
- task 검색 및 category 필터링
- category 버튼 다중 선택 필터 및 초기화
- task tag 추가 및 표시
- 왼쪽 task 목록에서 상세 내용 펼침/접힘
- 왼쪽 task 목록 전체 펼침/전체 접음
- task 선택 시 왼쪽 목록 상세 자동 펼침
- 왼쪽 목록 상세에서 하이퍼링크 일반 클릭으로 외부 브라우저 열기
- 새 task 작성 시 시작 시간 오늘 날짜 자동 입력
- 우선순위 1~5 선택, 높은 우선순위가 왼쪽 목록 상단에 표시
- Daily, Weekly, Monthly 반복 task 설정
- rich editor별 작성 가이드 표시
- React 기반 Webview UI
- Tiptap rich editor로 개요, 진행상황, 관련 링크, 관련 메일 편집
- rich editor 내용은 Tiptap JSON으로 저장
- 워크스페이스 내부 `.task-manager/tasks.json` 로컬 저장
- `task_examples` 기반 초기 샘플 task 생성

## 실행

```bash
npm install
npm run compile
```

VS Code Extension Host에서 명령 팔레트로 `Task Manager: Open`을 실행합니다.

또는 VS Code의 Run and Debug에서 `Run Task Manager Extension`을 실행합니다.

## 단축키

| 단축키 | 동작 | 사용 위치 |
| --- | --- | --- |
| `Ctrl+S` | 현재 task 저장 | 새 task 작성, task 수정 |

## Version 0.9.0

- React/Vite 기반 VS Code Webview task manager
- Tiptap rich editor와 Tiptap JSON 저장
- workspace local JSON 저장소
- task CRUD, 완료 체크, 검색, category 다중 필터, tag chip 입력
- 우선순위 정렬, Daily/Weekly/Monthly 반복 설정
- 왼쪽 목록 상세 펼침/접힘, 자동 펼침, 일반 클릭 링크 열기

## 개발 구조

- `src/extension.ts`: VS Code command, Webview panel, local storage, message bridge
- `src/webview/`: React + Tiptap Webview 앱
- `out/webview/`: Vite가 생성하는 Webview 정적 asset
