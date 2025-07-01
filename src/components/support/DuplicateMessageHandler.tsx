import React from 'react';
import { Badge } from "@/components/ui/badge";
import { AlertTriangle } from 'lucide-react';

interface Message {
  id: string;
  message_content: string;
  created_at: string;
  sender_email: string;
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
      {duplicateCount > 0 && (
        <div className="mb-4 p-3 bg-orange-50 border border-orange-200 rounded-lg">
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-orange-600" />
            <Badge variant="outline" className="bg-orange-100 text-orange-800">
              {duplicateCount} duplikerede besked{duplicateCount > 1 ? 'er' : ''} skjult
            </Badge>
          </div>
          <p className="text-sm text-orange-700 mt-1">
            Identiske beskeder er automatisk fjernet fra visningen.
          </p>
        </div>
      )}
      {children(filteredMessages, duplicateCount)}
    </>
  );
};
