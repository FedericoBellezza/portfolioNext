import { afterEach, describe, expect, it } from "vitest";
import { accessOf, canAccessPath, homeOf } from "../../auth/access";
import { ProfileSchema, normaliseProfileForm, profileFormValues, toProfileRow } from "../profile";

describe("dashboard access", () => {
  const env = { ...process.env };
  afterEach(() => {
    process.env = { ...env };
  });

  it("lets the owner everywhere and the brother only into the fiscal section", () => {
    process.env.OWNER_EMAIL = "owner@example.com";
    expect(accessOf(" Owner@Example.com ")).toBe("owner");
    expect(accessOf("gabriele.bellezza1999@gmail.com")).toBe("fiscale");
    expect(accessOf("someone@example.com")).toBeNull();
    expect(accessOf(null)).toBeNull();

    expect(canAccessPath("owner", "/dashboard/trader")).toBe(true);
    expect(canAccessPath("fiscale", "/dashboard/fiscale")).toBe(true);
    expect(canAccessPath("fiscale", "/dashboard/fiscale/chiedi")).toBe(true);
    expect(canAccessPath("fiscale", "/api/fiscale/chat")).toBe(true);
    expect(canAccessPath("fiscale", "/dashboard")).toBe(false);
    expect(canAccessPath("fiscale", "/dashboard/trader")).toBe(false);
    expect(canAccessPath("fiscale", "/dashboard/fiscalefake")).toBe(false);
    expect(canAccessPath(null, "/dashboard/fiscale")).toBe(false);
    expect(homeOf("fiscale")).toBe("/dashboard/fiscale");
    expect(homeOf("owner")).toBe("/dashboard");
  });

  it("takes more fiscal users from FISCALE_USER_EMAILS", () => {
    process.env.FISCALE_USER_EMAILS = "a@example.com, B@Example.com";
    expect(accessOf("b@example.com")).toBe("fiscale");
  });
});

describe("fiscal profile form", () => {
  const form = {
    firstName: " Gabriele ",
    lastName: "Bellezza",
    vatNumber: "IT 0250647001 8",
    taxCode: "rssmra80a01l219x",
    address: "Via Roma",
    streetNumber: "1",
    postalCode: "10100",
    city: "Torino",
    province: "to",
    email: "",
    pec: "",
    iban: "",
    activityStartDate: "2019-03-01",
    atecoCode: "43.21.01",
    coefficient: "0.86",
    startupRate: "15",
    inps35: "on",
    stampToClient: "on",
    invoicePrefix: "",
    paymentDays: "30",
  };

  it("normalises and stores 15%, the 35% reduction only and the coefficient", () => {
    const parsed = ProfileSchema.safeParse(normaliseProfileForm(form));
    expect(parsed.success).toBe(true);
    const row = toProfileRow(parsed.data!);
    expect(row).toMatchObject({
      first_name: "Gabriele",
      vat_number: "02506470018",
      tax_code: "RSSMRA80A01L219X",
      province: "TO",
      email: null,
      startup_tax_rate: 0.15,
      standard_tax_rate: 0.15,
      inps_reduction_35_active: true,
      inps_reduction_50_new_enrollment_active: false,
      profitability_coefficient: 0.86,
      inps_scheme: "artigiani",
    });
  });

  it("points at the field that is wrong", () => {
    const parsed = ProfileSchema.safeParse(normaliseProfileForm({ ...form, vatNumber: "12345678901" }));
    expect(parsed.success).toBe(false);
    expect(parsed.error?.issues[0].path[0]).toBe("vatNumber");
  });

  it("reads a saved row back into the form (5% start-up, coefficient as stored by Postgres)", () => {
    const values = profileFormValues(
      { first_name: "Federico", startup_tax_rate: "0.050", profitability_coefficient: "0.670", default_payment_terms_days: 30 },
      null,
    );
    expect(values.startupRate).toBe(true);
    expect(values.coefficient).toBe(0.67);
    expect(profileFormValues(null, "g@example.com").email).toBe("g@example.com");
  });
});
