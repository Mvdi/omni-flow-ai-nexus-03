
import { Navigation } from '@/components/Navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Bot, MessageCircle, Lightbulb, Settings, HelpCircle } from 'lucide-react';

const AIAssistant = () => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-indigo-50">
      <Navigation />
      
      <div className="container mx-auto px-6 py-8">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-4xl font-bold text-gray-900 mb-2 flex items-center gap-3">
              <Bot className="h-8 w-8 text-indigo-600" />
              AI Assistant
            </h1>
            <p className="text-gray-600">Din intelligente assistent til optimering af workflows</p>
          </div>
        </div>

        <Card className="shadow-lg border-0">
          <CardHeader>
            <CardTitle>AI Assistant kommer snart</CardTitle>
            <CardDescription>
              Chat med AI for at få hjælp til dine opgaver og systemopsætning
            </CardDescription>
          </CardHeader>
          <CardContent className="py-12">
            <div className="text-center">
              <Bot className="h-16 w-16 text-indigo-600 mx-auto mb-4" />
              <p className="text-gray-600 mb-6">Denne side implementeres i næste iteration</p>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 max-w-2xl mx-auto">
                <div className="p-4 bg-indigo-50 rounded-lg">
                  <MessageCircle className="h-6 w-6 text-indigo-600 mb-2" />
                  <h3 className="font-medium text-sm">Chat Support</h3>
                </div>
                <div className="p-4 bg-indigo-50 rounded-lg">
                  <Lightbulb className="h-6 w-6 text-indigo-600 mb-2" />
                  <h3 className="font-medium text-sm">Anbefalinger</h3>
                </div>
                <div className="p-4 bg-indigo-50 rounded-lg">
                  <HelpCircle className="h-6 w-6 text-indigo-600 mb-2" />
                  <h3 className="font-medium text-sm">Hjælp & Guides</h3>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default AIAssistant;
