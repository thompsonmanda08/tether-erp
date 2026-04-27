# Session Timeout Warning Component

A comprehensive session timeout warning system with automatic idle detection, multi-tab synchronization, and Zustand state management.

## Architecture

- **Local State**: Countdown timer (component-specific, doesn't need to be shared)
- **Global State (Zustand)**: Dialog visibility and loading state (shared across the app)
- **Idle Detection**: Uses `react-idle-timer` to detect user inactivity
- **Multi-tab Sync**: BroadcastChannel API with localStorage fallback

## Features

✅ Automatic idle detection (configurable timeout)  
✅ Visual countdown timer with progress indicator  
✅ Multi-tab synchronization (locks all tabs when one goes idle)  
✅ Persistent lock state (survives page reloads)  
✅ Background token refresh monitoring  
✅ Automatic logout on timeout  
✅ Toast notifications for user feedback  
✅ Loading states for async actions

## Configuration

Session timeouts are configured in `frontend/src/lib/session-config.ts`:

```typescript
export const SESSION_CONFIG = {
  IDLE_TIMEOUT: 10 * 60 * 1000, // 10 minutes of inactivity
  SCREEN_LOCK_COUNTDOWN: 90 * 1000, // 90 seconds to respond
  TOKEN_REFRESH_INTERVAL: 20 * 60 * 1000, // 20 minutes
};
```

## Usage

### Basic Integration (Recommended)

Add to your main layout (already integrated in `(private)/(main)/layout.tsx`):

```tsx
import { SessionTimeoutContainer } from "@/components/session/session-timeout-warning";
import { verifySession } from "@/lib/auth";

export default async function Layout({ children }) {
  const { session } = await verifySession();

  return (
    <>
      <SessionTimeoutContainer session={session} />
      {children}
    </>
  );
}
```

That's it! The component handles everything automatically:

- Detects when user is idle for 10 minutes
- Shows warning dialog with 90-second countdown
- Refreshes session if user clicks "I'm still here"
- Logs out automatically if countdown reaches zero
- Syncs lock state across all browser tabs

### Manual Control (Advanced)

You can also control the warning dialog manually from anywhere in your app:

```tsx
import { useSessionStore } from "@/stores/session-store";

export function SomeComponent() {
  const { openWarning, closeWarning, isWarningOpen, isLoading } =
    useSessionStore();

  // Manually trigger the warning
  const handleShowWarning = () => {
    openWarning();
  };

  return <button onClick={handleShowWarning}>Show Session Warning</button>;
}
```

## Store API

### State

- `isWarningOpen: boolean` - Whether the warning dialog is visible
- `isLoading: boolean` - Whether an action (extend session/logout) is in progress

### Actions

- `openWarning()` - Show the warning dialog
- `closeWarning()` - Hide the warning dialog
- `setLoading(loading: boolean)` - Set loading state

## How It Works

### Idle Detection Flow

1. User logs in → Idle timer starts
2. User inactive for 10 minutes → `onIdle` callback fires
3. Warning dialog opens with 90-second countdown
4. User has two options:
   - Click "I'm still here" → Session refreshes, timer resets
   - Do nothing → Automatic logout after 90 seconds

### Multi-tab Synchronization

- Each tab has a unique ID
- When one tab detects idle, it broadcasts to other tabs
- Other tabs show the warning dialog (but don't trigger their own idle timers)
- When user responds in any tab, all tabs are unlocked
- Uses BroadcastChannel API with localStorage fallback for older browsers

### Persistent Lock State

- Lock state is stored in a cookie
- If user refreshes the page while locked, the warning dialog reappears
- Prevents bypassing the lock by refreshing

## Component Structure

```
SessionTimeoutContainer (Main Container)
├── useSessionLockSync (Multi-tab sync hook)
├── useIdleTimer (Idle detection)
├── useTokenRefresh (Background token refresh)
└── SessionTimeoutWarningDialog (UI Component)
    ├── useCountdownTimer (Local countdown state)
    └── useSessionStore (Global Zustand state)
```

## Migration from screen-lock.tsx

The new component maintains the same functionality as the old `screen-lock.tsx` but with:

- Cleaner separation of concerns
- Better state management with Zustand
- More maintainable code structure
- Same idle detection behavior
- Same multi-tab synchronization
- Same timeout configurations

No changes needed to existing behavior or user experience!
