export interface SearchResult {
  id: string;
  title: string;
  url: string;
  publishedDate?: string;
  author?: string;
  score?: number;
  snippet?: string; // Short preview provided by search engine
  text?: string;    // Full text content if available
}

export interface SearchResponse {
  results: SearchResult[];
  summary: string;
}

export interface SavedSearch {
  id: string;
  query: string;
  timestamp: number;
  model: ModelProvider;
  filter: FilterType;
}

export enum FilterType {
  ALL = 'all',
  NEWS = 'news',
  BLOGS = 'blogs',
  PDF = 'pdf',
  GITHUB = 'github'
}

export enum ModelProvider {
  GEMINI = 'gemini',
  OPENAI = 'openai',
  GROK = 'grok'
}

export interface ApiKeys {
  exa: string;
  gemini: string;
  openai: string;
  grok: string;
}
