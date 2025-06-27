
import { Navigation } from '@/components/Navigation';
import { ChatInterface } from '@/components/ai/ChatInterface';

const AIAssistant = () => {
  return (
    <div className="min-h-screen bg-gray-50">
      <Navigation />
      
      <div className="p-4">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 mb-1">
              AI Assistant
            </h1>
            <p className="text-gray-600">Din intelligente assistent til optimering af workflows</p>
          </div>
        </div>

        <ChatInterface />
      </div>
    </div>
  );
};

export default AIAssistant;
