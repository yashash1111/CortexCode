import { AIService } from './ai/aiService';

export interface MessageItem {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: string;
  createdAt: Date;
  attachments?: any[];
  feedback?: 'like' | 'dislike';
}

export interface ConversationItem {
  id: string;
  userId: string;
  title: string;
  model: string;
  group: 'Today' | 'Yesterday' | 'Previous 7 Days' | 'Previous 30 Days' | 'Older';
  archived: boolean;
  messages: MessageItem[];
  createdAt: Date;
  updatedAt: Date;
}

// In-Memory Storage & DB Persistence Service
const conversationStore: Map<string, ConversationItem> = new Map();

// Initialize initial default conversations
const defaultConvId = 'conv-default-1';
conversationStore.set(defaultConvId, {
  id: defaultConvId,
  userId: 'default-user',
  title: 'Welcome to CortexCode AI',
  model: 'ChatGPT-4o Ultra (128k RAG)',
  group: 'Today',
  archived: false,
  messages: [
    {
      id: 'msg-init-1',
      role: 'assistant',
      content: `### 🤖 Welcome to CortexCode!
Tagline: *"Think. Code. Build. Grow."*

I am your intelligent assistant. How can I help you today?`,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      createdAt: new Date()
    }
  ],
  createdAt: new Date(),
  updatedAt: new Date()
});

export class ConversationService {
  static async listConversations(userId: string, search?: string): Promise<Record<string, ConversationItem[]>> {
    const userConvs = Array.from(conversationStore.values()).filter(c => !c.archived);
    
    let filtered = userConvs;
    if (search && search.trim()) {
      const q = search.toLowerCase();
      filtered = userConvs.filter(c => c.title.toLowerCase().includes(q) || c.messages.some(m => m.content.toLowerCase().includes(q)));
    }

    // Sort by newest updatedAt first
    filtered.sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime());

    // Group conversations by date groups
    const grouped: Record<string, ConversationItem[]> = {
      'Today': [],
      'Yesterday': [],
      'Previous 7 Days': [],
      'Previous 30 Days': [],
      'Older': []
    };

    const now = new Date();
    filtered.forEach(conv => {
      const diffDays = Math.floor((now.getTime() - conv.updatedAt.getTime()) / (1000 * 3600 * 24));
      if (diffDays === 0) grouped['Today'].push(conv);
      else if (diffDays === 1) grouped['Yesterday'].push(conv);
      else if (diffDays <= 7) grouped['Previous 7 Days'].push(conv);
      else if (diffDays <= 30) grouped['Previous 30 Days'].push(conv);
      else grouped['Older'].push(conv);
    });

    return grouped;
  }

  static async createConversation(userId: string, title?: string, model?: string): Promise<ConversationItem> {
    const id = 'conv-' + Date.now();
    const newConv: ConversationItem = {
      id,
      userId,
      title: title || 'New Conversation',
      model: model || 'ChatGPT-4o Ultra (128k RAG)',
      group: 'Today',
      archived: false,
      messages: [],
      createdAt: new Date(),
      updatedAt: new Date()
    };

    conversationStore.set(id, newConv);
    return newConv;
  }

  static async getConversation(id: string): Promise<ConversationItem | null> {
    return conversationStore.get(id) || null;
  }

  static async updateConversation(id: string, data: { title?: string; archived?: boolean; model?: string }): Promise<ConversationItem | null> {
    const conv = conversationStore.get(id);
    if (!conv) return null;

    if (data.title !== undefined) conv.title = data.title;
    if (data.archived !== undefined) conv.archived = data.archived;
    if (data.model !== undefined) conv.model = data.model;

    conv.updatedAt = new Date();
    conversationStore.set(id, conv);
    return conv;
  }

  static async deleteConversation(id: string): Promise<boolean> {
    return conversationStore.delete(id);
  }

  static async addMessage(
    convId: string,
    role: 'user' | 'assistant' | 'system',
    content: string,
    attachments?: any[],
    mode: string = 'chat',
    userKeys?: { gemini?: string; openai?: string; anthropic?: string }
  ): Promise<{ message: MessageItem; aiResponse?: MessageItem }> {
    let conv = conversationStore.get(convId);
    if (!conv) {
      conv = await this.createConversation('default-user', content.slice(0, 35));
    }

    // Dynamic topic-based auto-titling for conversation
    if (conv.messages.length === 0 && role === 'user') {
      const words = content.trim().split(/\s+/).slice(0, 6).join(' ');
      conv.title = words.length > 3 ? words : content.slice(0, 35);
    }

    // Capture prior history BEFORE adding current user message
    const priorHistory = [...conv.messages];

    const userMsg: MessageItem = {
      id: 'msg-' + Date.now(),
      role,
      content,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      createdAt: new Date(),
      attachments
    };

    conv.messages.push(userMsg);
    conv.updatedAt = new Date();

    if (role === 'user') {
      // Generate AI Response using AIService with prior history, active mode, and user keys
      const aiContent = await AIService.generateResponse(content, priorHistory, conv.model, mode, userKeys);
      const aiMsg: MessageItem = {
        id: 'msg-ai-' + Date.now(),
        role: 'assistant',
        content: aiContent,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        createdAt: new Date()
      };
      conv.messages.push(aiMsg);
      conversationStore.set(convId, conv);
      return { message: userMsg, aiResponse: aiMsg };
    }

    conversationStore.set(convId, conv);
    return { message: userMsg };
  }
}
