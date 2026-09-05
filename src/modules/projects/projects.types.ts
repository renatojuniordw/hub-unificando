/** Domain types for the project registry. */

export interface StackEntry {
  name: string;
  version: string;
  role: string;
}

export interface ProjectCounts {
  documents: number;
  chunks: number;
  decisions: number;
}
