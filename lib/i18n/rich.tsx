import { Fragment, type ReactNode } from "react";

/** Puts React elements into a translated sentence: rich("Agree to the {terms}.", { terms: <a … /> }). */
export function rich(template: string, parts: Record<string, ReactNode>): ReactNode {
  return template.split(/(\{\w+\})/g).map((chunk, i) => {
    const name = chunk.match(/^\{(\w+)\}$/)?.[1];
    return <Fragment key={i}>{name && name in parts ? parts[name] : chunk}</Fragment>;
  });
}
