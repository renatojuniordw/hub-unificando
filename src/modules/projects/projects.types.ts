/** Domain types for the project registry. */

// type alias (não interface): precisa de index signature implícita para
// satisfazer Prisma.InputJsonValue ao persistir a stack como JSON.
export type StackEntry = {
  name: string;
  version: string;
  role: string;
};

export interface ProjectCounts {
  documents: number;
  chunks: number;
  decisions: number;
}
