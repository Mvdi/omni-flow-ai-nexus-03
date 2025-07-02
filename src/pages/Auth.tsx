import { useState } from 'react';
import { Navigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { Lock, Mail, User, LogIn, UserPlus } from 'lucide-react';
const Auth = () => {
  const [isLoading, setIsLoading] = useState(false);
  const {
    user,
    signIn,
    signUp
  } = useAuth();
  const {
    toast
  } = useToast();

  // Redirect if already authenticated
  if (user) {
    return <Navigate to="/" replace />;
  }
  const handleSignIn = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsLoading(true);
    const formData = new FormData(e.currentTarget);
    const email = formData.get('email') as string;
    const password = formData.get('password') as string;
    try {
      const {
        error
      } = await signIn(email, password);
      if (error) {
        toast({
          title: "Fejl ved login",
          description: error.message === 'Invalid login credentials' ? "Ugyldig email eller adgangskode" : error.message,
          variant: "destructive"
        });
        return;
      }
      toast({
        title: "Velkommen tilbage!",
        description: "Du er nu logget ind."
      });
    } catch (error) {
      toast({
        title: "Fejl",
        description: "Der opstod en uventet fejl. Prøv igen.",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };
  const handleSignUp = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsLoading(true);
    const formData = new FormData(e.currentTarget);
    const email = formData.get('email') as string;
    const password = formData.get('password') as string;
    const fullName = formData.get('fullName') as string;
    try {
      const {
        error
      } = await signUp(email, password, fullName);
      if (error) {
        if (error.message.includes('User already registered')) {
          toast({
            title: "Bruger findes allerede",
            description: "En bruger med denne email eksisterer allerede. Prøv at logge ind i stedet.",
            variant: "destructive"
          });
        } else {
          toast({
            title: "Fejl ved registrering",
            description: error.message,
            variant: "destructive"
          });
        }
        return;
      }
      toast({
        title: "Konto oprettet!",
        description: "Tjek din email for at bekræfte din konto."
      });
    } catch (error) {
      toast({
        title: "Fejl",
        description: "Der opstod en uventet fejl. Prøv igen.",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };
  return <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <Card className="w-full max-w-md shadow-sm border-0">
        <CardHeader className="text-center">
          <div className="w-16 h-16 bg-gradient-to-r from-orange-500 to-red-500 rounded-full flex items-center justify-center mx-auto mb-4">
            <Lock className="h-8 w-8 text-white" />
          </div>
          <CardTitle className="text-2xl font-bold">Velkommen</CardTitle>
          <CardDescription>
            Log ind på din konto eller opret en ny
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="signin" className="w-full">
            <TabsList className="grid w-full grid-cols-1">
              <TabsTrigger value="signin" className="flex items-center gap-2">
                <LogIn className="h-4 w-4" />
                Log ind
              </TabsTrigger>
            </TabsList>
            
            <TabsContent value="signin">
              <form onSubmit={handleSignIn} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="signin-email">Email</Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                    <Input id="signin-email" name="email" type="email" placeholder="din@email.dk" className="pl-10" required />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="signin-password">Adgangskode</Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                    <Input id="signin-password" name="password" type="password" placeholder="••••••••" className="pl-10" required />
                  </div>
                </div>
                <Button type="submit" className="w-full bg-orange-600 hover:bg-orange-700" disabled={isLoading}>
                  {isLoading ? "Logger ind..." : "Log ind"}
                </Button>
              </form>
            </TabsContent>
            
          </Tabs>
        </CardContent>
      </Card>
    </div>;
};
export default Auth;