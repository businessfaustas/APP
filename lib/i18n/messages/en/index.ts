import { app } from "./app";
import { common } from "./common";
import { domain } from "./domain";
import { generated } from "./generated";
import { marketing } from "./marketing";
import { report } from "./report";

export const en = { ...common, ...marketing, ...app, ...domain, ...report, ...generated };
