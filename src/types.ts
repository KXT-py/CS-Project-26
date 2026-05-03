export type Category = 'book' | 'hobby' | 'skill' | 'learning-field' | 'podcast' | 'article';

export interface Recommendation {
  id: string;
  title: string;
  description: string;
  category: Category;
  link?: string;
  reference?: string;
  rating?: number;
  review?: string;
  longSummary?: string; // For the "dive deeper" feature
}

export interface UserProfile {
  name: string;
  avatar: string;
  favorites: string[]; // IDs of recommendations
  archive: {
    id: string;
    timestamp: number;
    query: string;
    items: Recommendation[];
  }[];
  progress: Record<string, 'not_started' | 'in_progress' | 'completed'>;
  reviews?: Record<string, Review>;
}

export interface Review {
  recommendationId: string;
  rating: number;
  comment: string;
  timestamp: number;
}
