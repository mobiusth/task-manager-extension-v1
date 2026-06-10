# Release Notes

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
