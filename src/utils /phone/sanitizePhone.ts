import { customAlphabet } from "nanoid";

const digits = "0123456789";
const gen6 = customAlphabet(digits, 6);

export const generate6DigitCode = (): string => gen6();