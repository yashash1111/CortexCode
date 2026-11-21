import prisma from '../../../config/prisma';
import { AIGateway, GatewayMessage } from '../../ai/services/aiGateway';
import { AIService } from '../../ai/services/aiService';
import { normalizeChatMode } from '../../ai/services/modePrompts';
import { ProfileService } from '../../profile/services/profile.service';

export interface MessageItemDTO {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  mode: string;
  provider?: string | null;
  model?: string | null;
  timestamp: string;
  createdAt: Date;
  attachments?: unknown;
  feedback?: string | null;
}

export interface ConversationItemDTO {
  id: string;
  userId: string;
  title: string;
  model: string;
  group: 'Today' | 'Yesterday' | 'Previous 7 Days' | 'Previous 30 Days' | 'Older';
  archived: boolean;
  messages: MessageItemDTO[];
  createdAt: Date;
  updatedAt: Date;
}

function computeDateGroup(date: Date): ConversationItemDTO['group'] {
  const diffDays = Math.floor((Date.now() - date.getTime()) / (1000 * 3600 * 24));
  if (diffDays <= 0) return 'Today';
  if (diffDays === 1) return 'Yesterday';
  if (diffDays <= 7) return 'Previous 7 Days';
  if (diffDays <= 30) return 'Previous 30 Days';
  return 'Older';
}

function toMessageDTO(msg: {
  id: string;
  role: string;
  content: string;
  mode: string;
  provider: string | null;
  model: string | null;
  attachments: unknown;
  feedback: string | null;
  createdAt: Date;
}): MessageItemDTO {
  return {
    id: msg.id,
    role: (msg.role === 'assistant' || msg.role === 'system' ? msg.role : 'user'),
    content: msg.content,
    mode: msg.mode || 'chat',
    provider: msg.provider,
    model: msg.model,
    timestamp: msg.createdAt.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    createdAt: msg.createdAt,
    attachments: msg.attachments ?? undefined,
    feedback: msg.feedback,
  };
}

function toConversationDTO(conv: {
  id: string;
  userId: string;
  title: string;
  model: string;
  archived: boolean;
  createdAt: Date;
  updatedAt: Date;
  messages?: Array<{
    id: string;
    role: string;
    content: string;
    mode: string;
    provider: string | null;
    model: string | null;
    attachments: unknown;
    feedback: string | null;
    createdAt: Date;
  }>;
}): ConversationItemDTO {
  return {
    id: conv.id,
    userId: conv.userId,
    title: conv.title,
    model: conv.model,
    group: computeDateGroup(conv.updatedAt),
    archived: conv.archived,
    messages: (conv.messages || []).map(toMessageDTO),
    createdAt: conv.createdAt,
    updatedAt: conv.updatedAt,
  };
}

export class ConversationService {
  static async listConversations(
    userId: string,
    search?: string
  ): Promise<Record<string, ConversationItemDTO[]>> {
    const trimmedSearch = search?.trim();
    const convs = await prisma.conversation.findMany({
      where: {
        userId,
        archived: false,
        moduleType: 'workspace',
        ...(trimmedSearch
          ? {
              OR: [
                { title: { contains: trimmedSearch, mode: 'insensitive' } },
                {
                  messages: {
                    some: { content: { contains: trimmedSearch, mode: 'insensitive' } },
                  },
                },
              ],
            }
          : {}),
      },
      include: {
        messages: {
          orderBy: { createdAt: 'asc' },
          take: 50,
        },
      },
      orderBy: { updatedAt: 'desc' },
    });

    const grouped: Record<string, ConversationItemDTO[]> = {
      Today: [],
      Yesterday: [],
      'Previous 7 Days': [],
      'Previous 30 Days': [],
      Older: [],
    };

    for (const conv of convs) {
      const dto = toConversationDTO(conv);
      grouped[dto.group].push(dto);
    }

    return grouped;
  }

  static async createConversation(
    userId: string,
    title?: string,
    model?: string
  ): Promise<ConversationItemDTO> {
    const conv = await prisma.conversation.create({
      data: {
        userId,
        moduleType: 'workspace',
        title: (title || 'New Conversation').slice(0, 120),
        model: model || 'CortexCode AI (GPT-4o)',
        archived: false,
      },
      include: { messages: true },
    });
    return toConversationDTO(conv);
  }

  static async getConversation(userId: string, id: string): Promise<ConversationItemDTO | null> {
    const conv = await prisma.conversation.findFirst({
      where: { id, userId },
      include: {
        messages: {
          orderBy: { createdAt: 'asc' },
        },
      },
    });
    return conv ? toConversationDTO(conv) : null;
  }

  static async updateConversation(
    userId: string,
    id: string,
    data: { title?: string; archived?: boolean; model?: string }
  ): Promise<ConversationItemDTO | null> {
    const existing = await prisma.conversation.findFirst({ where: { id, userId } });
    if (!existing) return null;

    const updated = await prisma.conversation.update({
      where: { id: existing.id },
      data: {
        ...(data.title !== undefined ? { title: data.title.trim().slice(0, 120) || existing.title } : {}),
        ...(data.archived !== undefined ? { archived: Boolean(data.archived) } : {}),
        ...(data.model !== undefined ? { model: data.model } : {}),
      },
      include: {
        messages: { orderBy: { createdAt: 'asc' } },
      },
    });
    return toConversationDTO(updated);
  }

  static async deleteConversation(userId: string, id: string): Promise<boolean> {
    const res = await prisma.conversation.deleteMany({
      where: { id, userId },
    });
    return res.count > 0;
  }

  static async clearUserConversations(userId: string): Promise<number> {
    const res = await prisma.conversation.deleteMany({
      where: { userId, moduleType: 'workspace' },
    });
    return res.count;
  }

  static async saveUserMessageAndLoadContext(params: {
    userId: string;
    convId: string;
    content: string;
    mode: string;
    attachments?: unknown;
  }) {
    const activeMode = normalizeChatMode(params.mode);
    const trimmed = params.content.trim();

    return prisma.$transaction(async (tx) => {
      let conv = await tx.conversation.findFirst({
        where: { id: params.convId, userId: params.userId },
        include: {
          messages: {
            orderBy: { createdAt: 'asc' },
          },
        },
      });

      if (!conv) {
        const autoTitle = trimmed.split(/\s+/).slice(0, 6).join(' ').slice(0, 60) || 'New Conversation';
        conv = await tx.conversation.create({
          data: {
            userId: params.userId,
            moduleType: 'workspace',
            title: autoTitle,
            model: 'CortexCode AI (GPT-4o)',
          },
          include: { messages: true },
        });
      } else if (conv.messages.length === 0 || conv.title === 'New Conversation' || conv.title === 'New Chat') {
        const autoTitle = trimmed.split(/\s+/).slice(0, 6).join(' ').slice(0, 60) || conv.title;
        await tx.conversation.update({
          where: { id: conv.id },
          data: { title: autoTitle },
        });
        conv.title = autoTitle;
      }

      const priorHistory: GatewayMessage[] = conv.messages.slice(-12).map((m) => ({
        role: m.role === 'assistant' ? 'assistant' : 'user',
        content: m.content,
      }));

      const userMsg = await tx.message.create({
        data: {
          conversationId: conv.id,
          role: 'user',
          content: trimmed,
          mode: activeMode,
          ...(params.attachments ? { attachments: params.attachments as any } : {}),
        },
      });

      await tx.conversation.update({
        where: { id: conv.id },
        data: { updatedAt: new Date() },
      });

      return {
        conversation: conv,
        priorHistory,
        userMessage: toMessageDTO(userMsg),
        mode: activeMode,
      };
    });
  }

  static async saveAssistantMessage(params: {
    conversationId: string;
    userId?: string;
    content: string;
    mode: string;
    provider?: string;
    model?: string;
  }): Promise<MessageItemDTO> {
    const activeMode = normalizeChatMode(params.mode);
    const msg = await prisma.$transaction(async (tx) => {
      const created = await tx.message.create({
        data: {
          conversationId: params.conversationId,
          role: 'assistant',
          content: params.content,
          mode: activeMode,
          provider: params.provider,
          model: params.model,
        },
      });
      await tx.conversation.update({
        where: { id: params.conversationId },
        data: { updatedAt: new Date() },
      });
      return created;
    });

    if (params.userId) {
      await ProfileService.recordActivity(params.userId, `ai_${activeMode}`, {
        messageId: msg.id,
        conversationId: params.conversationId,
        mode: activeMode,
      });
    }

    return toMessageDTO(msg);
  }

  static async addMessage(
    userId: string,
    convId: string,
    role: 'user' | 'assistant' | 'system',
    content: string,
    attachments?: unknown,
    mode: string = 'chat'
  ): Promise<{ conversationId: string; message: MessageItemDTO; aiResponse?: MessageItemDTO }> {
    const activeMode = normalizeChatMode(mode);

    if (role !== 'user') {
      const existing = await prisma.conversation.findFirst({ where: { id: convId, userId } });
      if (!existing) {
        throw Object.assign(new Error('Conversation not found'), { status: 404 });
      }
      const saved = await prisma.message.create({
        data: {
          conversationId: existing.id,
          role,
          content,
          mode: activeMode,
          ...(attachments ? { attachments: attachments as any } : {}),
        },
      });
      return { conversationId: existing.id, message: toMessageDTO(saved) };
    }

    const ctx = await this.saveUserMessageAndLoadContext({
      userId,
      convId,
      content,
      mode: activeMode,
      attachments,
    });

    const systemPrompt = AIService.buildSystemInstructions(activeMode, content);
    const gatewayMessages: GatewayMessage[] = [
      { role: 'system', content: systemPrompt },
      ...ctx.priorHistory,
      { role: 'user', content: content.trim() },
    ];

    const result = await AIGateway.generate({
      messages: gatewayMessages,
      model: ctx.conversation.model,
      userId,
      requestType: activeMode,
    });

    const aiResponse = await this.saveAssistantMessage({
      conversationId: ctx.conversation.id,
      userId,
      content: result.content,
      mode: activeMode,
      provider: result.provider,
      model: result.model,
    });

    return {
      conversationId: ctx.conversation.id,
      message: ctx.userMessage,
      aiResponse,
    };
  }
}
