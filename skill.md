# Task Manager Extension Skill

## 버전

현재 정리 버전은 `0.9.3`입니다.

## 목표

이 프로젝트는 VS Code Webview 안에서 task를 생성, 작성, 수정, 삭제하고 완료 여부를 체크하는 로컬 task 관리 확장입니다.
왼쪽 Activity Bar에 `Task Manager` 탭을 제공해 Explorer, Search, Source Control처럼 선택할 수 있습니다.

## Task 구조

각 task는 VS Code extension 내부 storage의 `tasks.json`에 JSON 배열로 저장됩니다.

```json
{
  "id": "고유 ID",
  "category": "UEM",
  "startDate": "2026-06-10",
  "expectedEndDate": "2026-06-17",
  "priority": 3,
  "schedule": "none",
  "tags": ["UEM", "QA"],
  "completed": false,
  "overview": {
    "type": "doc",
    "content": [
      {
        "type": "paragraph",
        "content": [{ "type": "text", "text": "개요 텍스트" }]
      }
    ]
  },
  "progress": { "type": "doc", "content": [{ "type": "paragraph" }] },
  "links": { "type": "doc", "content": [{ "type": "paragraph" }] },
  "mails": { "type": "doc", "content": [{ "type": "paragraph" }] },
  "createdAt": "ISO 날짜",
  "updatedAt": "ISO 날짜"
}
```

## 실행 방법

1. 프로젝트 폴더에서 의존성을 설치합니다.

```bash
npm install
```

2. TypeScript를 컴파일합니다.

```bash
npm run compile
```

3. VS Code에서 Extension Host를 실행한 뒤 명령 팔레트에서 `Task Manager: Open`을 실행합니다.
4. 또는 왼쪽 Activity Bar의 `Task Manager` 탭을 선택합니다.

## 사용 흐름

- `새 Task` 버튼으로 새 task 작성 폼을 열면 시작 시간은 오늘 날짜로 자동 입력됩니다.
- category, 시작 시간, 예상 완료 시간, tag를 입력합니다.
- 우선순위는 1부터 5까지 선택하며 5가 가장 높고 1이 가장 낮습니다.
- 반복 설정은 반복 없음, Daily, Weekly, Monthly 중 하나를 선택합니다.
- tag는 쉼표로 구분해서 여러 개를 추가할 수 있습니다.
- 개요, 진행상황, 관련 링크, 관련 메일은 Tiptap rich editor로 작성합니다.
- 각 rich editor 위의 가이드 텍스트를 참고해 작성합니다.
- rich editor는 bold, italic, heading, list, quote, inline code, undo, redo를 지원합니다.
- `저장` 버튼으로 생성 또는 수정을 완료합니다.
- 목록의 체크박스로 완료 여부를 바꿉니다.
- 왼쪽 목록에서 검색어와 category 버튼 필터로 task를 찾습니다.
- category 버튼은 여러 개 선택할 수 있고, `초기화`를 누르면 전체 task가 보입니다.
- Task Manager를 처음 열면 아무 task도 선택하지 않은 상태로 시작합니다.
- Task Manager를 처음 열면 task 작성/수정 패널은 접힌 상태입니다.
- 왼쪽 목록의 펼침 버튼 또는 `전체 펼침`, `전체 접음`으로 개요, 진행상황, 관련 링크, 관련 메일을 확인합니다.
- 왼쪽 목록에서 task를 선택하면 해당 task 상세가 자동으로 펼쳐집니다.
- 새 task 또는 task 수정 중 `Ctrl+S`로 저장할 수 있습니다.
- 왼쪽 목록 상세의 URL 또는 Markdown 링크는 일반 클릭으로 외부 브라우저에서 열립니다.
- 목록 또는 상세 화면의 삭제 버튼으로 task를 삭제합니다.

## 저장 정책

- task 데이터는 워크스페이스 폴더가 아니라 VS Code extension 내부 storage에 저장됩니다.
- 폴더 위치가 바뀌어도 같은 VS Code 사용자 환경에서는 같은 task 목록을 사용합니다.
- 내부 저장 파일이 없고 기존 워크스페이스 `.task-manager/tasks.json`이 있으면 최초 1회 가져옵니다.
- 저장 파일이 없으면 extension에 포함된 `task_examples` 내용을 기반으로 초기 샘플 task를 생성합니다.
- 기존 plain string text 데이터는 로드 시 Tiptap JSON 문서로 자동 변환합니다.

## Git workflow

릴리즈나 기능 변경은 다음 순서로 진행합니다.

1. `main`을 최신 상태로 맞춘 뒤 신규 branch를 생성합니다.

```bash
git switch main
git pull
git switch -c release/0.9.x
```

2. 코드, `RELEASE_NOTES.md`, `README.md`, `skill.md`, version metadata를 수정합니다.
3. 검증 명령을 실행합니다.

```bash
npm run compile
npm run package:vsix
```

4. 변경 파일을 확인하고 stage합니다. `git add *` 대신 삭제/숨김 파일까지 반영되는 `git add -A`를 사용합니다.

```bash
git status --short
git add -A
```

5. commit 메시지를 명확히 작성해서 commit합니다.

```bash
git commit -m "Release 0.9.x"
```

6. 신규 branch를 remote에 push합니다. 신규 branch에서 `main`으로 직접 push하지 않습니다.

```bash
git push -u origin release/0.9.x
```

7. PR을 생성해 review 후 `main`으로 merge합니다. 직접 merge가 필요한 로컬 작업이라면 `main`으로 이동 후 merge합니다.

```bash
git switch main
git pull
git merge --no-ff release/0.9.x
git push origin main
```

주의: `git push origin branch-name:main`처럼 신규 branch에서 main으로 직접 push하는 방식은 review와 보호 규칙을 우회할 수 있으므로 사용하지 않습니다.

## 교육용 TODO 해결 내용

- VS Code extension의 command 등록 구조를 추가했습니다.
- VS Code Activity Bar의 Task Manager view container와 Webview view를 추가했습니다.
- Webview 기반 CRUD UI를 구현했습니다.
- Extension과 Webview 사이의 메시지 인터페이스를 구현했습니다.
- VS Code extension 내부 JSON 저장소를 구현했습니다.
- task 검색, category 필터, tag 입력, 목록 펼침/접힘 기능을 추가했습니다.
- category 다중 선택 버튼 필터, 전체 펼침/전체 접음, 새 task 오늘 날짜 기본값을 추가했습니다.
- 우선순위 필드와 Daily/Weekly/Monthly 반복 설정을 추가했습니다.
- 왼쪽 task 목록은 우선순위가 높은 순서로 표시합니다.
- 개요, 진행상황, 관련 링크, 관련 메일 작성 가이드를 추가했습니다.
- task 선택 시 자동 펼침, `Ctrl+S` 저장, 왼쪽 목록 하이퍼링크 렌더링을 추가했습니다.
- React/Vite Webview 앱으로 UI를 분리했습니다.
- Tiptap 기반 rich editor와 Tiptap JSON 저장 방식을 추가했습니다.
