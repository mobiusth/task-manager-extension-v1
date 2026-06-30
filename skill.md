# Task Manager Extension Skill

## 버전

현재 정리 버전은 `0.9.6`입니다.

## 목표

이 프로젝트는 VS Code Webview 안에서 task를 생성, 작성, 수정, 삭제하고 완료 여부를 체크하는 로컬 task 관리 확장입니다.
왼쪽 Activity Bar에 `Task Manager` 탭을 제공해 Explorer, Search, Source Control처럼 선택할 수 있습니다.

## Task 구조

각 task는 사용자 홈 디렉터리의 `~/.task-manager-extension-v1/tasks.json`에 JSON 배열로 저장됩니다.

```json
{
  "id": "고유 ID",
  "category": "UEM",
  "description": "UEM v2.0 개발 및 배포",
  "startDate": "2026-06-10",
  "expectedEndDate": "2026-06-17",
  "priority": 3,
  "schedule": "none",
  "tags": ["UEM", "QA"],
  "completed": false,
  "content": {
    "type": "doc",
    "content": [
      {
        "type": "bulletList",
        "content": [
          {
            "type": "listItem",
            "content": [
              {
                "type": "paragraph",
                "content": [{ "type": "text", "text": "개요" }]
              }
            ]
          }
        ]
      }
    ]
  },
  "createdAt": "ISO 날짜",
  "updatedAt": "ISO 날짜"
}
```

## Work Tip 구조

각 업무 팁은 task와 분리되어 사용자 홈 디렉터리의 `~/.task-manager-extension-v1/tips.json`에 JSON 배열로 저장됩니다.

```json
{
  "id": "고유 ID",
  "title": "업무 팁 제목",
  "tags": ["Git", "VS Code"],
  "content": {
    "type": "doc",
    "content": [
      {
        "type": "paragraph",
        "content": [{ "type": "text", "text": "팁 내용" }]
      }
    ]
  },
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
- 새 task 작성 폼이 열리면 Category 입력칸으로 포커스가 이동합니다.
- `Alt+Shift+N`으로도 새 task 작성 폼을 열 수 있습니다.
- Task Description, category, 시작 시간, 예상 완료 시간, tag를 입력합니다.
- 왼쪽 목록의 task 제목은 Task Description을 사용하고, Category는 제목 앞에 작은 라벨로 표시됩니다.
- 날짜는 `6/14`, `6-14`, `06/14`, `06-14`, `26/05/14`, `2026-06-14` 형식으로 입력할 수 있으며 blur 또는 Enter 시 `YYYY-MM-DD`로 정규화됩니다.
- 월/일만 입력한 날짜는 기준 연도를 사용합니다. 시작 시간은 올해, 예상 완료 시간은 시작 시간이 있으면 시작 시간의 연도를 기준으로 해석합니다.
- 우선순위는 1부터 5까지 선택하며 5가 가장 높고 1이 가장 낮습니다.
- 반복 설정은 반복 없음, Daily, Weekly, Monthly 중 하나를 선택합니다.
- tag는 입력 후 Enter를 눌러 chip 형태로 여러 개를 추가할 수 있습니다.
- Task 내용은 하나의 Tiptap rich editor에서 작성합니다.
- 새 task에는 개요, 진행상황, 관련 링크, 관련 메일 항목명이 1단계 bullet 템플릿으로 미리 작성됩니다.
- Task 내용 작성 예시는 `How to Write` 버튼으로 팝업에서 확인합니다.
- `How to Write` 작성 예시는 개요, 진행상황, 관련 링크, 관련 메일 아래에 bullet 예시를 보여줍니다.
- 열린 도움말 팝업은 `Esc`로 닫을 수 있습니다.
- rich editor는 bold, italic, heading, list, quote, inline code, undo, redo를 지원합니다.
- rich editor의 undo/redo는 공백, 줄바꿈, 문장부호 기준의 단어 단위로 분리됩니다. `Ctrl+Z`, `Ctrl+Y`, toolbar `Undo`/`Redo`가 최근 단어부터 단계적으로 undo/redo합니다.
- `저장` 버튼으로 생성 또는 수정을 완료합니다.
- 목록의 체크박스로 완료 여부를 바꿉니다.
- 왼쪽 목록에서 검색어와 category 버튼 필터로 task를 찾습니다.
- category 버튼은 여러 개 선택할 수 있고, `초기화`를 누르면 전체 task가 보입니다.
- Task Manager를 처음 열면 아무 task도 선택하지 않은 상태로 시작합니다.
- Task Manager를 처음 열면 task 작성/수정 패널은 접힌 상태입니다.
- 왼쪽 목록의 펼침 버튼 또는 `전체 펼침`, `전체 접음`으로 Task 내용을 확인합니다.
- 왼쪽 목록에서 task를 선택하거나 포커스해도 상세 내용은 자동으로 펼쳐지지 않습니다.
- task item에 포커스가 있을 때 `Alt+Up`, `Alt+Down`으로 해당 task를 접거나 펼칠 수 있습니다.
- `Alt+Home`으로 현재 검색/필터 결과의 첫 번째 task로 이동할 수 있습니다.
- `새 Task` 옆 `단축키` 버튼으로 Webview 단축키 목록을 확인할 수 있습니다.
- task item에 포커스가 있을 때 `Tab`, `Shift+Tab`으로 다음/이전 task로 이동할 수 있습니다.
- 마지막 task item에서 `Tab`을 누르면 해당 task를 선택하고 task 수정 Task Description 입력칸으로 이동합니다.
- task 수정 Task Description 입력칸에서 `Shift+Tab`을 누르면 현재 검색/필터 결과의 마지막 task로 이동합니다.
- task 수정 접기/열기 버튼에서 `Shift+Tab`을 누르면 현재 검색/필터 결과의 마지막 task로 이동합니다.
- task item에 포커스가 있을 때 `E` 또는 `Enter`를 누르면 해당 task를 수정하면서 Task 내용 editor로 이동합니다.
- 새 task 또는 task 수정 중 `Ctrl+S`로 저장할 수 있습니다.
- 왼쪽 목록 상세의 URL 또는 Markdown 링크는 일반 클릭으로 외부 브라우저에서 열립니다.
- 목록 또는 상세 화면의 삭제 버튼으로 task를 삭제합니다.
- Webview 상단의 `Tasks` / `Tips` 탭으로 task 관리 화면과 업무 팁 화면을 전환합니다.
- `Alt+1`로 Tasks 화면, `Alt+2`로 Tips 화면으로 전환할 수 있습니다.
- Tasks와 Tips 화면에 진입하면 각 화면의 검색 입력칸에 포커스가 이동합니다.
- Tips 화면에서 `새 팁` 버튼 또는 `Alt+Shift+N`으로 업무 팁을 작성합니다.
- 업무 팁은 제목, 태그, Tiptap rich editor 기반 팁 내용으로 구성됩니다.
- Tips 목록 검색은 제목, 태그, 팁 내용을 대상으로 합니다.
- Tips item은 선택해도 상세 미리보기가 자동으로 펼쳐지지 않고 접힌 상태를 유지합니다.
- Tips item에 포커스가 있을 때 `Tab`, `Shift+Tab`으로 다음/이전 팁으로 이동합니다.
- 마지막 Tips item에서 `Tab`을 누르면 팁 수정 제목 입력칸으로 이동합니다.
- 팁 수정 제목 입력칸에서 `Shift+Tab`을 누르면 현재 검색 결과의 마지막 팁으로 이동합니다.
- 태그 입력에서 `Tab`을 누르면 팁 내용 editor로 이동하고, 팁 내용 editor에서 `Shift+Tab`을 누르면 태그 입력으로 돌아갑니다.
- Tips 화면에서 `Alt+Home`으로 현재 검색 결과의 첫 번째 팁으로 이동할 수 있습니다.
- Tips item에 포커스가 있을 때 `Alt+Up`, `Alt+Down`으로 해당 팁을 접거나 펼칠 수 있습니다.
- Tips 화면의 `단축키` 버튼으로 팁 관련 단축키 목록을 확인할 수 있습니다.
- 팁 작성 또는 수정 중 `Ctrl+S`로 저장할 수 있습니다.

## 저장 정책

- task 데이터는 워크스페이스 폴더나 VS Code extension 내부 storage가 아니라 사용자 홈 디렉터리의 `~/.task-manager-extension-v1/tasks.json`에 저장됩니다.
- 업무 팁 데이터는 task와 분리된 `~/.task-manager-extension-v1/tips.json`에 저장됩니다.
- extension을 삭제하거나 재설치해도 사용자 홈 디렉터리의 저장 파일은 유지됩니다.
- 새 저장 파일이 없고 기존 VS Code extension 내부 storage의 `tasks.json` 또는 `tips.json`이 있으면 최초 1회 가져옵니다.
- 기존 extension 내부 저장 파일도 없고 워크스페이스 `.task-manager/tasks.json`이 있으면 task 데이터를 최초 1회 가져옵니다.
- 저장 파일이 없으면 extension에 포함된 `task_examples` 내용을 기반으로 초기 샘플 task를 생성합니다.
- 기존 plain string text 데이터는 로드 시 Tiptap JSON 문서로 자동 변환합니다.
- 기존 `overview`, `progress`, `links`, `mails` 저장 데이터는 로드 시 단일 `content` bullet 문서로 자동 변환합니다.

## Git workflow

릴리즈나 기능 변경은 다음 순서로 진행합니다.

1. `main`을 최신 상태로 맞춘 뒤 신규 branch를 생성합니다.

```bash
git switch main
git pull
git switch -c release/0.9.x
```

2. 코드, `RELEASE_NOTES.md`, `README.md`, `skill.md`, version metadata를 수정합니다.
   작업이 완료된 후에는 `README.md`, `RELEASE_NOTES.md`, `skill.md` 파일을 수정합니다.
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
- Task Description 필드를 추가하고 왼쪽 목록 제목을 Description 중심으로 표시합니다.
- category 다중 선택 버튼 필터, 전체 펼침/전체 접음, 새 task 오늘 날짜 기본값을 추가했습니다.
- 우선순위 필드와 Daily/Weekly/Monthly 반복 설정을 추가했습니다.
- 왼쪽 task 목록은 우선순위가 높은 순서로 표시합니다.
- 개요, 진행상황, 관련 링크, 관련 메일을 단일 Task 내용 editor의 1단계 bullet 템플릿으로 통합하고, 작성 예시는 `How to Write` 팝업으로 분리했습니다.
- `Ctrl+S` 저장, 왼쪽 목록 하이퍼링크 렌더링을 추가했습니다.
- `Alt+Shift+N` 새 task 생성, `Alt+Home` 첫 task 이동, `Alt+Up/Down` task 접기/펼치기, task item `Tab` 이동, `E`/`Enter` 편집 진입, 유연한 날짜 입력 정규화를 추가했습니다.
- 업무 팁 저장 공간, `tips.json` 저장소, Tips CRUD UI, 제목/태그/내용 검색을 추가했습니다.
- `Alt+1`/`Alt+2` Tasks/Tips 전환, Tips `Alt+Home`, Tips `Alt+Up/Down`, Tips item `Tab`/`Shift+Tab` 이동을 추가했습니다.
- Tasks와 Tips 화면 진입 시 검색 입력칸으로 포커스가 이동하도록 정리했습니다.
- 마지막 task에서 Task Description으로 이동하고, 마지막 tip에서 팁 제목으로 이동하는 키보드 흐름을 추가했습니다.
- React/Vite Webview 앱으로 UI를 분리했습니다.
- Tiptap 기반 rich editor와 Tiptap JSON 저장 방식을 추가했습니다.
- Rich editor undo/redo를 Tiptap/ProseMirror history boundary로 보완해 공백, 줄바꿈, 문장부호 기준의 단어 단위로 분리했습니다.
