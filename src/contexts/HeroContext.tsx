'use client'

import React, { createContext, useContext, useState, ReactNode } from "react";
import defaultHero, { HeroContent } from "../lib/heroContent";

type HeroContextType = {
  hero: HeroContent;
  setHero: (h: HeroContent) => void;
  updateHero: (patch: Partial<HeroContent>) => void;
};

const HeroContext = createContext<HeroContextType | undefined>(undefined);

export function HeroProvider({ children }: { children: ReactNode }) {
  const [hero, setHero] = useState<HeroContent>(defaultHero);
  const updateHero = (patch: Partial<HeroContent>) => setHero((prev) => ({ ...prev, ...patch }));
  return <HeroContext.Provider value={{ hero, setHero, updateHero }}>{children}</HeroContext.Provider>;
}

export function useHero() {
  const ctx = useContext(HeroContext);
  if (!ctx) throw new Error("useHero must be used within HeroProvider");
  return ctx;
}
