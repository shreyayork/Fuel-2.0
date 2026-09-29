import type { Company, Person, Initiative, Benchmark } from "@/db/schema";
import type { FuelDataset } from "@/db/queries";

export type { Company, Person, Initiative, Benchmark, FuelDataset };

export type InitiativeWithTeam = Initiative & { team: number[] };
export type CompanySignal = { at: string; kind: string; text: string };
