# Task Tracker Handoff

## Goal
Task Tracker is becoming a simple task tracker plus a discipline/memory system. Normal tasks are for productivity. Projects are Proof of Work folders where users complete recurring discipline habits with photo proof. Memories store proof photos by project, and Calendar shows date-wise history.

## Current Product Direction
- Bottom nav: Home, Calendar, Projects
- Projects are discipline folders like Fitness, Flute, Study, Business
- Each project has a daily proof task
- Proof completion requires photo from camera or gallery
- Proof memories should be saved under the project
- Calendar should show normal tasks, proof memories, and missed proof days
- Memories should work like Snapchat memories but organized by project
- Fixed Time projects should trigger alarm-style reminder screen
- Anytime Today projects can be completed anytime before day ends

## Current State
- Projects screen exists.
- Empty state exists.
- Create Project modal exists.
- Project Detail screen exists.
- Alarm modal/screen exists.
- Bottom nav shows Home, Calendar, Projects.
- Project cards are being created.
- Some validation problems still exist.
- Untitled projects can currently be created.
- Edit/delete actions are currently missing.

## Files In Progress
- Projects screen: `app/projects/index.tsx`
- Create Project modal/form: `app/projects/index.tsx`
- Project Detail screen: `app/projects/[id].tsx`
- Calendar screen: `app/calendar.tsx`
- Memories screen: `app/memories.tsx`
- Alarm screen/modal: `components/alarm-overlay.tsx`
- Photo proof capture/upload modal: `components/photo-proof-modal.tsx`
- Memory detail modal: `components/memory-detail-modal.tsx`
- Task/project storage/state management: `contexts/app-state.tsx`, `data/tasks.ts`
- Navigation/bottom tabs and shared UI: `components/ui.tsx`, `app/_layout.tsx`
- Proof of Work redirect/legacy route: `app/proof-of-work.tsx`
- Existing task screens: `app/home.tsx`, `app/tasks.tsx`, `app/task/[id].tsx`, `app/task-form.tsx`, `app/project/[id].tsx`

## Recent Changes
- Refactored Proof of Work into Projects.
- Changed bottom nav to Home, Calendar, Projects.
- Added project cards.
- Added Create Project form.
- Added Schedule Mode: Anytime Today and Fixed Time.
- Added alarm message field.
- Added reminder frequency field.
- Added Project Detail screen.
- Added alarm-style reminder UI.
- Added empty Projects state.

## Current Problems / Bugs
1. User can create an Untitled project with empty fields.
2. Create Project form does not properly validate required fields.
3. Project Detail has no edit option.
4. Project Detail has no archive/delete option.
5. Memories have no edit/archive/delete control.
6. Alarm screen can show Untitled project because invalid project data is allowed.
7. Project cards may show empty placeholders instead of meaningful icons/thumbnails.
8. Some long text like alarm message may be truncated without a way to view/edit full text.
9. Need to ensure no nested button/Pressable errors remain.
10. Need to ensure project creation does not create duplicate/random pending task banners.

## Failed Attempts / Things To Avoid
- Do not mix create form, pending proofs, saved proofs, and memories all on one global Proof of Work screen.
- Do not create random pending proof cards immediately without project structure.
- Do not allow empty project names or empty daily proof tasks.
- Do not make Calendar the only place where photos can be viewed.
- Do not make saved photo thumbnails non-clickable.
- Avoid nested button/Pressable structures that cause button nesting errors.

## Next Steps
1. Add validation to Create Project form.
2. Disable Create Project button until required fields are valid.
3. Prevent Untitled project creation.
4. Add 3-dot menu on Project Detail screen.
5. Add Edit Project flow.
6. Add Archive Project flow.
7. Add Delete Project flow with confirmation.
8. Add Memory detail action menu.
9. Add Edit Note / Archive Memory / Delete Memory options.
10. Improve empty thumbnail placeholders with icons or initials.
11. Ensure alarm only triggers for valid projects.
12. Ensure Calendar, Memories, and Project Detail all open full memory detail when photo is tapped.
13. Add duplicate project name warning.
14. Test full flow: create project -> add photo proof -> view memory -> edit project -> archive/delete.

## UX Principles
- Keep UI minimal and dark.
- Use soft green accent.
- Projects should feel like discipline folders.
- Memories should feel emotional and nostalgic.
- Alarm should feel strong and unavoidable.
- User should always have control to edit/archive/delete, but destructive actions must require confirmation.

## Important Copy
- Plan it. Prove it. Remember it.
- Complete it. Capture it. Remember it.
- Dude, yeh wala task toh nhi bhula?
