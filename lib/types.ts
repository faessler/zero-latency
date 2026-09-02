export type Block =
  | { type: "heading"; level: 1 | 2 | 3; html: string }
  | { type: "paragraph"; html: string }
  | { type: "image"; src: string; alt: string }
  | { type: "list"; ordered: boolean; items: string[] }
  | { type: "quote"; html: string };

export interface Article {
  title: string;
  blocks: Block[];
  source: "google-doc" | "sample";
}
