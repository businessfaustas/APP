export interface ProviderResult<T> {
  data: T;
  provider: string;
  isDemo: boolean;
  note?: string;
}

/** Thrown when automatic ingestion fails and the user must paste text or fill a form. */
/** Vehicle details already known (e.g. read from the link) to prefill the form. */
export type InputPrefill = Partial<{
  vin: string | null;
  year: number | null;
  make: string | null;
  model: string | null;
  trim: string | null;
  titleRaw: string | null;
  state: string | null;
  city: string | null;
}>;

export class NeedsInputError extends Error {
  readonly needsInput = true;
  constructor(
    message: string,
    readonly prefill: InputPrefill | null = null,
  ) {
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
