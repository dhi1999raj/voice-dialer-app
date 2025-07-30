
"use client";

import { useState } from "react";
import { useTheme } from "next-themes";
import Link from 'next/link';
import { ChevronLeft, Moon, Sun, Palette, Languages, Trash2, Info } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";

export default function SettingsPage() {
  const { theme, setTheme } = useTheme();
  const { toast } = useToast();
  const [language, setLanguage] = useState('en-US');

  const handleClearHistory = () => {
    // In a real app, you would clear localStorage or make an API call
    toast({
      title: "Call History Cleared",
      description: "Your call history has been successfully cleared.",
    });
  };

  return (
    <div className="bg-background min-h-screen">
      <div className="w-full max-w-md mx-auto flex flex-col h-full">
        <header className="flex items-center justify-between py-4 px-4 sticky top-0 bg-background/80 backdrop-blur-sm border-b z-10">
          <Link href="/" passHref>
            <Button variant="ghost" size="icon" aria-label="Back to Home">
              <ChevronLeft className="w-6 h-6" />
            </Button>
          </Link>
          <h1 className="text-xl font-bold text-primary">Settings</h1>
          <div className="w-10 h-10"></div>
        </header>

        <main className="p-4 space-y-8">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center"><Palette className="w-5 h-5 mr-3" /> Appearance</CardTitle>
              <CardDescription>Customize the look and feel of the app.</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <Label htmlFor="dark-mode" className="flex flex-col gap-1">
                  <span>Dark Mode</span>
                  <span className="text-xs text-muted-foreground">
                    {theme === 'dark' ? "Enabled" : "Disabled"}
                  </span>
                </Label>
                <Switch
                  id="dark-mode"
                  checked={theme === 'dark'}
                  onCheckedChange={(checked) => setTheme(checked ? 'dark' : 'light')}
                />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center"><Languages className="w-5 h-5 mr-3" /> Voice & Language</CardTitle>
              <CardDescription>Manage voice recognition preferences.</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-2">
                <Label htmlFor="language-select">Recognition Language</Label>
                <Select value={language} onValueChange={setLanguage}>
                  <SelectTrigger id="language-select">
                    <SelectValue placeholder="Select language" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="en-US">English (United States)</SelectItem>
                    <SelectItem value="en-GB">English (United Kingdom)</SelectItem>
                    <SelectItem value="es-ES">Español (España)</SelectItem>
                    <SelectItem value="fr-FR">Français (France)</SelectItem>
                    <SelectItem value="de-DE">Deutsch (Deutschland)</SelectItem>
                  </SelectContent>
                </Select>
                 <p className="text-xs text-muted-foreground pt-2">
                    Note: This is a demo. Changing language requires updating speech recognition configuration.
                </p>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center"><Trash2 className="w-5 h-5 mr-3" /> Data Management</CardTitle>
               <CardDescription>Manage your application data.</CardDescription>
            </CardHeader>
            <CardContent>
               <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button variant="destructive" className="w-full">Clear Call History</Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                      <AlertDialogDescription>
                        This action cannot be undone. This will permanently delete your call history data from our servers.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                      <AlertDialogAction onClick={handleClearHistory}>Continue</AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
            </CardContent>
          </Card>

           <Card>
            <CardHeader>
              <CardTitle className="flex items-center"><Info className="w-5 h-5 mr-3" /> About</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-sm text-muted-foreground space-y-2">
                <p>Voice Contact App v1.0.0</p>
                <p>Made with love by Dhiraj Kumar</p>
                 <Link href="#" className="text-primary hover:underline">
                    Send Feedback
                  </Link>
              </div>
            </CardContent>
          </Card>
        </main>
      </div>
    </div>
  );
}
