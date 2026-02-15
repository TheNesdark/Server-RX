import { auth } from "./auth";
import { studies } from "./studies";
import { config } from "./config";

export const server = {
  ...auth,
  ...studies,
  ...config,
};
