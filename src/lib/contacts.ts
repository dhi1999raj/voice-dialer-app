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

export const mockContacts: Contact[] = [
  { id: '1', name: 'Mom', phone: '123-456-7890', initials: 'M', image: 'https://placehold.co/100x100.png' },
  { id: '2', name: 'John Smith', phone: '234-567-8901', initials: 'JS', image: 'https://placehold.co/100x100.png' },
  { id: '3', name: 'Jane Doe', phone: '345-678-9012', initials: 'JD' },
  { id: '4', name: 'Dr. Anya Sharma', phone: '456-789-0123', initials: 'AS', image: 'https://placehold.co/100x100.png' },
  { id: '5', name: 'Pizza Place', phone: '567-890-1234', initials: 'PP' },
  { id: '6', name: 'Alex Johnson', phone: '678-901-2345', initials: 'AJ' },
];

const [mom, john, jane, drAnya] = mockContacts;

export const mockCallHistory: Call[] = [
  { id: 'h1', contact: john, type: 'outgoing', time: 'Today, 5:32 PM' },
  { id: 'h2', contact: mom, type: 'incoming', time: 'Today, 2:15 PM' },
  { id: 'h3', contact: drAnya, type: 'missed', time: 'Today, 11:01 AM' },
  { id: 'h4', contact: jane, type: 'outgoing', time: 'Yesterday, 8:00 PM' },
];
