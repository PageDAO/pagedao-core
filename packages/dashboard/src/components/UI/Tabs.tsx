import React, { useState } from 'react';

interface TabsProps {
  children: React.ReactNode;
  defaultValue?: string;
  className?: string;
}

export const Tabs: React.FC<TabsProps> = ({ children, defaultValue, className = '' }) => {
  return (
    <div className={className}>
      {children}
    </div>
  );
};

interface TabsListProps {
  children: React.ReactNode;
  className?: string;
}

export const TabsList: React.FC<TabsListProps> = ({ children, className = '' }) => {
  return (
    <div className={`inline-flex items-center rounded-md bg-gray-700 p-1 text-gray-400 ${className}`}>
      {children}
    </div>
  );
};

interface TabsTriggerProps {
  children: React.ReactNode;
  value: string;
  onClick?: () => void;
  className?: string;
}

export const TabsTrigger: React.FC<TabsTriggerProps> = ({ 
  children, 
  value, 
  onClick,
  className = '' 
}) => {
  return (
    <button 
      className={`px-3 py-1 text-sm rounded-md hover:bg-gray-600 hover:text-white transition-colors ${className}`}
      onClick={onClick}
    >
      {children}
    </button>
  );
};

interface TabsContentProps {
  children: React.ReactNode;
  value: string;
  className?: string;
}

export const TabsContent: React.FC<TabsContentProps> = ({ 
  children, 
  value,
  className = '' 
}) => {
  return (
    <div className={`mt-2 rounded-md ${className}`}>
      {children}
    </div>
  );
};