export interface ContentMetadata {
  title?: string;
  artist?: string;
}

export interface ContentEntry {
  size?: number;
  isFile: boolean;
  name: string;
  metadata?: ContentMetadata;
  path: string;
  enter: string;
}
