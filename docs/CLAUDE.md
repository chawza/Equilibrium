this is where a human readable documents about this project

- high level documentation, not a deep technical document.
- used as referenced for implementing features.
- readable by user, future developer, or PM

# Workflow
1. `CLAUDE_DESIGN` : initial project reference
2. this doc `docs/*`: synthesized from CLAUDE_DESIGN and developer's feedback. may explain non visual requirement that cannot be described in CLAUDE_DESIGN
3. `src` and `src-tauri`: implements CLAUDE_DESIGN and `docs`

# Sync
- if user ask to sync design, check the CLAUDE_DESIGN dir and compare against this `docs` dir.
- try to get the design diff from below LAST COMMIT SYNC to current HEAD
- docs reference can also be a document and other sources other than CLAUDE_DESIGN
- you must inform any conflicting requirement and adjust docs as needed, preventing future agent confusion



## LAST COMMIT SYNC
```
9d325fa
```
> update this part after sync
