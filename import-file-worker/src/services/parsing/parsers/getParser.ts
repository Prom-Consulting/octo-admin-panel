import { ZapisiKzParser } from "../formats/ZapisiKzParser.ts";

export const getParser = (importType: string) => {
  switch (importType) {
    case "zapisi_kz":
      console.log(importType);
      return new ZapisiKzParser();
    // case "another_format":
    //   return new AnotherFormatParser();
    // case "xlsx":
    //   return new ExcelDefaultParser();
    default:
      throw new Error(`❌ Unknown import type: ${importType}`);
  }
};
