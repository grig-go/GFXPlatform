import React from 'react';
import ChatBot from '../components/ChatBot';

// Default implementation wraps children with ChatBot
export default function Root({ children }: { children: React.ReactNode }): JSX.Element {
  return (
    <>
      {children}
      <ChatBot />
    </>
  );
}
