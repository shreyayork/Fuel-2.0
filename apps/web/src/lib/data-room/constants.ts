export const DATA_ROOM_DOCUMENT_TYPES = [
  { id: "pitch_deck", label: "Pitch deck" },
  { id: "investor_notes", label: "Investor notes" },
  { id: "investment_memo", label: "Investment memo" },
  { id: "board_deck", label: "Board deck" },
  { id: "financial_model", label: "Financial model" },
  { id: "cap_table", label: "Cap table" },
  { id: "product_roadmap", label: "Product roadmap" },
  { id: "customer_contract", label: "Customer contract" },
  { id: "due_diligence", label: "Due diligence pack" },
  { id: "custom", label: "Custom document" },
] as const;

export type DataRoomDocumentTypeId =
  (typeof DATA_ROOM_DOCUMENT_TYPES)[number]["id"];

export const DATA_ROOM_ACCEPT_EXTENSIONS =
  ".pdf,.ppt,.pptx,.doc,.docx,.xls,.xlsx,.csv,.txt,.md";

export const DATA_ROOM_MAX_BYTES = 25 * 1024 * 1024;
