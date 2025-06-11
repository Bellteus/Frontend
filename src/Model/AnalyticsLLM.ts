export interface AnalyticsLLM {
    id: number;
    transcript: string;
    callId: number;
    satisfaction: number | null;
    createdAt: string;
    priority: 'low' | 'medium' | 'high';
}