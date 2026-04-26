# NextUI Component Migration Reference

## Quick Reference Guide

This document provides side-by-side comparisons of shadcn/ui and NextUI components to help with migration.

## Button

### shadcn/ui
```tsx
import { Button } from "@/components/ui/button";

<Button variant="default">Default</Button>
<Button variant="destructive">Delete</Button>
<Button variant="outline">Outline</Button>
<Button variant="ghost">Ghost</Button>
<Button variant="link">Link</Button>
<Button size="sm">Small</Button>
<Button size="lg">Large</Button>
<Button disabled>Disabled</Button>
```

### NextUI
```tsx
import { Button } from "@heroui/react";

<Button color="primary">Default</Button>
<Button color="danger">Delete</Button>
<Button variant="bordered">Outline</Button>
<Button variant="light">Ghost</Button>
<Button variant="light">Link</Button>
<Button size="sm">Small</Button>
<Button size="lg">Large</Button>
<Button isDisabled>Disabled</Button>
<Button isLoading>Loading</Button>
```

## Input

### shadcn/ui
```tsx
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

<div>
  <Label htmlFor="email">Email</Label>
  <Input 
    id="email"
    type="email" 
    placeholder="Enter email"
    disabled={false}
  />
</div>
```

### NextUI
```tsx
import { Input } from "@heroui/react";

<Input
  label="Email"
  type="email"
  placeholder="Enter email"
  variant="bordered"
  size="lg"
  isDisabled={false}
  isRequired
  errorMessage="Invalid email"
  description="We'll never share your email"
/>
```

## Card

### shadcn/ui
```tsx
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";

<Card>
  <CardHeader>
    <CardTitle>Title</CardTitle>
    <CardDescription>Description</CardDescription>
  </CardHeader>
  <CardContent>
    Content goes here
  </CardContent>
  <CardFooter>
    Footer content
  </CardFooter>
</Card>
```

### NextUI
```tsx
import { Card, CardHeader, CardBody, CardFooter } from "@heroui/react";

<Card>
  <CardHeader className="flex flex-col items-start">
    <h4 className="text-lg font-bold">Title</h4>
    <p className="text-sm text-gray-500">Description</p>
  </CardHeader>
  <CardBody>
    Content goes here
  </CardBody>
  <CardFooter>
    Footer content
  </CardFooter>
</Card>
```

## Select

### shadcn/ui
```tsx
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

<Select>
  <SelectTrigger>
    <SelectValue placeholder="Select option" />
  </SelectTrigger>
  <SelectContent>
    <SelectItem value="1">Option 1</SelectItem>
    <SelectItem value="2">Option 2</SelectItem>
  </SelectContent>
</Select>
```

### NextUI
```tsx
import { Select, SelectItem } from "@heroui/react";

<Select 
  label="Select option"
  placeholder="Choose an option"
  variant="bordered"
>
  <SelectItem key="1" value="1">Option 1</SelectItem>
  <SelectItem key="2" value="2">Option 2</SelectItem>
</Select>
```

## Dialog/Modal

### shadcn/ui
```tsx
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";

<Dialog>
  <DialogTrigger asChild>
    <Button>Open Dialog</Button>
  </DialogTrigger>
  <DialogContent>
    <DialogHeader>
      <DialogTitle>Dialog Title</DialogTitle>
      <DialogDescription>Dialog description</DialogDescription>
    </DialogHeader>
    <div>Content</div>
  </DialogContent>
</Dialog>
```

### NextUI
```tsx
import { Modal, ModalContent, ModalHeader, ModalBody, ModalFooter, Button, useDisclosure } from "@heroui/react";

function MyComponent() {
  const {isOpen, onOpen, onClose} = useDisclosure();

  return (
    <>
      <Button onPress={onOpen}>Open Modal</Button>
      <Modal isOpen={isOpen} onClose={onClose}>
        <ModalContent>
          <ModalHeader>Dialog Title</ModalHeader>
          <ModalBody>
            <p>Dialog description</p>
            <div>Content</div>
          </ModalBody>
          <ModalFooter>
            <Button onPress={onClose}>Close</Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </>
  );
}
```

## Dropdown Menu

### shadcn/ui
```tsx
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";

<DropdownMenu>
  <DropdownMenuTrigger asChild>
    <Button>Open Menu</Button>
  </DropdownMenuTrigger>
  <DropdownMenuContent>
    <DropdownMenuItem>Item 1</DropdownMenuItem>
    <DropdownMenuItem>Item 2</DropdownMenuItem>
  </DropdownMenuContent>
</DropdownMenu>
```

### NextUI
```tsx
import { Dropdown, DropdownTrigger, DropdownMenu, DropdownItem, Button } from "@heroui/react";

<Dropdown>
  <DropdownTrigger>
    <Button>Open Menu</Button>
  </DropdownTrigger>
  <DropdownMenu>
    <DropdownItem key="1">Item 1</DropdownItem>
    <DropdownItem key="2">Item 2</DropdownItem>
  </DropdownMenu>
</Dropdown>
```

## Tabs

### shadcn/ui
```tsx
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

<Tabs defaultValue="tab1">
  <TabsList>
    <TabsTrigger value="tab1">Tab 1</TabsTrigger>
    <TabsTrigger value="tab2">Tab 2</TabsTrigger>
  </TabsList>
  <TabsContent value="tab1">Content 1</TabsContent>
  <TabsContent value="tab2">Content 2</TabsContent>
</Tabs>
```

### NextUI
```tsx
import { Tabs, Tab } from "@heroui/react";

<Tabs>
  <Tab key="tab1" title="Tab 1">
    Content 1
  </Tab>
  <Tab key="tab2" title="Tab 2">
    Content 2
  </Tab>
</Tabs>
```

## Switch

### shadcn/ui
```tsx
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";

<div className="flex items-center space-x-2">
  <Switch id="airplane-mode" />
  <Label htmlFor="airplane-mode">Airplane Mode</Label>
</div>
```

### NextUI
```tsx
import { Switch } from "@heroui/react";

<Switch>Airplane Mode</Switch>
```

## Checkbox

### shadcn/ui
```tsx
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";

<div className="flex items-center space-x-2">
  <Checkbox id="terms" />
  <Label htmlFor="terms">Accept terms</Label>
</div>
```

### NextUI
```tsx
import { Checkbox } from "@heroui/react";

<Checkbox>Accept terms</Checkbox>
```

## Avatar

### shadcn/ui
```tsx
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

<Avatar>
  <AvatarImage src="/avatar.jpg" alt="User" />
  <AvatarFallback>JD</AvatarFallback>
</Avatar>
```

### NextUI
```tsx
import { Avatar } from "@heroui/react";

<Avatar 
  src="/avatar.jpg" 
  alt="User"
  showFallback
  name="JD"
/>
```

## Badge/Chip

### shadcn/ui
```tsx
import { Badge } from "@/components/ui/badge";

<Badge>Default</Badge>
<Badge variant="secondary">Secondary</Badge>
<Badge variant="destructive">Destructive</Badge>
<Badge variant="outline">Outline</Badge>
```

### NextUI
```tsx
import { Chip } from "@heroui/react";

<Chip>Default</Chip>
<Chip color="secondary">Secondary</Chip>
<Chip color="danger">Destructive</Chip>
<Chip variant="bordered">Outline</Chip>
<Chip onClose={() => {}}>Closeable</Chip>
```

## Table

### shadcn/ui
```tsx
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

<Table>
  <TableHeader>
    <TableRow>
      <TableHead>Name</TableHead>
      <TableHead>Email</TableHead>
    </TableRow>
  </TableHeader>
  <TableBody>
    <TableRow>
      <TableCell>John Doe</TableCell>
      <TableCell>john@example.com</TableCell>
    </TableRow>
  </TableBody>
</Table>
```

### NextUI
```tsx
import { Table, TableHeader, TableColumn, TableBody, TableRow, TableCell } from "@heroui/react";

<Table>
  <TableHeader>
    <TableColumn>Name</TableColumn>
    <TableColumn>Email</TableColumn>
  </TableHeader>
  <TableBody>
    <TableRow key="1">
      <TableCell>John Doe</TableCell>
      <TableCell>john@example.com</TableCell>
    </TableRow>
  </TableBody>
</Table>
```

## Popover

### shadcn/ui
```tsx
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

<Popover>
  <PopoverTrigger asChild>
    <Button>Open Popover</Button>
  </PopoverTrigger>
  <PopoverContent>
    Popover content
  </PopoverContent>
</Popover>
```

### NextUI
```tsx
import { Popover, PopoverTrigger, PopoverContent, Button } from "@heroui/react";

<Popover>
  <PopoverTrigger>
    <Button>Open Popover</Button>
  </PopoverTrigger>
  <PopoverContent>
    <div className="p-4">Popover content</div>
  </PopoverContent>
</Popover>
```

## Tooltip

### shadcn/ui
```tsx
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

<TooltipProvider>
  <Tooltip>
    <TooltipTrigger asChild>
      <Button>Hover me</Button>
    </TooltipTrigger>
    <TooltipContent>
      Tooltip text
    </TooltipContent>
  </Tooltip>
</TooltipProvider>
```

### NextUI
```tsx
import { Tooltip, Button } from "@heroui/react";

<Tooltip content="Tooltip text">
  <Button>Hover me</Button>
</Tooltip>
```

## Alert

### shadcn/ui
```tsx
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

<Alert>
  <AlertTitle>Heads up!</AlertTitle>
  <AlertDescription>
    You can add components to your app using the cli.
  </AlertDescription>
</Alert>
```

### NextUI
```tsx
// NextUI doesn't have a built-in Alert component
// Use Card with custom styling or create a custom component

import { Card, CardBody } from "@heroui/react";

<Card className="bg-blue-50 border-l-4 border-blue-500">
  <CardBody>
    <h4 className="font-bold mb-2">Heads up!</h4>
    <p>You can add components to your app using the cli.</p>
  </CardBody>
</Card>
```

## Progress

### shadcn/ui
```tsx
import { Progress } from "@/components/ui/progress";

<Progress value={60} />
```

### NextUI
```tsx
import { Progress } from "@heroui/react";

<Progress 
  value={60} 
  color="primary"
  showValueLabel
/>
```

## Spinner/Loader

### shadcn/ui
```tsx
import { Loader2 } from "lucide-react";

<Loader2 className="h-4 w-4 animate-spin" />
```

### NextUI
```tsx
import { Spinner } from "@heroui/react";

<Spinner size="sm" />
<Spinner size="md" />
<Spinner size="lg" />
<Spinner color="primary" />
```

## Common Prop Mappings

| shadcn/ui | NextUI |
|-----------|--------|
| `disabled` | `isDisabled` |
| `required` | `isRequired` |
| `readOnly` | `isReadOnly` |
| `variant="default"` | `color="primary"` |
| `variant="destructive"` | `color="danger"` |
| `variant="outline"` | `variant="bordered"` |
| `variant="ghost"` | `variant="light"` |
| `asChild` | Not needed (use `as` prop) |
| `className` | `className` (same) |

## Color Mappings

| shadcn/ui | NextUI |
|-----------|--------|
| `default` | `primary` |
| `destructive` | `danger` |
| `secondary` | `secondary` |
| `outline` | `bordered` variant |
| `ghost` | `light` variant |
| N/A | `success` |
| N/A | `warning` |

## Size Mappings

| shadcn/ui | NextUI |
|-----------|--------|
| `sm` | `sm` |
| `default` | `md` |
| `lg` | `lg` |
| N/A | `xl` |

## Tips for Migration

1. **Import Changes**: Update all imports from `@/components/ui/*` to `@heroui/react`
2. **Prop Names**: NextUI uses `is` prefix for boolean props (e.g., `isDisabled`, `isLoading`)
3. **Variants**: NextUI uses `color` and `variant` props separately
4. **Composition**: NextUI components are less compositional than Radix UI
5. **Styling**: NextUI has built-in theming; use `classNames` prop for custom styles
6. **State Management**: Some NextUI components provide hooks (e.g., `useDisclosure` for modals)

## Migration Checklist

- [ ] Update package.json dependencies
- [ ] Install NextUI packages
- [ ] Update Providers with HeroUIProvider
- [ ] Migrate Button components
- [ ] Migrate Input components
- [ ] Migrate Card components
- [ ] Migrate Select components
- [ ] Migrate Modal/Dialog components
- [ ] Migrate Dropdown components
- [ ] Migrate Tabs components
- [ ] Migrate Switch components
- [ ] Migrate Checkbox components
- [ ] Migrate Avatar components
- [ ] Migrate Badge/Chip components
- [ ] Migrate Table components
- [ ] Migrate Popover components
- [ ] Migrate Tooltip components
- [ ] Create custom Alert component
- [ ] Migrate Progress components
- [ ] Update all component imports
- [ ] Test all pages and features
- [ ] Update documentation
