# Integrating Patient Context and Memory Leak Patching

The goal is to enhance MedGuardian by integrating patient-specific data into SHAP and PK Simulations, and to patch critical memory leaks (camera, sockets, VRAM) discovered during live demos.

## User Review Required

> [!IMPORTANT]
> This update includes critical memory management fixes for camera hardware and PyTorch VRAM to prevent browser freezing during long demo sessions.

## Proposed Changes

### [Frontend] Memory Management & Context Integration

#### [MODIFY] [anomalies/page.tsx](file:///c:/Users/Adithyakrishnan/Desktop/Medguardian/frontend/src/app/(dashboard)/anomalies/page.tsx)
- Add "View AI Explanation" button to patient cards.
- Navigate to `/explainability?senior_id={id}&name={name}`.

#### [MODIFY] [explainability/page.tsx](file:///c:/Users/Adithyakrishnan/Desktop/Medguardian/frontend/src/app/(dashboard)/explainability/page.tsx)
- Read `senior_id` and `name` from URL.
- Show "Showing explanation for {name}" context banner.
- Filter SHAP API call by `senior_id`.

#### [MODIFY] [dashboard/page.tsx](file:///c:/Users/Adithyakrishnan/Desktop/Medguardian/frontend/src/app/(dashboard)/dashboard/page.tsx)
- Add "Drug Level" card for last medication PK.
- **[NEW]** Bulletproofed Socket.IO listener cleanup.

#### [MODIFY] [pk-simulations/page.tsx](file:///c:/Users/Adithyakrishnan/Desktop/Medguardian/frontend/src/app/(dashboard)/pk-simulations/page.tsx)
- Add auto-run logic for medication query params.

#### [MODIFY] [AIVerificationModal.tsx](file:///c:/Users/Adithyakrishnan/Desktop/Medguardian/frontend/src/components/AIVerificationModal.tsx)
- **[NEW]** Explicit camera track cleanup and `srcObject = null` on unmount.

#### [MODIFY] [AIFeedModal.tsx](file:///c:/Users/Adithyakrishnan/Desktop/Medguardian/frontend/src/components/AIFeedModal.tsx)
- **[NEW]** Explicit camera track cleanup and `srcObject = null` on unmount.

---

### [Backend] VRAM Optimization & API Updates

#### [MODIFY] [explain.ts](file:///c:/Users/Adithyakrishnan/Desktop/Medguardian/frontend/src/lib/api/explain.ts)
- Updated `getGlobalExplanation` to handle `senior_id`.

#### [MODIFY] [verification_service.py](file:///c:/Users/Adithyakrishnan/Desktop/Medguardian/app/services/verification_service.py)
- **[NEW]** Added `gc.collect()` and `torch.cuda.empty_cache()` after inference.

#### [MODIFY] [medication_service.py](file:///c:/Users/Adithyakrishnan/Desktop/Medguardian/app/services/medication_service.py)
- **[NEW]** Added VRAM cleanup after neural training.

## Verification Plan

### Automated Tests
- Run `npm run build` in `frontend/` to ensure no lint/type errors.

### Manual Verification
- Open `Anomalies`, click "View AI Explanation", verify parameter passing.
- Open `Dashboard`, verify "Drug Level" card appears for last taken med.
- Verify click-through from Dashboard to `PK Simulations` auto-runs.
- Test `AIVerificationModal` multiple times to ensure no browser lag buildup.
