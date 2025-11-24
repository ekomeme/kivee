import React from 'react';

export default function LoadingBar({ loading }) {
  if (!loading) return null;
  return (
    <div className="fixed top-0 left-0 right-0 h-[2px] z-50 overflow-hidden">
      <div className="h-full bg-gradient-to-r from-primary via-blue-500 to-primary animate-loading-bar" />
    </div>
  );
}
