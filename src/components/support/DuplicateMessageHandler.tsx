import React from 'react';
import { Badge } from "@/components/ui/badge";
import { AlertTriangle } from 'lucide-react';

interface Message {
  id: string;
  ticket_id: string;
  sender_email: string;
  sender_name: string | null;
  message_content: string;
  is_internal: boolean;
  is_ai_generated: boolean;
  created_at: string;
  attachments: any[];
  email_message_id?: string;
}

interface DuplicateMessageHandlerProps {
  messages: Message[];
  children: (filteredMessages: Message[], duplicateCount: number) => React.ReactNode;
}

export const DuplicateMessageHandler = ({ messages, children }: DuplicateMessageHandlerProps) => {
  // Advanced duplicate detection logic
  const getFilteredMessages = () => {
    const seen = new Map<string, Message>();
    const duplicates: Message[] = [];
    
    // Sort messages by creation time to keep the earliest one
    const sortedMessages = [...messages].sort((a, b) => 
      new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
    );
    
    sortedMessages.forEach(message => {
      // Create a signature for duplicate detection
      const contentSignature = message.message_content
        .replace(/\s+/g, ' ')
        .trim()
        .toLowerCase()
        .substring(0, 200); // First 200 chars for comparison
      
      const timeWindow = new Date(message.created_at).getTime();
      const senderKey = message.sender_email.toLowerCase();
      
      // Create composite key for duplicate detection
      const duplicateKey = `${senderKey}|${contentSignature}`;
      
      if (seen.has(duplicateKey)) {
        const existingMessage = seen.get(duplicateKey)!;
        const timeDiff = Math.abs(timeWindow - new Date(existingMessage.created_at).getTime());
        
        // If messages are within 10 minutes of each other and have same content
        if (timeDiff < 10 * 60 * 1000) {
          duplicates.push(message);
          return;
        }
      }
      
      seen.set(duplicateKey, message);
    });
    
    // Filter out duplicates from original messages
    const filteredMessages = messages.filter(msg => 
      !duplicates.some(dup => dup.id === msg.id)
    );
    
    return { filteredMessages, duplicateCount: duplicates.length };
  };

  const { filteredMessages, duplicateCount } = getFilteredMessages();
  
  return (
    <>
      {children(filteredMessages, duplicateCount)}
    </>
  );
};
