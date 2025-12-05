import { ZapisiKzParser } from "../formats/ZapisiKzParser.ts";
import { DikidiParser } from "../formats/DikidiParser.ts";

export const getParser = (importType: string) => {
  switch (importType) {
    case "zapisi_kz":
      return new ZapisiKzParser();
    case "dikidi":
      return new DikidiParser();
    // case "xlsx":
    //   return new ExcelDefaultParser();
    default:
      throw new Error(`❌ Unknown import type: ${importType}`);
  }
};
