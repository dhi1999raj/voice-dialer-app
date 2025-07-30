"use client";

import { useState, useEffect, useRef } from 'react';
import { Mic, Phone, Loader2, PhoneOutgoing, PhoneMissed, PhoneIncoming, Delete, Settings, Star, History, Users, Grid3x3 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Separator } from '@/components/ui/separator';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { useToast } from "@/hooks/use-toast";
import { generateContactSuggestions } from '@/ai/flows/generate-contact-suggestions';
import type { GenerateContactSuggestionsOutput } from '@/ai/flows/generate-contact-suggestions';
import { mockContacts, mockCallHistory, type Contact, type Call } from '@/lib/contacts';
import { Input } from '@/components/ui/input';

declare global {
  interface Window {
    SpeechRecognition: any;
    webkitSpeechRecognition: any;
  }
}

export default function VoiceContactPage() {
  const [isListening, setIsListening] = useState(false);
  const [statusText, setStatusText] = useState("Tap the mic to start");
  const [suggestions, setSuggestions] = useState<Contact[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const recognitionRef = useRef<any>(null);
  const { toast } = useToast();
  const [dialerInput, setDialerInput] = useState("");
  const [activeTab, setActiveTab] = useState('recents');

  useEffect(() => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (SpeechRecognition) {
      const recognition = new SpeechRecognition();
      recognition.continuous = false;
      recognition.lang = 'en-US';
      recognition.interimResults = false;
      recognition.maxAlternatives = 1;

      recognition.onstart = () => {
        setIsListening(true);
        setStatusText("Listening...");
        setSuggestions([]);
      };

      recognition.onend = () => {
        setIsListening(false);
        if (!isLoading) {
          setStatusText("Tap the mic to start");
        }
      };

      recognition.onerror = (event: any) => {
        console.error("Speech recognition error", event.error);
        let errorMessage = "An unknown error occurred.";
        if (event.error === 'not-allowed' || event.error === 'service-not-allowed') {
          errorMessage = "Microphone access denied. Please allow microphone permissions in your browser settings.";
        } else if (event.error === 'no-speech') {
          errorMessage = "No speech detected. Please try again.";
        }
        setStatusText("Error listening. Try again.");
        toast({
          title: "Voice Recognition Error",
          description: errorMessage,
          variant: "destructive",
        });
        setIsListening(false);
      };

      recognition.onresult = (event: any) => {
        const transcript = event.results[0][0].transcript;
        setStatusText(`You said: "${transcript}"`);
        handleVoiceCommand(transcript);
      };

      recognitionRef.current = recognition;
    } else {
      setStatusText("Voice recognition not supported.");
      toast({
        title: "Unsupported Browser",
        description: "Your browser does not support the Web Speech API.",
        variant: "destructive",
      });
    }
  }, [isLoading, toast]);

  const handleMicClick = () => {
    if (isListening || isLoading) return;
    if (recognitionRef.current) {
      recognitionRef.current.start();
    }
  };

  const handleVoiceCommand = async (command: string) => {
    setIsLoading(true);
    setStatusText("Thinking...");

    const commandLower = command.toLowerCase();
    let contactQuery = commandLower.replace(/call|dial/g, '').trim();

    try {
      const result: GenerateContactSuggestionsOutput = await generateContactSuggestions({
        voiceInput: contactQuery,
        contactList: mockContacts.map(c => c.name),
      });

      if (result.suggestions && result.suggestions.length > 0) {
        const foundContacts = mockContacts.filter(contact => result.suggestions.includes(contact.name));
        setSuggestions(foundContacts);

        if (foundContacts.length === 1) {
          setStatusText(`Calling ${foundContacts[0].name}...`);
          // Simulating call
          setTimeout(() => {
             window.location.href = `tel:${foundContacts[0].phone}`;
          }, 1500);
        } else {
          setStatusText("Who should I call?");
        }
      } else {
        setStatusText("Sorry, I couldn't find anyone by that name.");
        setSuggestions([]);
      }
    } catch (error) {
      console.error("Error generating contact suggestions:", error);
      setStatusText("There was an error. Please try again.");
      toast({
        title: "AI Suggestion Error",
        description: "Could not get suggestions from the AI model.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };
  
  const CallTypeIcon = ({ type }: { type: Call['type'] }) => {
    const iconProps = { className: "w-4 h-4 mr-2" };
    switch (type) {
      case 'outgoing': return <PhoneOutgoing {...iconProps} />;
      case 'incoming': return <PhoneIncoming {...iconProps} />;
      case 'missed': return <PhoneMissed {...iconProps} className={`${iconProps.className} text-destructive`} />;
      default: return null;
    }
  };

  const dialerButtons = [
    '1', '2', '3',
    '4', '5', '6',
    '7', '8', '9',
    '*', '0', '#'
  ];

  const handleDialerClick = (key: string) => {
    setDialerInput(prev => prev + key);
  };

  const handleDialerDelete = () => {
    setDialerInput(prev => prev.slice(0, -1));
  };
  
  const handleDialerCall = () => {
    if (dialerInput) {
      window.location.href = `tel:${dialerInput}`;
    }
  };
  
  const renderContent = () => {
    const isSheetOpen = activeTab === 'recents' || activeTab === 'keypad';
    const handleSheetChange = (isOpen: boolean) => {
      if (!isOpen) {
        setActiveTab('favourites'); // or any default tab you prefer when closing
      }
    };
  
    return (
      <Sheet open={isSheetOpen} onOpenChange={handleSheetChange}>
        <SheetContent
          side="bottom"
          className={`rounded-t-2xl ${activeTab === 'recents' ? 'h-4/5' : 'h-auto pb-8'}`}
          // The onOpenChange on Sheet will handle closing, so we don't need interaction handlers here.
        >
          {activeTab === 'recents' && (
            <>
              <SheetHeader>
                <SheetTitle className="flex items-center"><History className="w-5 h-5 mr-2" /> Recents</SheetTitle>
              </SheetHeader>
              <div className="py-4 h-full overflow-y-auto">
                <div className="space-y-2">
                  {mockCallHistory.map((call) => (
                    <div key={call.id}>
                      <div className="flex items-center justify-between py-2">
                        <div className="flex items-center gap-4">
                          <Avatar>
                            <AvatarImage src={call.contact.image} alt={call.contact.name} data-ai-hint="person portrait" />
                            <AvatarFallback>{call.contact.initials}</AvatarFallback>
                          </Avatar>
                          <div>
                            <p className="font-semibold">{call.contact.name}</p>
                            <div className="flex items-center text-sm text-muted-foreground">
                              <CallTypeIcon type={call.type} />
                              <span>{call.time}</span>
                            </div>
                          </div>
                        </div>
                        <a href={`tel:${call.contact.phone}`} aria-label={`Call ${call.contact.name}`}>
                          <Button variant="ghost" size="icon" className="text-accent rounded-full hover:bg-accent/10">
                            <Phone className="w-5 h-5" />
                          </Button>
                        </a>
                      </div>
                      <Separator />
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}
          {activeTab === 'keypad' && (
            <>
              <SheetHeader>
                <SheetTitle className="flex items-center"><Grid3x3 className="w-5 h-5 mr-2" /> Keypad</SheetTitle>
              </SheetHeader>
              <div className="py-4 flex flex-col items-center">
                  <div className="relative w-full max-w-xs mb-4">
                      <Input 
                          readOnly 
                          value={dialerInput}
                          className="text-3xl h-14 text-center pr-10"
                          placeholder="Enter number"
                      />
                      {dialerInput && (
                          <Button onClick={handleDialerDelete} variant="ghost" size="icon" className="absolute right-1 top-1/2 -translate-y-1/2 h-12 w-12">
                              <Delete className="w-6 h-6" />
                          </Button>
                      )}
                  </div>
                  <div className="grid grid-cols-3 gap-4 w-full max-w-xs">
                      {dialerButtons.map((key) => (
                          <Button key={key} onClick={() => handleDialerClick(key)} variant="outline" className="h-16 text-2xl font-bold">
                              {key}
                          </Button>
                      ))}
                  </div>
                   <div className="mt-4 w-full max-w-xs">
                      <Button onClick={handleDialerCall} size="lg" className="w-full h-16 bg-green-500 hover:bg-green-600">
                          <Phone className="w-6 h-6" />
                      </Button>
                  </div>
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>
    );
  }

  return (
    <div className="bg-background min-h-screen flex flex-col items-center p-4 font-body text-foreground">
      <div className="w-full max-w-md mx-auto flex flex-col h-full">
        <header className="flex items-center justify-between py-6">
          <div className="w-10 h-10"></div>
          <h1 className="text-4xl font-bold text-primary font-headline">Voice Contact</h1>
          <Button variant="ghost" size="icon" aria-label="Settings">
            <Settings className="w-6 h-6" />
          </Button>
        </header>

        <main className="flex flex-col items-center gap-6 my-4 flex-grow">
          <Button onClick={handleMicClick} disabled={isListening || isLoading} size="icon" className="w-28 h-28 rounded-full bg-primary hover:bg-primary/90 shadow-2xl transition-all duration-300 ease-in-out transform hover:scale-105">
            {isLoading ? (
              <Loader2 className="w-12 h-12 text-primary-foreground animate-spin" />
            ) : (
              <Mic className="w-12 h-12 text-primary-foreground" />
            )}
          </Button>
          <p className="text-muted-foreground text-center text-lg h-8 transition-opacity">{statusText}</p>
        </main>

        <div className="space-y-8 pb-24">
          {suggestions.length > 0 && (
            <Card className="shadow-lg animate-in fade-in-0 zoom-in-95">
              <CardHeader>
                <CardTitle className="flex items-center"><Mic className="w-5 h-5 mr-2" /> Suggestions</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {suggestions.map((contact) => (
                    <div key={contact.id} className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <Avatar>
                          <AvatarImage src={contact.image} alt={contact.name} data-ai-hint="person photo" />
                          <AvatarFallback>{contact.initials}</AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="font-semibold">{contact.name}</p>
                          <p className="text-sm text-muted-foreground">{contact.phone}</p>
                        </div>
                      </div>
                      <a href={`tel:${contact.phone}`} aria-label={`Call ${contact.name}`}>
                        <Button variant="ghost" size="icon" className="text-accent rounded-full hover:bg-accent/10">
                          <Phone className="w-5 h-5" />
                        </Button>
                      </a>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
        
        {renderContent()}

        <div className="fixed bottom-0 left-0 right-0 bg-background/80 backdrop-blur-sm border-t">
          <div className="flex justify-around items-center max-w-md mx-auto h-20">
            <Button variant="ghost" className={`flex flex-col h-auto items-center gap-1 ${activeTab === 'favourites' ? 'text-primary' : 'text-muted-foreground'}`} onClick={() => setActiveTab('favourites')}>
              <Star className="w-6 h-6" />
              <span className="text-xs">Favourites</span>
            </Button>
            <Button variant="ghost" className={`flex flex-col h-auto items-center gap-1 ${activeTab === 'recents' ? 'text-primary' : 'text-muted-foreground'}`} onClick={() => setActiveTab('recents')}>
              <History className="w-6 h-6" />
              <span className="text-xs">Recents</span>
            </Button>
            <Button variant="ghost" className={`flex flex-col h-auto items-center gap-1 ${activeTab === 'contacts' ? 'text-primary' : 'text-muted-foreground'}`} onClick={() => setActiveTab('contacts')}>
              <Users className="w-6 h-6" />
              <span className="text-xs">Contacts</span>
            </Button>
            <Button variant="ghost" className={`flex flex-col h-auto items-center gap-1 ${activeTab === 'keypad' ? 'text-primary' : 'text-muted-foreground'}`} onClick={() => setActiveTab('keypad')}>
              <Grid3x3 className="w-6 h-6" />
              <span className="text-xs">Keypad</span>
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
