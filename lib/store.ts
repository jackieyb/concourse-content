"use client";

import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import type { Draft, Publication, Recommendation } from "@/types";
import { SEED_PUBLICATIONS } from "@/lib/back-catalog";

type AppState = {
  drafts: Record<string, Draft>;
  activeDraftId: string | null;
  publications: Publication[];
  lastRecommendations: Recommendation[] | null;
  recommendationsDate: string | null;

  upsertDraft: (draft: Draft) => void;
  setActiveDraft: (id: string | null) => void;
  deleteDraft: (id: string) => void;
  publishDraft: (draftId: string) => Publication | null;
  scheduleDraft: (draftId: string, iso: string | null) => void;
  setRecommendations: (recs: Recommendation[], date: string) => void;
  resetAll: () => void;
};

export const useAppStore = create<AppState>()(
  persist(
    (set, get) => ({
      drafts: {},
      activeDraftId: null,
      publications: SEED_PUBLICATIONS,
      lastRecommendations: null,
      recommendationsDate: null,

      upsertDraft: (draft) =>
        set((s) => ({
          drafts: { ...s.drafts, [draft.id]: draft },
          activeDraftId: draft.id,
        })),

      setActiveDraft: (id) => set({ activeDraftId: id }),

      deleteDraft: (id) =>
        set((s) => {
          const next = { ...s.drafts };
          delete next[id];
          return {
            drafts: next,
            activeDraftId: s.activeDraftId === id ? null : s.activeDraftId,
          };
        }),

      publishDraft: (draftId) => {
        const draft = get().drafts[draftId];
        if (!draft || !draft.content) return null;
        const pub: Publication = {
          id: `pub-${draftId}`,
          draftId,
          title: draft.content.title,
          slug: draft.content.slug,
          format: draft.format,
          urgency: draft.urgency,
          primaryKeyword: draft.content.primaryKeyword,
          excerpt: draft.content.excerpt,
          content: draft.content,
          publishedAt: new Date().toISOString(),
          mockMetrics: { views: 0, avgTimeOnPage: "—", source: "mock" },
        };
        set((s) => ({ publications: [pub, ...s.publications] }));
        return pub;
      },

      scheduleDraft: (draftId, iso) =>
        set((s) => {
          const draft = s.drafts[draftId];
          if (!draft) return s;
          const updated: Draft = {
            ...draft,
            scheduledFor: iso ?? undefined,
            updatedAt: new Date().toISOString(),
          };
          return { drafts: { ...s.drafts, [draftId]: updated } };
        }),

      setRecommendations: (recs, date) =>
        set({ lastRecommendations: recs, recommendationsDate: date }),

      resetAll: () =>
        set({
          drafts: {},
          activeDraftId: null,
          publications: SEED_PUBLICATIONS,
          lastRecommendations: null,
          recommendationsDate: null,
        }),
    }),
    {
      name: "concourse-content-generator",
      storage: createJSONStorage(() => localStorage),
    },
  ),
);
