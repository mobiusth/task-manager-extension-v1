# Release Notes

## 0.9.5

### Added

- Webview 내부에 `Tasks` / `Tips` 전환 탭을 추가했습니다.
- 업무 팁을 별도 `tips.json` 저장소에 저장하는 CRUD 흐름을 추가했습니다.
- 업무 팁은 제목, 태그, Tiptap rich editor 기반 팁 내용으로 작성할 수 있습니다.
- Tips 검색은 제목, 태그, 팁 내용을 대상으로 동작합니다.
- `Alt+1`, `Alt+2`로 Tasks/Tips 화면을 전환할 수 있습니다.
- Tips 화면에서 `Alt+Shift+N` 새 팁 작성, `Ctrl+S` 저장, `Alt+Home` 첫 번째 팁 이동을 지원합니다.
- Tips item에서 `Alt+Up`, `Alt+Down`으로 접기/펼치기를 지원합니다.
- Tips 목록과 팁 편집 폼 사이의 `Tab`, `Shift+Tab` 포커스 이동을 추가했습니다.
- Tips 단축키 설명 팝업을 추가했습니다.

### Changed

- Tasks와 Tips 화면 진입 시 검색 입력칸에 포커스가 가도록 변경했습니다.
- 마지막 task에서 `Tab`을 누르면 Category가 아니라 Task Description 입력칸으로 이동하도록 변경했습니다.
- Task Description에서 `Shift+Tab`을 누르면 현재 검색/필터 결과의 마지막 task로 이동합니다.
- Tips 목록에서 `Tab`, `Shift+Tab`은 팁 item 간 이동으로 동작하며, 마지막 팁에서 `Tab`을 누르면 팁 제목 입력칸으로 이동합니다.
- Tips 화면의 사용자 표시 문구와 단축키 팝업 문구를 한국어로 정리했습니다.

### Build

- 로컬 repository URL이 없는 환경에서 VSIX를 만들 때 `--no-rewrite-relative-links` 옵션으로 README 상대 링크 검사를 우회할 수 있음을 확인했습니다.
- 앱 버전을 `0.9.5`로 올렸습니다.
- VSIX 출력 파일명을 `task-manager-extension-v1-0.9.5.vsix`로 갱신했습니다.

## 0.9.4

### Added

- `Alt+Shift+N`으로 새 task 작성 폼을 여는 단축키를 추가했습니다.
- `Alt+Home`으로 현재 검색/필터 결과의 첫 번째 task로 이동할 수 있습니다.
- 새 task 작성 시 Category 입력칸으로 자동 포커스됩니다.
- `새 Task` 옆에 Webview 단축키 목록을 여는 `단축키` 버튼을 추가했습니다.
- Task Description 필드를 추가했습니다.
- task item에 포커스가 있을 때 `Alt+Up`, `Alt+Down`으로 해당 task를 접거나 펼칠 수 있습니다.
- task item에 포커스가 있을 때 `Tab`, `Shift+Tab`으로 다음/이전 task를 선택할 수 있습니다.
- 마지막 task item에서 `Tab`을 누르면 task 수정 Category 입력칸으로 이동합니다.
- task 수정 접기/열기 버튼에서 `Shift+Tab`을 누르면 현재 검색/필터 결과의 마지막 task로 이동합니다.
- task item에 포커스가 있을 때 `E` 또는 `Enter`로 task 수정의 Task 내용 editor로 이동할 수 있습니다.
- 날짜 입력에서 `6/14`, `6-14`, `06/14`, `06-14`, `26/05/14`, `2026-06-14` 형식을 `YYYY-MM-DD`로 자동 정규화합니다.

### Changed

- task 작성 영역을 개요, 진행상황, 관련 링크, 관련 메일 4개 rich editor에서 단일 `Task 내용` rich editor로 통합했습니다.
- task 선택/포커스 시 상세 내용이 자동으로 펼쳐지지 않도록 변경했습니다.
- 왼쪽 task 목록은 Task Description을 제목으로 표시하고 Category는 제목 앞 라벨로 표시합니다.
- 새 task 작성 시 개요, 진행상황, 관련 링크, 관련 메일 항목명만 1단계 bullet 템플릿으로 미리 작성됩니다.
- Task 내용 작성 예시는 `How to Write` 팝업으로 분리했습니다.
- `How to Write` 작성 예시를 항목별 bullet 구조로 정리했습니다.
- 도움말 팝업은 `Esc`로 닫을 수 있습니다.
- Rich editor undo/redo를 공백, 줄바꿈, 문장부호 기준의 단어 단위로 분리했습니다. `Ctrl+Z`, `Ctrl+Y`, toolbar `Undo`/`Redo`가 최근 단어부터 단계적으로 undo/redo합니다.
- 기존 `overview`, `progress`, `links`, `mails` 저장 데이터는 로드 시 단일 `content` bullet 문서로 자동 변환됩니다.

### Documentation

- README를 기능 나열 중심에서 빠른 시작, 사용 흐름, 단축키, 저장 정책 중심으로 재구성했습니다.

### Build

- 앱 버전을 `0.9.4`로 올렸습니다.
- VSIX 출력 파일명을 `task-manager-extension-v1-0.9.4.vsix`로 갱신했습니다.

## 0.9.3

### Documentation

- `skill.md`에 Git workflow 섹션을 추가했습니다.
- 신규 작업 시작 전 `main` 최신화, 작업 상태 확인, branch 생성 절차를 정리했습니다.
- `git add *` 대신 `git add -A` 사용을 권장하도록 문서화했습니다.
- 신규 branch에서 `main`으로 직접 push하지 않고 branch push 후 PR/merge를 사용하는 흐름을 명시했습니다.

### Build

- VSIX 출력 파일명을 `task-manager-extension-v1-0.9.3.vsix`로 갱신했습니다.

## 0.9.2

### Added

- Task Manager open 시 task 작성/수정 패널을 기본 접힘 상태로 표시합니다.
- task 작성/수정 패널에 `열기`/`접기` 버튼을 추가했습니다.
- 기존 워크스페이스 `.task-manager/tasks.json` 데이터를 VS Code 내부 저장소로 최초 1회 가져오는 migration을 추가했습니다.

### Changed

- task 저장 위치를 워크스페이스 폴더에서 VS Code extension 내부 storage로 변경했습니다.
- Task Manager를 처음 열면 아무 task도 선택되지 않은 상태로 시작합니다.
- `Ctrl+S` 저장은 작성/수정 패널이 열려 있을 때만 동작합니다.

### Build

- VSIX 출력 파일명을 `task-manager-extension-v1-0.9.2.vsix`로 갱신했습니다.
