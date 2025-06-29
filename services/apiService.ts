// src/services/apiService.ts
import {
  collection,
  doc,
  getDoc,
  getDocs,
  addDoc,
  updateDoc,
  deleteDoc,
  Timestamp,
} from "firebase/firestore";
import { db } from "./firebaseConfig";

import {
  Pleito,
  Analista,
  StatusPleito,
  TipoPleitoEnum,
  SessaoAnalise,
} from "../types";

// ---------- coleções ----------
const pleitosCol = collection(db, "pleitos");
const analistasCol = collection(db, "analistas");

// ---------- helpers ----------
const docToData = <T>(snap: any): T => ({ id: snap.id, ...snap.data() } as T);

// ---------- API ----------
export const apiService = {
  // PLEITOS -------------------------------------------------
  getPleitos: async (): Promise<Pleito[]> => {
    const snap = await getDocs(pleitosCol);
    return snap.docs.map((d) => docToData<Pleito>(d));
  },

  getPleitoById: async (id: string): Promise<Pleito | undefined> => {
    const snap = await getDoc(doc(pleitosCol, id));
    return snap.exists() ? docToData<Pleito>(snap) : undefined;
  },

  createPleito: async (
    pleitoData: Omit<Pleito, "id">
  ): Promise<Pleito> => {
    const ref = await addDoc(pleitosCol, {
      ...pleitoData,
      createdAt: Timestamp.now(),
    });
    return { id: ref.id, ...pleitoData };
  },

  updatePleito: async (
    id: string,
    patch: Partial<Pleito>
  ): Promise<Pleito> => {
    await updateDoc(doc(pleitosCol, id), patch);
    const snap = await getDoc(doc(pleitosCol, id));
    return docToData<Pleito>(snap);
  },

  deletePleito: async (id: string): Promise<void> =>
    deleteDoc(doc(pleitosCol, id)),

  // ANALISTAS ----------------------------------------------
  getAnalistas: async (): Promise<Analista[]> => {
    const snap = await getDocs(analistasCol);
    return snap.docs.map((d) => docToData<Analista>(d));
  },

  createAnalista: async (
    data: Omit<Analista, "id">
  ): Promise<Analista> => {
    const ref = await addDoc(analistasCol, data);
    return { id: ref.id, ...data };
  },

  updateAnalista: async (
    id: string,
    patch: Partial<Analista>
  ): Promise<Analista> => {
    await updateDoc(doc(analistasCol, id), patch);
    const snap = await getDoc(doc(analistasCol, id));
    return docToData<Analista>(snap);
  },

  deleteAnalista: async (id: string): Promise<void> =>
    deleteDoc(doc(analistasCol, id)),
};
