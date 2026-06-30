# task-manager-extension-v1

## Data storage

Task and tip data is stored outside the VS Code extension storage at the user's home directory:

```text
~/.task-manager-extension-v1/tasks.json
~/.task-manager-extension-v1/tips.json
```

This location is not inside the installed extension folder, so uninstalling or reinstalling the extension does not remove the task data. On first run after this change, existing data from the previous VS Code extension storage is imported once into this folder.

VS Code Activity Bar에서 사용할 수 있는 로컬 task 관리 Webview extension입니다.

현재 정리 버전: `0.9.6`

## 빠른 시작

의존성을 설치하고 extension과 Webview를 빌드합니다.

```bash
npm install
npm run compile
```

VS Code에서 Run and Debug의 `Run Task Manager Extension`을 실행하거나, Extension Host에서 명령 팔레트의 `Task Manager: Open`을 실행합니다.

설치 후에는 왼쪽 Activity Bar의 `Task Manager` 탭에서 바로 열 수 있습니다.

## 어떤 방식으로 task를 관리하나요?

이 extension은 task를 VS Code 내부 저장소에 저장하고, Webview 화면에서 작성과 탐색을 처리합니다. 워크스페이스 폴더 위치가 바뀌어도 같은 VS Code 사용자 환경에서는 같은 task 목록을 사용할 수 있습니다.

Task 목록은 왼쪽에 표시됩니다. 목록에서는 `Task Description`을 제목으로 보여주고, `Category`는 제목 앞의 작은 라벨로 표시합니다. Category는 검색과 필터링에 사용하는 분류값으로 취급합니다.

## Task 작성

`새 Task`를 누르거나 `Alt+Shift+N`을 누르면 새 task 작성 폼이 열립니다. 시작 시간은 오늘 날짜로 자동 입력되고, 포커스는 Category 입력칸으로 이동합니다.

작성 폼에서 다루는 주요 항목은 다음과 같습니다.

| 항목 | 용도 |
| --- | --- |
| `Task Description` | 목록에서 task 제목으로 표시되는 설명 |
| `Category` | 검색과 필터링에 사용하는 분류 |
| `시작 시간`, `예상 완료 시간` | `YYYY-MM-DD`로 저장되는 날짜 |
| `우선순위` | 1-5 사이 값이며 5가 가장 높음 |
| `반복 설정` | 반복 없음, Daily, Weekly, Monthly |
| `tag` | Enter로 chip 형태 추가 |
| `Task 내용` | Tiptap rich editor로 작성하는 상세 내용 |

날짜는 `6/14`, `6-14`, `06/14`, `06-14`, `26/05/14`, `2026-06-14` 형식으로 입력할 수 있고, blur 또는 Enter 시 `YYYY-MM-DD` 형식으로 정규화됩니다.

`Task 내용`은 개요, 진행상황, 관련 링크, 관련 메일 항목이 들어간 단일 rich editor입니다. `How to Write` 버튼에서 작성 예시를 볼 수 있고, 열린 도움말은 `Esc`로 닫을 수 있습니다.

Rich editor의 undo/redo는 단어 단위에 가깝게 동작합니다. 빠르게 여러 단어를 입력해도 `Ctrl+Z`, `Ctrl+Y`, toolbar `Undo`/`Redo`가 공백, 줄바꿈, 문장부호 기준으로 최근 단어부터 단계적으로 되돌리거나 다시 적용합니다.

## Task 찾기와 필터링

왼쪽 목록의 검색창은 Category, Task Description, tag, Task 내용을 대상으로 검색합니다.

Category는 버튼으로 여러 개를 선택할 수 있습니다. 선택된 Category가 없으면 전체 task가 보이고, `초기화`를 누르면 Category 필터가 해제됩니다.

## 업무 팁 기록

Webview 상단의 `Tasks` / `Tips` 탭으로 task 관리 화면과 업무 팁 화면을 전환할 수 있습니다.

업무 팁은 task와 독립된 메모로 저장됩니다. 각 팁은 제목, 태그, Tiptap rich editor 기반의 팁 내용으로 구성됩니다.

Tips 목록의 검색창은 제목, 태그, 팁 내용을 대상으로 검색합니다. 검색어가 없으면 전체 팁이 최신 수정순으로 표시됩니다.

Tips 화면에서는 `새 팁` 버튼이나 `Alt+Shift+N`으로 새 팁을 작성합니다. 팁 목록에서 항목을 선택하면 오른쪽 편집 영역에 해당 팁이 열리고, 선택된 팁의 본문 미리보기는 기본 접힘 상태로 유지됩니다.

Tips 목록은 `Tab`, `Shift+Tab`으로 아래/위 팁을 이동할 수 있습니다. 마지막 팁에서 `Tab`을 누르면 팁 수정 영역의 제목 입력칸으로 이동하고, 제목 입력칸에서 `Shift+Tab`을 누르면 현재 검색 결과의 마지막 팁으로 돌아갑니다.

태그 입력 후 `Tab`을 누르면 팁 내용 editor로 이동하고, 팁 내용 editor에서 `Shift+Tab`을 누르면 태그 입력으로 돌아갑니다.

## Task 목록 탐색

왼쪽 task item을 선택하면 오른쪽 작성/수정 패널에 해당 task가 열립니다. task를 선택하거나 포커스해도 상세 내용은 자동으로 펼쳐지지 않습니다.

목록에서 task 상세 내용은 펼침 버튼으로 개별 제어하거나, `전체 펼침`과 `전체 접음`으로 한 번에 조정할 수 있습니다. 펼쳐진 Task 내용 안의 URL 또는 Markdown 링크는 일반 클릭으로 외부 브라우저에서 열립니다.

`새 Task` 옆의 `단축키` 버튼을 누르면 Webview에서 사용할 수 있는 단축키 목록을 확인할 수 있습니다.

## 단축키

Global/Webview 단축키:

| 단축키 | 동작 |
| --- | --- |
| `Alt+1` | Tasks 화면으로 전환 |
| `Alt+2` | Tips 화면으로 전환 |
| `Alt+Shift+N` | 새 task 작성 |
| `Alt+Home` | 현재 검색/필터 결과의 첫 번째 task 선택 |

Task item 포커스 단축키:

| 단축키 | 동작 |
| --- | --- |
| `Alt+Up` | task 접기 |
| `Alt+Down` | task 펼치기 |
| `E` 또는 `Enter` | task 수정 및 Task 내용으로 이동 |
| `Tab` | 다음 task 선택, 마지막 task에서는 수정 폼의 Task Description으로 이동 |
| `Shift+Tab` | 이전 task 선택 |

Tips item 포커스 단축키:

| 단축키 | 동작 |
| --- | --- |
| `Alt+Home` | 현재 검색 결과의 첫 번째 팁 선택 |
| `Alt+Up` | 팁 접기 |
| `Alt+Down` | 팁 펼치기 |
| `Tab` | 다음 팁 선택, 마지막 팁에서는 팁 수정 제목으로 이동 |
| `Shift+Tab` | 이전 팁 선택 |

Form/editor 단축키:

| 단축키 | 동작 |
| --- | --- |
| `Ctrl+S` | 현재 task 저장 |
| `Ctrl+Z` | Rich editor 입력을 단어 단위로 undo |
| `Ctrl+Y`, `Shift+Ctrl+Z` | Rich editor 입력을 단어 단위로 redo |
| `Shift+Tab` | task 수정의 Task Description 또는 팁 수정의 제목에서 마지막 항목으로 이동 |
| `Esc` | 열린 도움말 팝업 닫기 |

## 저장 위치

task 데이터는 워크스페이스 폴더가 아니라 VS Code extension 내부 storage에 저장됩니다.

업무 팁 데이터도 같은 VS Code extension 내부 storage에 저장되며, task와 분리된 `tips.json` 파일을 사용합니다.

기존 워크스페이스 `.task-manager/tasks.json`이 있으면 최초 실행 시 한 번 가져옵니다. 저장 파일이 없으면 extension에 포함된 `task_examples`를 기반으로 샘플 task를 생성합니다.

기존 plain string 또는 이전 rich field 데이터는 로드 시 현재 Tiptap JSON 구조로 자동 정규화됩니다.

## 개발과 패키징

개발 중 빌드:

```bash
npm run compile
```

VSIX 파일 생성:

```bash
npm run package:vsix
```

repository URL이 없는 로컬 패키징에서 README 상대 링크 검사가 실패하면 다음 명령으로 VSIX를 생성할 수 있습니다.

```bash
npx vsce package --allow-missing-repository --no-rewrite-relative-links --out task-manager-extension-v1-0.9.6.vsix
```

생성되는 파일:

```text
task-manager-extension-v1-0.9.6.vsix
```

로컬 설치:

```bash
code --install-extension task-manager-extension-v1-0.9.6.vsix
```

Marketplace 배포는 `package.json`의 `publisher`를 실제 VS Code Marketplace publisher ID로 바꾼 뒤 Personal Access Token으로 로그인하고 실행합니다.

```bash
npx vsce login <publisher-id>
npm run publish:marketplace
```

주요 개발 위치:

| 경로 | 역할 |
| --- | --- |
| `src/extension.ts` | VS Code command, Webview view, storage, message bridge |
| `src/webview/` | React + Tiptap Webview 앱 |
| `media/task-manager-extension-icon.svg` | Activity Bar 아이콘 |
| `out/webview/` | Vite가 생성하는 Webview 정적 asset |

## 변경 이력

자세한 변경 이력은 [`RELEASE_NOTES.md`](RELEASE_NOTES.md)를 참고하세요.
