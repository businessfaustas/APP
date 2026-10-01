export interface ProviderResult<T> {
  data: T;
  provider: string;
  isDemo: boolean;
  note?: string;
}

/** Thrown when automatic ingestion fails and the user must paste text or fill a form. */
export class NeedsInputError extends Error {
  readonly needsInput = true;
  constructor(message: string) {
    super(message);
    this.name = "NeedsInputError";
  }
}

export class ProviderError extends Error {
  constructor(
    message: string,
    readonly provider: string,
  ) {
    super(message);
    this.name = "ProviderError";
  }
}
