# SSHyar smoke checklist (refactor gate)

Run after each refactor phase. App must stay usable.

- [ ] Boot / unlock (with and without master password)
- [ ] Connect profile → terminal works
- [ ] SFTP browse, upload, View/Edit
- [ ] Follow shell (bash): cwd sync; non-bash: Follow disabled or explained
- [ ] Right-click empty SFTP → cd here in terminal
- [ ] Docker probe / list (if enabled)
- [ ] Nginx View/Edit config
- [ ] Lock vault (master password only); unlock again
- [ ] Frameless: drag titlebar, minimize / maximize / close
- [ ] `npx tsc --noEmit` and `cargo test` green
