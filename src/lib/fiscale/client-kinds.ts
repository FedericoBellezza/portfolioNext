/** Client kinds, kept apart from the zod schema so client components stay light. */
export const CLIENT_KINDS = ["company", "individual", "public_administration", "foreign"] as const;
export type ClientKind = (typeof CLIENT_KINDS)[number];

export const CLIENT_KIND_LABEL: Record<ClientKind, string> = {
  company: "Azienda o professionista con P.IVA",
  individual: "Privato (persona fisica)",
  public_administration: "Pubblica amministrazione",
  foreign: "Cliente estero",
};
