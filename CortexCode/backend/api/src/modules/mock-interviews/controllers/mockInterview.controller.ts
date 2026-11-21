import { Request, Response } from 'express';
import { MockInterviewService } from '../services/mockInterview.service';
import { MockInterviewAIService } from '../services/mockInterviewAI.service';
import {
  validateCreateSessionInput,
  validateSubmitAnswerInput,
} from '../validators/mockInterview.validators';
import { redactSecrets } from '../../ai/services/secretRedactor';
import { ActivityService } from '../../profile/services/activity.service';

function writeSseEvent(res: Response, event: string, data: unknown) {
  if (res.writableEnded) return;
  res.write(`event: ${event}\n`);
  res.write(`data: ${JSON.stringify(data)}\n\n`);
}

export class MockInterviewController {
  static async createSession(req: Request, res: Response) {
    try {
      const userId = req.user!.userId;
      const input = validateCreateSessionInput(req.body);
      const session = await MockInterviewService.createSession(userId, input);
      res.status(201).json({ success: true, data: session });
    } catch (err: any) {
      const status = typeof err?.status === 'number' ? err.status : 500;
      res.status(status).json({
        success: false,
        error: { message: redactSecrets(err?.message || 'Failed to create interview session') },
      });
    }
  }

  static async listSessions(req: Request, res: Response) {
    try {
      const userId = req.user!.userId;
      const sessions = await MockInterviewService.listSessions(userId);
      res.json({ success: true, data: sessions });
    } catch (err: any) {
      res.status(500).json({
        success: false,
        error: { message: redactSecrets(err?.message || 'Failed to list interview sessions') },
      });
    }
  }

  static async getSession(req: Request, res: Response) {
    try {
      const userId = req.user!.userId;
      const session = await MockInterviewService.getSession(userId, req.params.id);
      if (!session) {
        return res.status(404).json({ success: false, error: { message: 'Interview session not found' } });
      }
      res.json({ success: true, data: session });
    } catch (err: any) {
      res.status(500).json({
        success: false,
        error: { message: redactSecrets(err?.message || 'Failed to get interview session') },
      });
    }
  }

  static async startSession(req: Request, res: Response) {
    try {
      const userId = req.user!.userId;
      const session = await MockInterviewService.startSession(userId, req.params.id);
      res.json({ success: true, data: session });
    } catch (err: any) {
      const status = typeof err?.status === 'number' ? err.status : 500;
      res.status(status).json({
        success: false,
        error: { message: redactSecrets(err?.message || 'Failed to start interview session') },
      });
    }
  }

  static async resumeSession(req: Request, res: Response) {
    try {
      const userId = req.user!.userId;
      const session = await MockInterviewService.resumeSession(userId, req.params.id);
      res.json({ success: true, data: session });
    } catch (err: any) {
      const status = typeof err?.status === 'number' ? err.status : 500;
      res.status(status).json({
        success: false,
        error: { message: redactSecrets(err?.message || 'Failed to resume interview session') },
      });
    }
  }

  static async submitAnswer(req: Request, res: Response) {
    try {
      const userId = req.user!.userId;
      const input = validateSubmitAnswerInput(req.body);
      const result = await MockInterviewService.submitAnswerSync(userId, req.params.id, input);
      res.json({ success: true, data: result });
    } catch (err: any) {
      const status = typeof err?.status === 'number' ? err.status : 500;
      res.status(status).json({
        success: false,
        error: { message: redactSecrets(err?.message || 'Failed to process answer') },
      });
    }
  }

  static async streamAnswer(req: Request, res: Response) {
    const requestId = `mi-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    let clientDisconnected = false;
    req.on('close', () => {
      clientDisconnected = true;
    });

    try {
      const userId = req.user!.userId;
      const input = validateSubmitAnswerInput(req.body);

      res.setHeader('Content-Type', 'text/event-stream');
      res.setHeader('Cache-Control', 'no-cache, no-transform');
      res.setHeader('Connection', 'keep-alive');
      res.flushHeaders?.();

      writeSseEvent(res, 'activity', {
        stage: 'evaluating',
        detail: 'Recording answer & analyzing response...',
      });

      const prep = await MockInterviewService.prepareAnswerTurn(userId, req.params.id, input);

      writeSseEvent(res, 'message_start', {
        requestId,
        sessionId: prep.session.id,
        candidateMessageId: prep.candidateMsg.id,
        currentDifficulty: prep.ctx.currentDifficulty,
        questionsAsked: prep.session.questionsAsked,
      });

      if (clientDisconnected) {
        res.end();
        return;
      }

      writeSseEvent(res, 'activity', {
        stage: 'interviewer',
        detail: prep.isFinalQuestionReached
          ? 'Preparing closing remarks...'
          : 'Interviewer is formulating next question...',
      });

      const gen = MockInterviewAIService.streamNextTurn({
        ctx: prep.ctx,
        history: prep.history,
        candidateInput: input.answer,
        action: prep.isClarification ? 'clarification' : 'answer',
        isFinalQuestionReached: prep.isFinalQuestionReached,
        codeExecutionSummary: prep.codeExecutionSummary,
      });

      let fullText = '';
      let meta: { provider?: string; model?: string } = {};
      while (true) {
        if (clientDisconnected) {
          await gen.return?.(undefined as any);
          break;
        }
        const next = await gen.next();
        if (next.done) {
          if (next.value) meta = next.value;
          break;
        }
        if (next.value) {
          fullText += next.value;
          writeSseEvent(res, 'token', { content: next.value });
        }
      }

      if (clientDisconnected) {
        if (fullText.trim()) {
          const nextQNum = prep.isClarification || prep.isFinalQuestionReached
            ? prep.session.questionsAsked
            : prep.session.questionsAsked + 1;
          await MockInterviewService.commitInterviewerTurn({
            sessionId: prep.session.id,
            content: fullText,
            questionNumber: nextQNum,
            topic: prep.session.currentTopic,
            provider: meta.provider,
            model: meta.model,
            incrementQuestionCount: !prep.isClarification && !prep.isFinalQuestionReached,
            markCompleted: prep.isFinalQuestionReached,
          }).catch(() => {});
        }
        if (!res.writableEnded) res.end();
        return;
      }

      const nextQNum = prep.isClarification || prep.isFinalQuestionReached
        ? prep.session.questionsAsked
        : prep.session.questionsAsked + 1;

      const committed = await MockInterviewService.commitInterviewerTurn({
        sessionId: prep.session.id,
        content: fullText,
        questionNumber: nextQNum,
        topic: prep.session.currentTopic,
        provider: meta.provider,
        model: meta.model,
        incrementQuestionCount: !prep.isClarification && !prep.isFinalQuestionReached,
        markCompleted: prep.isFinalQuestionReached,
      });

      writeSseEvent(res, 'message_complete', {
        requestId,
        session: committed.session,
        message: committed.message,
        candidateMessage: prep.candidateMsg,
        codeExecutionSummary: prep.codeExecutionSummary,
      });
      res.end();
    } catch (err: any) {
      const safeMsg = redactSecrets(err?.message || 'Mock interview streaming failed');
      const status = typeof err?.status === 'number' ? err.status : 500;
      if (!res.headersSent) {
        res.status(status).json({ success: false, error: { message: safeMsg } });
      } else {
        writeSseEvent(res, 'error', { requestId, message: safeMsg });
        if (!res.writableEnded) res.end();
      }
    }
  }

  static async skipQuestion(req: Request, res: Response) {
    try {
      const userId = req.user!.userId;
      const result = await MockInterviewService.skipQuestion(userId, req.params.id);
      res.json({ success: true, data: result });
    } catch (err: any) {
      const status = typeof err?.status === 'number' ? err.status : 500;
      res.status(status).json({
        success: false,
        error: { message: redactSecrets(err?.message || 'Failed to skip question') },
      });
    }
  }

  static async finishSession(req: Request, res: Response) {
    try {
      const userId = req.user!.userId;
      const result = await MockInterviewService.finishSessionAndGenerateReport(userId, req.params.id);
      ActivityService.recordUserActivity(userId, 'mock_interview', {
        sessionId: req.params.id,
        source: 'mock_interview_finish',
      }).catch(() => {});
      res.json({ success: true, data: result });
    } catch (err: any) {
      const status = typeof err?.status === 'number' ? err.status : 500;
      res.status(status).json({
        success: false,
        error: { message: redactSecrets(err?.message || 'Failed to finish interview and generate report') },
      });
    }
  }

  static async getReport(req: Request, res: Response) {
    try {
      const userId = req.user!.userId;
      const result = await MockInterviewService.getReport(userId, req.params.id);
      res.json({ success: true, data: result });
    } catch (err: any) {
      const status = typeof err?.status === 'number' ? err.status : 500;
      res.status(status).json({
        success: false,
        error: { message: redactSecrets(err?.message || 'Failed to retrieve interview report') },
      });
    }
  }
}
