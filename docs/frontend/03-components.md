# Components

## Component Library

Built on [ShadCN UI](https://ui.shadcn.com/) + Radix UI primitives. Components live in `src/components/ui/`.

Custom additions on top of ShadCN defaults:
- `Input` — supports `label`, `errorText`, `isInvalid`, `endContent` props
- `Button` — supports `isLoading`, `loadingText` props
- `CustomAlert` — typed alerts (`info`, `success`, `warning`, `error`)
- `DigitalSignaturePad` — canvas-based signature with touch support
- `DataTable` — TanStack Table wrapper with pagination + search

## Layout Components

| Component | Location | Purpose |
|---|---|---|
| `AppSidebar` | `layout/sidebar/app-sidebar.tsx` | Root sidebar shell |
| `NavMain` | `layout/sidebar/nav-main.tsx` | Nav groups + role filtering |
| `NavUser` | `layout/sidebar/nav-user.tsx` | Footer: tier badge + user menu |
| `WorkspaceSwitcher` | `layout/sidebar/workspace-switcher.tsx` | Org switcher |

Sidebar uses `collapsible="icon"` on desktop. Collapsed state: `group-data-[collapsible=icon]:*` CSS selectors. Icon-mode items use `size-8!` with `mx-auto`.

## Forms

All forms use **React Hook Form** with `zod` for validation. Pattern:
```tsx
const form = useForm<Schema>({ resolver: zodResolver(schema) })
// ...
<Form {...form}>
  <FormField name="email" render={({ field }) => (
    <FormItem>
      <FormLabel>Email</FormLabel>
      <FormControl><Input {...field} /></FormControl>
      <FormMessage />
    </FormItem>
  )} />
</Form>
```

Read-only inputs (display-only) must have `readOnly` prop to suppress React warnings.

## Dialog Patterns

`DialogDescription` renders as `<p>` — never nest block elements inside it directly:
```tsx
// Correct
<DialogDescription asChild>
  <div>Content with <p>paragraphs</p></div>
</DialogDescription>
```

Non-dismissable dialogs: `<Dialog open={true}>` with no close button (`showCloseButton={false}` on `DialogContent`).

## Workflow Action Buttons

`components/workflows/workflow-action-buttons.tsx` — renders approve/reject/claim controls in multiple variants: `table`, `compact`, `inline`, `dropdown`, `detail`.

All non-table variants share modal JSX via a `sharedModals` const returned alongside the variant JSX inside a fragment `<>...</>{sharedModals}</>`.

## Notifications

Toast notifications via `sonner`. Use the `notify()` helper from `lib/utils`:
```ts
notify({ type: "success", description: "Saved!" })
notify({ type: "error", description: "Something went wrong" })
```
