import { nanoid } from "nanoid";

const idGeneration = (orgName: string, size: number) => {
  return Date.now() + "_" + orgName + "_" + nanoid(size);
}

export default idGeneration;