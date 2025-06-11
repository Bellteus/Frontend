export interface Inform {
  id: number;
  recomendation: string;
    state: 'pending' | 'processing' | 'completed' | 'failed';
    priority: 'low' | 'medium' | 'high';
    type: 'daily' | 'weekly' | 'monthly';
    Keywords: string[];
}