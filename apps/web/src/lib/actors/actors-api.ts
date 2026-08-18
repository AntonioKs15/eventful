import { PaginatedResult } from "@eventful/contracts";
import { apiRequest } from "../api/api-client";
import { ActorDetail, ActorSummary } from "./types";

export interface ListActorsQuery {
  search?: string;
  page: number;
  pageSize: number;
}

export interface CreateActorInput {
  name: string;
  photoUrl?: string;
  bio?: string;
  birthDate?: string;
}

export function listActors(query: ListActorsQuery): Promise<PaginatedResult<ActorSummary>> {
  return apiRequest("/actors", {
    query: { search: query.search, page: query.page, pageSize: query.pageSize },
  });
}

export function getActor(id: string): Promise<ActorDetail> {
  return apiRequest(`/actors/${id}`);
}

export function createActor(input: CreateActorInput): Promise<ActorSummary> {
  return apiRequest("/actors", { method: "POST", body: input });
}
