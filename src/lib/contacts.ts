
export interface Contact {
  id: string;
  name: string;
  phone: string;
  initials: string;
  image?: string;
}

export interface Call {
  id: string;
  contact: Contact;
  type: 'outgoing' | 'missed' | 'incoming';
  time: string;
}

// This data is now used as a fallback or for recents, 
// as main contact list is fetched from device contacts.
export const mockContacts: Contact[] = [
  { id: '1', name: 'Mom', phone: '123-456-7890', initials: 'M', image: 'https://placehold.co/100x100.png' },
  { id: '2', name: 'John Smith', phone: '234-567-8901', initials: 'JS', image: 'https://placehold.co/100x100.png' },
  { id: '3', name: 'Jane Doe', phone: '345-678-9012', initials: 'JD' },
  { id: '4', name: 'Dr. Anya Sharma', phone: '456-789-0123', initials: 'AS', image: 'https://placehold.co/100x100.png' },
];

export const mockCallHistory: Call[] = [];
