
"use client";

import { useState, useEffect, useRef } from 'react';
import { Mic, Phone, Loader2, PhoneOutgoing, PhoneMissed, PhoneIncoming, Delete, Settings, Star, History, Users, Grid3x3, User, LogOut, ChevronRight } from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Separator } from '@/components/ui/separator';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { useToast } from "@/hooks/use-toast";
import { generateContactSuggestions } from '@/ai/flows/generate-contact-suggestions';
import type { GenerateContactSuggestionsOutput } from '@/ai/flows/generate-contact-suggestions';
import { mockCallHistory, type Call } from '@/lib/contacts';
import { Input } from '@/components/ui/input';

interface FetchedContact {
  id: string;
  name: string;
  phone: string;
  initials: string;
  image?: string;
}

declare global {
  interface Window {
    SpeechRecognition: any;
    webkitSpeechRecognition: any;
  }
  interface Navigator {
    contacts: {
      select(properties: string[], options?: { multiple: boolean }): Promise<any[]>;
    }
  }
}

export default function VoiceContactPage() {
  const [isListening, setIsListening] = useState(false);
  const [statusText, setStatusText] = useState("Tap the mic to start");
  const [suggestions, setSuggestions] = useState<FetchedContact[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const recognitionRef = useRef<any>(null);
  const { toast } = useToast();
  const [dialerInput, setDialerInput] = useState("");
  const [activeTab, setActiveTab] = useState('favourites');
  const [allContacts, setAllContacts] = useState<FetchedContact[]>([]);
  const [isSheetOpen, setIsSheetOpen] = useState(false);

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
  }, [isLoading, toast, allContacts]); // Add allContacts to dependency array

  const handleMicClick = () => {
    if (isListening || isLoading) return;
    if (recognitionRef.current) {
      recognitionRef.current.start();
    }
  };
  
  const handleTabClick = async (tab: string) => {
    setActiveTab(tab);
    if (tab === 'contacts' && allContacts.length === 0) {
      await handleContactsClick();
    }
    if (tab !== 'favourites') {
      setIsSheetOpen(true);
    } else {
      setIsSheetOpen(false);
    }
  };

  const handleVoiceCommand = async (command: string) => {
    setIsLoading(true);
    setStatusText("Thinking...");

    if (allContacts.length === 0) {
        setStatusText("Please grant contact access first.");
        toast({
            title: "No Contacts",
            description: "Please tap the 'Contacts' button to load your contacts first.",
            variant: "destructive"
        });
        setIsLoading(false);
        return;
    }

    try {
      const result: GenerateContactSuggestionsOutput = await generateContactSuggestions({
        voiceInput: command.toLowerCase().replace(/call|dial/g, '').trim(),
        contactList: allContacts.map(c => c.name),
      });

      if (result.suggestions && result.suggestions.length > 0) {
        const foundContacts = allContacts.filter(contact => result.suggestions.includes(contact.name));
        setSuggestions(foundContacts);

        if (foundContacts.length === 1) {
          setStatusText(`Calling ${foundContacts[0].name}...`);
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

  const handleContactsClick = async () => {
    if (!('contacts' in navigator)) {
        toast({
            title: "Unsupported Feature",
            description: "The Contact Picker API is not supported in your browser.",
            variant: "destructive",
        });
        return;
    }

    try {
        const contacts = await navigator.contacts.select(['name', 'tel'], { multiple: true });
        if (contacts.length > 0) {
            const formattedContacts: FetchedContact[] = contacts.map((contact: any, index: number) => ({
                id: `contact-${index}`,
                name: (contact.name && contact.name[0]) || 'No Name',
                phone: (contact.tel && contact.tel[0]) || '',
                initials: ((contact.name && contact.name[0]) || 'NN').split(' ').map((n: string) => n[0]).join(''),
            }));
            setAllContacts(formattedContacts);
        }
    } catch (error) {
        console.error("Error fetching contacts:", error);
        toast({
            title: "Contacts Error",
            description: "Failed to access your contacts. Please try again.",
            variant: "destructive",
        });
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
    const handleSheetChange = (open: boolean) => {
        setIsSheetOpen(open);
        if (!open) {
            setActiveTab('favourites');
        }
    };
  
    return (
      <Sheet open={isSheetOpen} onOpenChange={handleSheetChange}>
        <SheetContent
          side="bottom"
          className={`rounded-t-2xl ${activeTab === 'recents' || activeTab === 'contacts' ? 'h-4/5' : 'h-auto pb-8'}`}
          onInteractOutside={(e) => e.preventDefault()} // Prevents closing on outside click
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
           {activeTab === 'contacts' && (
            <>
              <SheetHeader>
                <SheetTitle className="flex items-center"><Users className="w-5 h-5 mr-2" /> Contacts</SheetTitle>
              </SheetHeader>
              <div className="py-4 h-full overflow-y-auto">
                {allContacts.length > 0 ? (
                  <div className="space-y-2">
                    {allContacts.map((contact) => (
                      <div key={contact.id}>
                        <div className="flex items-center justify-between py-2">
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
                        <Separator />
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-10">
                    <p className="text-muted-foreground">No contacts loaded.</p>
                    <Button onClick={handleContactsClick} className="mt-4">Load Contacts</Button>
                  </div>
                )}
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
      <div className="w-full max-w-md mx-auto flex flex-col h-full flex-grow">
        <header className="flex items-center justify-between py-6">
          <Sheet>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" aria-label="My Profile">
                <Avatar>
                  <AvatarImage src="https://placehold.co/100x100.png" alt="User" data-ai-hint="person portrait" />
                  <AvatarFallback>U</AvatarFallback>
                </Avatar>
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="w-80">
              <SheetHeader>
                <SheetTitle>My Profile</SheetTitle>
              </SheetHeader>
              <div className="py-4 space-y-6">
                <div className="flex flex-col items-center gap-4">
                  <Avatar className="w-24 h-24">
                    <AvatarImage src="https://placehold.co/100x100.png" alt="User" data-ai-hint="person portrait" />
                    <AvatarFallback>U</AvatarFallback>
                  </Avatar>
                  <div className="text-center">
                    <p className="text-xl font-semibold">Dhiraj Kumar</p>
                    <p className="text-muted-foreground">+1 (234) 567-890</p>
                  </div>
                </div>
                <Separator />
                <nav className="space-y-2">
                  <Link href="/settings" passHref>
                    <Button variant="ghost" className="w-full justify-between">
                      <div className="flex items-center gap-2">
                        <Settings className="w-5 h-5" />
                        <span>Settings</span>
                      </div>
                      <ChevronRight className="w-5 h-5 text-muted-foreground" />
                    </Button>
                  </Link>
                  <Button variant="ghost" className="w-full justify-start gap-2 text-destructive hover:text-destructive">
                    <LogOut className="w-5 h-5" />
                    <span>Log Out</span>
                  </Button>
                </nav>
              </div>
            </SheetContent>
          </Sheet>
          <h1 className="text-4xl font-bold text-primary font-headline">Voice Dialer</h1>
          <Link href="/settings">
            <Button variant="ghost" size="icon" aria-label="Settings">
              <Settings className="w-6 h-6" />
            </Button>
          </Link>
        </header>

        <main className="flex flex-col items-center justify-center gap-6 flex-grow">
          <Button onClick={handleMicClick} disabled={isListening || isLoading} size="icon" className="w-28 h-28 rounded-full bg-primary hover:bg-primary/90 shadow-2xl transition-all duration-300 ease-in-out transform hover:scale-105">
            {isLoading ? (
              <Loader2 className="w-16 h-16 text-primary-foreground animate-spin" />
            ) : (
              <Mic className="w-16 h-16 text-primary-foreground" />
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
            <Button variant="ghost" className={`flex flex-col h-auto items-center gap-1 ${activeTab === 'favourites' ? 'text-primary' : 'text-muted-foreground'}`} onClick={() => handleTabClick('favourites')}>
              <Star className="w-6 h-6" />
              <span className="text-xs">Favourites</span>
            </Button>
            <Button variant="ghost" className={`flex flex-col h-auto items-center gap-1 ${activeTab === 'recents' ? 'text-primary' : 'text-muted-foreground'}`} onClick={() => handleTabClick('recents')}>
              <History className="w-6 h-6" />
              <span className="text-xs">Recents</span>
            </Button>
            <Button variant="ghost" className={`flex flex-col h-auto items-center gap-1 ${activeTab === 'contacts' ? 'text-primary' : 'text-muted-foreground'}`} onClick={() => handleTabClick('contacts')}>
              <Users className="w-6 h-6" />
              <span className="text-xs">Contacts</span>
            </Button>
            <Button variant="ghost" className={`flex flex-col h-auto items-center gap-1 ${activeTab === 'keypad' ? 'text-primary' : 'text-muted-foreground'}`} onClick={() => handleTabClick('keypad')}>
              <Grid3x3 className="w-6 h-6" />
              <span className="text-xs">Keypad</span>
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

    