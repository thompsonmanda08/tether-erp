# Tether-ERP Migration Guide

## Overview

This document outlines the migration to Tether-ERP Procurement Module, including the transition from shadcn/ui to NextUI (HeroUI).

## Migration Summary

### Branding Changes
- **Old Name**: Admin Console (pre-Tether-ERP)
- **New Name**: Tether-ERP | Procurement Module
- **Focus**: Enterprise Resource Planning with Procurement as the first module

### UI Library Migration
- **From**: shadcn/ui (Radix UI primitives)
- **To**: NextUI (HeroUI) - Modern React UI library

## Key Changes

### 1. Package Dependencies

#### Removed Packages
All `@radix-ui/*` packages have been removed:
- @radix-ui/react-accordion
- @radix-ui/react-alert-dialog
- @radix-ui/react-avatar
- @radix-ui/react-checkbox
- @radix-ui/react-dialog
- @radix-ui/react-dropdown-menu
- @radix-ui/react-popover
- @radix-ui/react-select
- @radix-ui/react-switch
- @radix-ui/react-tabs
- @radix-ui/react-toast
- @radix-ui/react-tooltip
- cmdk (Command palette)
- react-day-picker

#### Added Packages
- `@heroui/react`: ^2.6.10
- `@heroui/system`: ^2.4.5
- `@heroui/theme`: ^2.4.5
- `tailwind-variants`: ^0.3.0

### 2. Component Migration Map

| shadcn/ui Component | NextUI Equivalent | Status |
|---------------------|-------------------|--------|
| Button | Button | ✅ Migrated |
| Input | Input | ✅ Migrated |
| Card | Card | ✅ Migrated |
| Select | Select | 🔄 To Migrate |
| Dialog | Modal | 🔄 To Migrate |
| Dropdown Menu | Dropdown | 🔄 To Migrate |
| Tabs | Tabs | 🔄 To Migrate |
| Switch | Switch | 🔄 To Migrate |
| Checkbox | Checkbox | 🔄 To Migrate |
| Avatar | Avatar | 🔄 To Migrate |
| Badge | Chip | 🔄 To Migrate |
| Alert | Alert (custom) | 🔄 To Migrate |
| Table | Table | 🔄 To Migrate |
| Popover | Popover | 🔄 To Migrate |
| Tooltip | Tooltip | 🔄 To Migrate |

### 3. Route Structure Updates

#### New Procurement Routes
```
/admin/purchase-orders    - Purchase order management
/admin/requisitions       - Purchase requisition system
/admin/vendors            - Vendor management
/admin/inventory          - Inventory control
/admin/spend-analysis     - Spend analytics
```

#### Updated Navigation
The sidebar navigation has been reorganized to prioritize procurement features:
1. Overview (Dashboard, System Health)
2. **Procurement** (Purchase Orders, Requisitions, Vendors, Inventory)
3. Organization Management
4. User Management
5. Analytics & Reports
6. System Management
7. Security

### 4. Styling Updates

#### Color Scheme
The application maintains the existing blue-based color scheme:
- Primary: #0c54e7 (Cerulean Blue)
- Primary variants: 50-950 scale
- Accent: #f59e0b (Amber/Gold)

#### NextUI Theme Configuration
NextUI is configured to work with the existing Tailwind CSS setup and color variables.

### 5. Landing Page

A new landing page has been created featuring:
- Hero section with Tether-ERP branding
- Feature showcase (6 key procurement features)
- Benefits section
- Call-to-action sections
- Responsive design with gradient backgrounds
- Modern animations and transitions

### 6. Authentication

The login page has been updated with:
- NextUI components (Card, Input, Button)
- Tether-ERP branding
- Enhanced visual design with gradients
- Improved accessibility

## Migration Steps for Developers

### Step 1: Install Dependencies
```bash
npm install
# or
pnpm install
```

### Step 2: Update Component Imports

**Before (shadcn/ui):**
```tsx
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
```

**After (NextUI):**
```tsx
import { Button, Input, Card, CardBody, CardHeader } from "@heroui/react";
```

### Step 3: Update Component Props

#### Button
```tsx
// Before
<Button variant="default" size="lg">Click me</Button>

// After
<Button color="primary" size="lg">Click me</Button>
```

#### Input
```tsx
// Before
<Input placeholder="Enter text" />

// After
<Input 
  placeholder="Enter text" 
  variant="bordered"
  size="lg"
/>
```

#### Card
```tsx
// Before
<Card>
  <CardHeader>Title</CardHeader>
  <CardContent>Content</CardContent>
</Card>

// After
<Card>
  <CardHeader>Title</CardHeader>
  <CardBody>Content</CardBody>
</Card>
```

### Step 4: Update Providers

The `Providers` component now includes `HeroUIProvider`:
```tsx
<HeroUIProvider>
  <ThemeProvider>
    {children}
  </ThemeProvider>
</HeroUIProvider>
```

### Step 5: Migrate Existing Components

For each page/component:
1. Update imports from shadcn to NextUI
2. Update component props to match NextUI API
3. Test functionality
4. Update styling if needed

## Component Migration Priority

### Phase 1 (Completed)
- ✅ Landing page
- ✅ Login page
- ✅ Layout and providers
- ✅ Package dependencies

### Phase 2 (In Progress)
- 🔄 Dashboard components
- 🔄 Common UI components (Button, Input, Card)
- 🔄 Navigation components

### Phase 3 (Planned)
- ⏳ Form components (Select, Checkbox, Switch)
- ⏳ Data display (Table, Badge/Chip)
- ⏳ Feedback components (Alert, Toast, Modal)
- ⏳ Overlay components (Dropdown, Popover, Tooltip)

### Phase 4 (Planned)
- ⏳ Procurement-specific pages
- ⏳ Advanced features
- ⏳ Testing and optimization

## Breaking Changes

### 1. Component API Changes
- `CardContent` → `CardBody`
- `variant="default"` → `color="primary"`
- `variant="destructive"` → `color="danger"`
- `variant="outline"` → `variant="bordered"`

### 2. Import Paths
All UI components now import from `@heroui/react` instead of `@/components/ui/*`

### 3. Styling Classes
NextUI uses its own class naming convention. Update custom styles accordingly.

## Testing Checklist

- [ ] Landing page displays correctly
- [ ] Login functionality works
- [ ] Dashboard loads without errors
- [ ] Navigation works properly
- [ ] Theme switching (light/dark) works
- [ ] Responsive design on mobile
- [ ] All forms submit correctly
- [ ] Data tables display properly
- [ ] Modals and dialogs function
- [ ] Tooltips and popovers work

## Resources

- [NextUI Documentation](https://nextui.org/)
- [NextUI Components](https://nextui.org/docs/components/button)
- [Tailwind CSS v4](https://tailwindcss.com/)
- [Framer Motion](https://www.framer.com/motion/)

## Support

For questions or issues during migration:
1. Check NextUI documentation
2. Review this migration guide
3. Check component examples in the codebase
4. Consult the development team

## Notes

- The migration maintains backward compatibility where possible
- Existing API endpoints remain unchanged
- Database schema is not affected
- Authentication flow remains the same
- Only UI layer is being updated
