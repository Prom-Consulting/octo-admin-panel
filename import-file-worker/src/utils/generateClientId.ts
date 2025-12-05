import {nanoid} from "nanoid";

export const generateClientId = (source: string) => `${source}_${Date.now()}_${nanoid(16)}`;