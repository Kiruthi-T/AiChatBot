export interface Message {
  _id: string;
  text: string;
  createdAt: Date;
  user: {
    _id: number;
    name: string;
    avatar: string;
  };
}

export interface ChatState {
  messages: Message[];
  isLoading: boolean;
  error: string | null;
}