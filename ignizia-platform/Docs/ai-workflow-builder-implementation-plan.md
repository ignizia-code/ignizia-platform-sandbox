# AI Workflow Builder - Implementation Plan

## Overview
Build a voice-driven AI workflow co-pilot that extracts mental models from narrative and visualizes them as structured workflow graphs.

**Core Principle:** The conversation is primary. The canvas is the visible memory of the conversation.

---

## Current Status

**Phase:** 1 & 2 COMPLETED (Foundation + Voice + Layout + Additional Features)  
**Status:** Core functionality complete with Phase 2 voice integration and auto-layout  
**Total Time Invested:** ~22-25 hours  

---

## Completed Features

### ✅ Phase 1: Foundation - Text-Based Workflow Extraction (COMPLETED)

#### 1.1 Workflow Extraction API
**File:** `/api/workflow-extract.ts`
- [x] POST endpoint accepting `{ narrative: string, existingWorkflow?: Workflow }`
- [x] OpenAI integration with JSON mode
- [x] System prompt implementing Extract/Assess/Plan logic
- [x] Return structured response with nodes, edges, nextQuestion, isComplete, assessment
- [x] **ENHANCED:** Added user/company context (Daniel Kraus, FerroWorks Manufacturing)
- [x] **ENHANCED:** AI never stops - always asks follow-up questions

**Phase 1 Time:** ~10-12 hours

---

### ✅ Phase 2: Voice Integration (COMPLETED)

#### 2.1 Voice Input (Transcription)
**File:** `/components/WorkflowChat.tsx`
- [x] Microphone button in chat input
- [x] MediaRecorder API for browser recording
- [x] AudioBars waveform visualization during recording
- [x] Transcription via `/api/transcribe.ts` (OpenAI Whisper)
- [x] **ChatBot-style flow:** Record → Confirm/Cancel → Text fills input (not auto-sent)
- [x] User can edit transcribed text before sending

#### 2.2 Voice Output (TTS)
**File:** `/components/WorkflowChat.tsx`
- [x] **Auto-Voice Toggle** in header - persists across tab switches
- [x] **Per-message speaker buttons** - manual playback (ChatBot-style)
- [x] TTS via `/api/text-to-speech.ts` (OpenAI TTS-1, Alloy voice)
- [x] **No conflicts:** Manual and auto-playback are completely separate
- [x] Loading states for manual playback (spinner → pause → volume icons)
- [x] Auto-play only affects NEW messages arriving after toggle enabled

#### 2.3 Voice State Management
**File:** `/components/WorkflowBuilder.tsx`
- [x] Voice toggle state lifted to WorkflowBuilder (persists across tab switches)
- [x] Separate refs for manual vs auto audio players
- [x] Message tracking for auto-play (only plays messages after toggle enabled)

**Phase 2 Time:** ~4-5 hours

---

### ✅ ADDITIONAL FEATURES (Not in Original Plan)

#### Auto-Layout System
**Files:** `/lib/workflowLayout.ts`, `WorkflowBuilder.tsx`, `WorkflowChat.tsx`
- [x] **Dagre layout engine** (`@dagrejs/dagre`) for intelligent node positioning
- [x] Left-to-right flow layout respecting edge connections
- [x] Automatic positioning when AI adds nodes
- [x] **Auto-Layout button** in toolbar for manual trigger
- [x] **Smart batching:** Consecutive auto-layouts batched into single history checkpoint
- [x] Configurable spacing and margins

**Time:** ~2-3 hours

#### History/Checkpoint System
**Files:** `WorkflowBuilder.tsx`
- [x] Batched checkpoints: AI suggestions = 1 checkpoint, manual edits = 1 checkpoint
- [x] localStorage persistence: `workflow-history:{workflowId}`
- [x] Keeps last 30 checkpoints
- [x] **Smart Batching:** Multiple manual edits between AI checkpoints are batched into ONE checkpoint
- [x] Visual distinction: Blue for AI, Purple for Manual
- [x] Restore functionality with confirmation dialog
- [x] History modal with reverse chronological view
- [x] 3-second debounce for manual edits
- [x] Auto-layout batched (consecutive layouts = 1 checkpoint)

**Time:** ~3-4 hours

#### Export/Import JSON
**Files:** `WorkflowBuilder.tsx`
- [x] **Export:** Button to copy workflow JSON to clipboard
- [x] **Import:** Modal with text input for pasting JSON
- [x] Validates JSON structure
- [x] Import treated as manual edit in history

**Time:** ~1-2 hours

#### UI/UX Improvements
- [x] Right panel tabs for easy switching
- [x] History button showing checkpoint count
- [x] Toolbar with Export/Import/History/Auto-Layout buttons
- [x] Loading states and visual feedback
- [x] Dark mode support throughout
- [x] ChatBot floating button hidden in Portal (workflow builder)

**Time:** ~2-3 hours

---

## Time Breakdown

| Feature | Estimated | Actual |
|---------|-----------|--------|
| Phase 1: Foundation | 10-14 hrs | ~10-12 hrs |
| Phase 2: Voice Integration | 5-7 hrs | ~4-5 hrs |
| Auto-Layout System | - | ~2-3 hrs |
| History/Checkpoints | - | ~3-4 hrs |
| Export/Import | - | ~1-2 hrs |
| UI/UX Polish | - | ~2-3 hrs |
| **Total** | **15-21 hrs** | **~22-25 hrs** |

---

## Remaining Phases

### Phase 3: Intelligence & Refinement (PARTIALLY DONE)
**Goal:** Make the AI smarter and the UX smoother

**Already completed:**
- [x] Enhanced prompt with user/company context
- [x] AI never stops asking questions
- [x] Focus on exception paths and decision criteria
- [x] Auto-layout for logical node positioning

**Still to do:**
- [ ] Support deleting nodes via conversation
- [ ] AI suggests modifications to existing nodes
- [ ] Better completion detection

**Estimated:** 3-4 hours remaining

### Phase 4: Polish & Edge Cases (NOT STARTED)
**Goal:** Production-ready robustness

- [ ] Better error handling for API failures
- [ ] Retry logic for failed extractions
- [ ] Show AI's assessment in collapsible panel
- [ ] Performance optimizations for large workflows
- [ ] Loading skeletons for better perceived performance

**Estimated:** 5-6 hours

---

## Feature Summary

### What's Working Now

**Core Workflow:**
1. User clicks "Create with AI" or opens AI Assistant tab
2. Describes workflow by **text or voice**
3. AI responds conversationally with specific suggestions
4. AI shows preview with [Add to Canvas] [Ignore] buttons
5. User accepts → Nodes appear on canvas with **intelligent layout**
6. AI asks follow-up questions (never stops)
7. User can switch to Properties tab anytime (chat persists!)

**Voice Features:**
- **Voice In:** Click mic → Record → See waveform → Confirm → Text fills input
- **Voice Out:** Toggle "Auto-Voice On" → New AI messages auto-play
- **Manual Voice:** Click speaker icon on any message → Loading → Play/Pause

**Layout Features:**
- **Auto-Layout:** Nodes arrange left-to-right based on edges
- **AI Integration:** New nodes automatically positioned
- **Manual:** Click "Auto-Layout" button anytime

**History & Persistence:**
- Checkpoints: AI changes (blue), Manual edits (purple)
- Export/Import JSON
- Chat history per workflow
- Voice toggle persists across tabs

---

## Success Criteria

### Completed ✅
- [x] User can click "Create with AI"
- [x] Type OR speak a workflow description
- [x] AI responds conversationally with specific suggestions
- [x] User can accept/reject suggestions
- [x] Canvas updates only on user approval
- [x] AI asks relevant follow-up questions (never stops)
- [x] Conversation feels natural (human-like)
- [x] Chat persists when switching tabs
- [x] History with checkpoints (AI and Manual)
- [x] Export workflow to clipboard
- [x] Import workflow from JSON
- [x] Manual edits batched properly
- [x] **Voice input with waveform visualization**
- [x] **Voice output with auto-play toggle**
- [x] **Manual per-message voice playback**
- [x] **Auto-layout with dagre engine**
- [x] **No voice toggle state loss on tab switch**

### Phase 3 (Intelligence):
- [ ] AI detects gaps and suggests improvements
- [ ] User can correct AI via natural language
- [ ] System knows when workflow is complete
- [ ] AI suggests node deletions/modifications

### Phase 4 (Polish):
- [ ] Handles edge cases gracefully
- [ ] Better error handling and retries
- [ ] AI assessment panel
- [ ] Production-ready robustness

---

## Technical Implementation

### Data Flow
```
User Input (Text/Voice) → /api/workflow-extract → AI Response (JSON)
                                        ↓
                            WorkflowChat displays
                                        ↓
                            User clicks "Add"
                                        ↓
                            Dagre calculates layout
                                        ↓
                            WorkflowBuilder updates canvas
                                        ↓
                            History checkpoint created
```

### Voice Flow
```
Mic Button → MediaRecorder → AudioBars waveform
                ↓
         Confirm/Cancel
                ↓
         /api/transcribe (Whisper)
                ↓
         Text fills input (editable)
                ↓
         User sends → AI responds
                ↓
    [If Auto-Voice On] → /api/text-to-speech → Play audio
                ↓
    [Manual] → Click speaker → /api/text-to-speech → Play audio
```

### localStorage Keys
- `workflows:list` - List of all workflows
- `workflow:{id}` - Individual workflow data
- `ai-chat:{id}` - AI chat history per workflow
- `workflow-history:{id}` - Checkpoint history per workflow

### Key Components
- `WorkflowBuilder.tsx` - Main canvas, state management, voice state
- `WorkflowChat.tsx` - AI chat interface with voice in/out
- `AudioBars.tsx` - Waveform visualization during recording
- `lib/workflowLayout.ts` - Dagre layout calculations
- `api/workflow-extract.ts` - OpenAI API endpoint
- `api/transcribe.ts` - Voice-to-text (Whisper)
- `api/text-to-speech.ts` - Text-to-voice (TTS-1)

### Dependencies Added
- `@dagrejs/dagre` - Graph layout engine
- `@dagrejs/graphlib` - Graph data structures

---

## Next Steps

1. **Phase 3:** Enhance AI intelligence
   - Node deletion via conversation
   - AI suggests node modifications
   - Better completion detection

2. **Phase 4:** Error handling and polish
   - API failure retries
   - AI assessment panel
   - Performance optimization

3. **Future:** Advanced features
   - Multi-user collaboration
   - Workflow versioning
   - Optimization engine
   - Template library

---

## What Worked Well

- **Voice integration** reusing ChatBot patterns - consistent UX
- **Dagre layout** - Solves the coordinate problem elegantly
- **Separated audio players** - No conflicts between manual and auto playback
- **State lifting** - Voice toggle persists, chat persists
- **Smart batching** - History doesn't explode with rapid edits
- **AI prompt engineering** - Context (Daniel/FerroWorks) makes a huge difference
- **Waveform visualization** - Feels professional, gives user feedback

## Lessons Learned

- **State location matters** - Lift state that needs to persist across tab switches
- **Separate concerns** - Manual and auto audio should use different refs
- **Dagre over grid** - Graph layout algorithms beat naive grid placement
- **User control** - AI suggests, user approves = better UX than autopilot
- **Waveform > pulsing mic** - Visual feedback during recording is important
- **Batching is essential** - Without it, history becomes unusable

## Architecture Decisions

- **localStorage for persistence** - Good for prototype, scalable to backend later
- **Single API endpoint** - Keeps it simple, one OpenAI call per interaction
- **State in WorkflowBuilder** - Lifts state for cross-tab persistence
- **Batched checkpoints** - Prevents history explosion
- **Dagre for layout** - Industry standard, battle-tested, simple API
- **Separate audio refs** - Prevents conflicts between manual and auto playback

## Current State

**The workflow builder is now fully functional with:**
- ✅ Text and voice input
- ✅ Text and voice output (auto and manual)
- ✅ Intelligent auto-layout
- ✅ Persistent chat across tabs
- ✅ Persistent voice toggle across tabs
- ✅ History with smart batching
- ✅ Export/Import JSON
- ✅ Add/Ignore suggestion flow
- ✅ Dark mode support

**Ready for user testing and Phase 3 enhancements!**
