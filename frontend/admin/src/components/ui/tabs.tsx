"use client";

import { Tabs as NextUITabs, Tab } from "@heroui/react";
import * as React from "react";
import { cn } from "@/lib/utils";

type TabsCtx = { activeTab: string; setActiveTab: (v: string) => void };
const TabsContext = React.createContext<TabsCtx>({ activeTab: "", setActiveTab: () => {} });

function Tabs({ children, defaultValue, value, onValueChange, className, ...props }: { children: React.ReactNode; defaultValue?: string; value?: string; onValueChange?: (v: string) => void; className?: string }) {
  const [activeTab, setActiveTab] = React.useState(value ?? defaultValue ?? "");
  const handleChange = (val: string) => { setActiveTab(val); onValueChange?.(val); };
  React.useEffect(() => { if (value !== undefined) setActiveTab(value); }, [value]);
  return (
    <TabsContext.Provider value={{ activeTab, setActiveTab: handleChange }}>
      <div data-slot="tabs" className={cn("w-full", className)} {...props}>{children}</div>
    </TabsContext.Provider>
  );
}

function TabsList({ className, children, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  const { activeTab, setActiveTab } = React.useContext(TabsContext);
  const tabs: { value: string; label: React.ReactNode }[] = [];
  React.Children.forEach(children, (child) => {
    if (React.isValidElement(child) && (child.props as any).value) tabs.push({ value: (child.props as any).value, label: (child.props as any).children });
  });
  return (
    <div data-slot="tabs-list" className={cn("w-full", className)} {...props}>
      <NextUITabs selectedKey={activeTab} onSelectionChange={(key) => setActiveTab(String(key))} variant="underlined" color="primary" classNames={{ tabList: "gap-4 border-b border-border w-full rounded-none p-0", tab: "h-10 px-0 data-[selected=true]:font-semibold", cursor: "bg-primary" }}>
        {tabs.map(({ value, label }) => <Tab key={value} title={label} />)}
      </NextUITabs>
    </div>
  );
}

function TabsTrigger({ className, value, children, ...props }: React.HTMLAttributes<HTMLButtonElement> & { value: string }) { return null; }

function TabsContent({ className, value, children, ...props }: React.HTMLAttributes<HTMLDivElement> & { value: string }) {
  const { activeTab } = React.useContext(TabsContext);
  if (activeTab !== value) return null;
  return <div data-slot="tabs-content" className={cn("mt-2 outline-none", className)} {...props}>{children}</div>;
}

export { Tabs, TabsContent, TabsList, TabsTrigger };
