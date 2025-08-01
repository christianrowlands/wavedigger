'use client';

import React, { createContext, useContext, useState } from 'react';
import { cn } from '@/lib/utils';

interface TabsContextType {
  activeTab: string;
  setActiveTab: (value: string) => void;
}

const TabsContext = createContext<TabsContextType | undefined>(undefined);

export interface TabsProps extends React.HTMLAttributes<HTMLDivElement> {
  defaultValue: string;
  value?: string;
  onValueChange?: (value: string) => void;
}

export function Tabs({ 
  defaultValue, 
  value, 
  onValueChange, 
  className, 
  children, 
  ...props 
}: TabsProps) {
  const [internalValue, setInternalValue] = useState(defaultValue);
  const activeTab = value ?? internalValue;
  
  const setActiveTab = (newValue: string) => {
    if (!value) {
      setInternalValue(newValue);
    }
    onValueChange?.(newValue);
  };
  
  return (
    <TabsContext.Provider value={{ activeTab, setActiveTab }}>
      <div className={cn('w-full', className)} {...props}>
        {children}
      </div>
    </TabsContext.Provider>
  );
}

export type TabsListProps = React.HTMLAttributes<HTMLDivElement>;

export function TabsList({ className, children, ...props }: TabsListProps) {
  return (
    <div 
      role="tablist"
      className={cn(
        'inline-flex items-center gap-1 p-1 rounded-lg glass-subtle',
        'border',
        className
      )}
      style={{ borderColor: 'var(--border-primary)' }}
      {...props}
    >
      {children}
    </div>
  );
}

export interface TabsTriggerProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  value: string;
}

export function TabsTrigger({ 
  value, 
  className, 
  children, 
  ...props 
}: TabsTriggerProps) {
  const context = useContext(TabsContext);
  if (!context) {
    throw new Error('TabsTrigger must be used within Tabs');
  }
  
  const { activeTab, setActiveTab } = context;
  const isActive = activeTab === value;
  
  return (
    <button
      role="tab"
      aria-selected={isActive}
      data-state={isActive ? 'active' : 'inactive'}
      onClick={() => setActiveTab(value)}
      className={cn(
        'px-3 py-1.5 text-sm font-medium rounded-md transition-all',
        'focus:outline-none focus:ring-2 focus:ring-offset-2',
        isActive ? [
          'gradient-primary shadow-sm',
          'text-white'
        ] : [
          'hover:glass-card',
          'text-[var(--text-secondary)]',
          'hover:text-[var(--text-primary)]'
        ],
        className
      )}
      {...props}
    >
      {children}
    </button>
  );
}

export interface TabsContentProps extends React.HTMLAttributes<HTMLDivElement> {
  value: string;
}

export function TabsContent({ 
  value, 
  className, 
  children, 
  ...props 
}: TabsContentProps) {
  const context = useContext(TabsContext);
  if (!context) {
    throw new Error('TabsContent must be used within Tabs');
  }
  
  const { activeTab } = context;
  const isActive = activeTab === value;
  
  if (!isActive) return null;
  
  return (
    <div
      role="tabpanel"
      data-state={isActive ? 'active' : 'inactive'}
      className={cn(
        'mt-4 animate-fadeIn',
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
}