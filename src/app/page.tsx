
"use client";

import { useState, useEffect, useRef, useCallback } from 'react';
import { Mic, Phone, Loader2, PhoneOutgoing, PhoneMissed, PhoneIncoming, Delete, Settings, Star, History, Users, Grid3x3 } from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Separator } from '@/components/ui/separator';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { useToast } from "@/hooks/use-toast";
import { generateContactSuggestions } from '@/ai/flows/generate-contact-suggestions';
import type { GenerateContactSuggestionsOutput } from '@/ai/flows/generate-contact-suggestions';
import { Call } from '@/lib/contacts';
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
  const [isLoading, setIsLoading] = useState(false);
  const recognitionRef = useRef<any>(null);
  const { toast } = useToast();
  const [dialerInput, setDialerInput] = useState("");
  const [activeTab, setActiveTab] = useState('favourites');
  const [allContacts, setAllContacts] = useState<FetchedContact[]>([]);
  const [isSheetOpen, setIsSheetOpen] = useState(false);
  const [callHistory] = useState<Call[]>([]);
  const silenceTimerRef = useRef<NodeJS.Timeout | null>(null);


  const handleVoiceCommand = useCallback(async (command: string, contacts: FetchedContact[]) => {
    setIsLoading(true);
    setStatusText("Thinking...");

    if (contacts.length === 0) {
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
        contactList: contacts.map(c => c.name),
      });

      if (result.contactToCall) {
        const foundContact = contacts.find(contact => contact.name.toLowerCase() === result.contactToCall?.toLowerCase());
        if (foundContact) {
            setStatusText(`Calling ${foundContact.name}...`);
            setTimeout(() => {
                window.location.href = `tel:${foundContact.phone}`;
            }, 1500);
        } else {
            setStatusText(`Could not find "${result.contactToCall}" in your list.`);
        }
      } else {
        setStatusText("Sorry, I couldn't find anyone by that name.");
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
  }, [toast]); 
  
  useEffect(() => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      setStatusText("Voice recognition not supported.");
      toast({
        title: "Unsupported Browser",
        description: "Your browser does not support the Web Speech API.",
        variant: "destructive",
      });
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.continuous = false;
    recognition.lang = 'en-US';
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;

    recognition.onstart = () => {
      setIsListening(true);
      setStatusText("Listening...");
      if (silenceTimerRef.current) {
        clearTimeout(silenceTimerRef.current);
      }
    };
    
    recognition.onspeechend = () => {
      silenceTimerRef.current = setTimeout(() => {
        if (recognitionRef.current) {
          recognitionRef.current.stop();
        }
      }, 2000);
    };

    recognition.onend = () => {
      setIsListening(false);
      setStatusText("Tap the mic to start");
       if (silenceTimerRef.current) {
        clearTimeout(silenceTimerRef.current);
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
      if (silenceTimerRef.current) {
        clearTimeout(silenceTimerRef.current);
      }
      const transcript = event.results[0][0].transcript;
      setStatusText(`You said: "${transcript}"`);
      handleVoiceCommand(transcript, allContacts);
    };

    recognitionRef.current = recognition;

    return () => {
       if (silenceTimerRef.current) {
        clearTimeout(silenceTimerRef.current);
      }
    }

  }, [toast, allContacts, handleVoiceCommand]);

  const handleMicClick = () => {
    if (isListening || isLoading) {
      if(recognitionRef.current) {
        recognitionRef.current.stop();
      }
      return;
    };
    
    if (allContacts.length === 0) {
        setStatusText("Please grant contact access first.");
        toast({
            title: "No Contacts",
            description: "Please tap the 'Contacts' button to load your contacts first.",
            variant: "destructive"
        });
        return;
    }

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
                  {callHistory.length > 0 ? callHistory.map((call) => (
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
                  )) : (
                     <div className="text-center py-10">
                      <p className="text-muted-foreground">No recent calls.</p>
                    </div>
                  )}
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
          <div></div>
          <h1 className="text-4xl font-bold text-primary font-headline">Voice Dial</h1>
          <Link href="/settings">
            <Button variant="ghost" size="icon" aria-label="Settings">
              <Settings className="w-6 h-6" />
            </Button>
          </Link>
        </header>

        <main className="flex flex-col items-center justify-center gap-6 flex-grow">
          <Button onClick={handleMicClick} disabled={isLoading} size="icon" className="w-48 h-48 rounded-full bg-primary hover:bg-primary/90 shadow-2xl transition-all duration-300 ease-in-out transform hover:scale-105">
            {isLoading ? (
              <Loader2 className="w-24 h-24 text-primary-foreground animate-spin" />
            ) : isListening ? (
              <Mic className="w-24 h-24 text-primary-foreground" />
            ) : (
              <Mic className="w-24 h-24 text-primary-foreground" />
            )}
          </Button>
          <p className="text-muted-foreground text-center text-lg h-8 transition-opacity">{statusText}</p>
        </main>

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
