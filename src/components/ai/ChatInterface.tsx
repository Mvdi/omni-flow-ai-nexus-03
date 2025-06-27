
import { useState, useRef, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Send, Bot, User, Plus, MessageSquare } from 'lucide-react';

interface ChatMessage {
  id: string;
  content: string;
  sender: 'user' | 'ai';
  timestamp: Date;
}

interface ChatSession {
  id: string;
  title: string;
  messages: ChatMessage[];
  createdAt: Date;
}

export const ChatInterface = () => {
  const [currentSession, setCurrentSession] = useState<ChatSession | null>(null);
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [message, setMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [currentSession?.messages]);

  const startNewChat = () => {
    const newSession: ChatSession = {
      id: Date.now().toString(),
      title: 'Ny samtale',
      messages: [],
      createdAt: new Date()
    };
    
    setSessions(prev => [newSession, ...prev]);
    setCurrentSession(newSession);
  };

  const sendMessage = async () => {
    if (!message.trim() || !currentSession) return;

    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      content: message.trim(),
      sender: 'user',
      timestamp: new Date()
    };

    // Update current session with user message
    const updatedSession = {
      ...currentSession,
      messages: [...currentSession.messages, userMessage],
      title: currentSession.messages.length === 0 ? message.trim().substring(0, 50) : currentSession.title
    };

    setCurrentSession(updatedSession);
    setSessions(prev => prev.map(s => s.id === currentSession.id ? updatedSession : s));
    setMessage('');
    setIsLoading(true);

    // Simulate AI response (replace with actual AI integration later)
    setTimeout(() => {
      const aiMessage: ChatMessage = {
        id: (Date.now() + 1).toString(),
        content: `Tak for din besked! Jeg forstår at du spørger om: "${userMessage.content}". Som AI-assistent er jeg her for at hjælpe dig med dine opgaver og spørgsmål. Hvordan kan jeg hjælpe dig videre?`,
        sender: 'ai',
        timestamp: new Date()
      };

      const finalSession = {
        ...updatedSession,
        messages: [...updatedSession.messages, aiMessage]
      };

      setCurrentSession(finalSession);
      setSessions(prev => prev.map(s => s.id === currentSession.id ? finalSession : s));
      setIsLoading(false);
    }, 1000);
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  return (
    <div className="flex h-[calc(100vh-200px)] gap-4">
      {/* Sidebar with chat sessions */}
      <div className="w-80 flex flex-col">
        <Card className="flex-1">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg">Chat-historik</CardTitle>
              <Button onClick={startNewChat} size="sm" className="bg-indigo-600 hover:bg-indigo-700">
                <Plus className="h-4 w-4 mr-1" />
                Ny chat
              </Button>
            </div>
          </CardHeader>
          <CardContent className="flex-1">
            <div className="space-y-2">
              {sessions.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <MessageSquare className="h-12 w-12 mx-auto mb-3 opacity-50" />
                  <p>Ingen samtaler endnu</p>
                  <p className="text-sm">Start en ny chat for at komme i gang</p>
                </div>
              ) : (
                sessions.map((session) => (
                  <div
                    key={session.id}
                    onClick={() => setCurrentSession(session)}
                    className={`p-3 rounded-lg cursor-pointer transition-colors ${
                      currentSession?.id === session.id 
                        ? 'bg-indigo-50 border-indigo-200 border' 
                        : 'hover:bg-gray-50'
                    }`}
                  >
                    <div className="font-medium text-sm mb-1 truncate">
                      {session.title}
                    </div>
                    <div className="text-xs text-gray-500">
                      {session.messages.length} beskeder
                    </div>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Chat area */}
      <div className="flex-1 flex flex-col">
        {!currentSession ? (
          <Card className="flex-1 flex items-center justify-center">
            <div className="text-center">
              <Bot className="h-16 w-16 text-indigo-600 mx-auto mb-4" />
              <h3 className="text-xl font-semibold mb-2">Velkommen til AI Assistant</h3>
              <p className="text-gray-600 mb-6">Start en ny samtale for at få hjælp med dine opgaver</p>
              <Button onClick={startNewChat} className="bg-indigo-600 hover:bg-indigo-700">
                <Plus className="h-4 w-4 mr-2" />
                Start ny chat
              </Button>
            </div>
          </Card>
        ) : (
          <>
            {/* Chat header */}
            <Card className="mb-4">
              <CardHeader className="py-3">
                <div className="flex items-center gap-3">
                  <Bot className="h-6 w-6 text-indigo-600" />
                  <div>
                    <CardTitle className="text-lg">{currentSession.title}</CardTitle>
                    <p className="text-sm text-gray-600">AI Assistant</p>
                  </div>
                </div>
              </CardHeader>
            </Card>

            {/* Messages area */}
            <Card className="flex-1 flex flex-col">
              <CardContent className="flex-1 p-0">
                <div className="h-full overflow-y-auto p-4 space-y-4">
                  {currentSession.messages.length === 0 ? (
                    <div className="text-center py-8 text-gray-500">
                      <Bot className="h-12 w-12 mx-auto mb-3 text-indigo-300" />
                      <p>Hvordan kan jeg hjælpe dig i dag?</p>
                    </div>
                  ) : (
                    currentSession.messages.map((msg) => (
                      <div key={msg.id} className={`flex gap-3 ${msg.sender === 'user' ? 'justify-end' : ''}`}>
                        {msg.sender === 'ai' && (
                          <Avatar className="h-8 w-8">
                            <AvatarFallback className="bg-indigo-100 text-indigo-600">
                              <Bot className="h-4 w-4" />
                            </AvatarFallback>
                          </Avatar>
                        )}
                        <div className={`max-w-[70%] rounded-lg p-3 ${
                          msg.sender === 'user' 
                            ? 'bg-indigo-600 text-white' 
                            : 'bg-gray-100 text-gray-900'
                        }`}>
                          <p className="whitespace-pre-wrap">{msg.content}</p>
                          <div className={`text-xs mt-2 ${
                            msg.sender === 'user' ? 'text-indigo-200' : 'text-gray-500'
                          }`}>
                            {msg.timestamp.toLocaleTimeString('da-DK', { 
                              hour: '2-digit', 
                              minute: '2-digit' 
                            })}
                          </div>
                        </div>
                        {msg.sender === 'user' && (
                          <Avatar className="h-8 w-8">
                            <AvatarFallback className="bg-blue-100 text-blue-600">
                              <User className="h-4 w-4" />
                            </AvatarFallback>
                          </Avatar>
                        )}
                      </div>
                    ))
                  )}
                  {isLoading && (
                    <div className="flex gap-3">
                      <Avatar className="h-8 w-8">
                        <AvatarFallback className="bg-indigo-100 text-indigo-600">
                          <Bot className="h-4 w-4" />
                        </AvatarFallback>
                      </Avatar>
                      <div className="bg-gray-100 rounded-lg p-3">
                        <div className="flex space-x-1">
                          <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
                          <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{animationDelay: '0.1s'}}></div>
                          <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{animationDelay: '0.2s'}}></div>
                        </div>
                      </div>
                    </div>
                  )}
                  <div ref={messagesEndRef} />
                </div>
              </CardContent>
            </Card>

            {/* Input area */}
            <Card className="mt-4">
              <CardContent className="p-4">
                <div className="flex gap-2">
                  <Textarea
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    onKeyPress={handleKeyPress}
                    placeholder="Skriv din besked her..."
                    className="flex-1 min-h-[60px] resize-none"
                    disabled={isLoading}
                  />
                  <Button 
                    onClick={sendMessage}
                    disabled={!message.trim() || isLoading}
                    className="bg-indigo-600 hover:bg-indigo-700 px-4"
                  >
                    <Send className="h-4 w-4" />
                  </Button>
                </div>
                <div className="flex justify-between items-center mt-2 text-xs text-gray-500">
                  <span>Tryk Enter for at sende, Shift+Enter for ny linje</span>
                </div>
              </CardContent>
            </Card>
          </>
        )}
      </div>
    </div>
  );
};
