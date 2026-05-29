// scripts/seed-wardrobe.ts
//
// TEST-06: Seed 6 sample dresses across categories with placeholder images for
// dev/test environments. Idempotent — safe to re-run; upserts on (ownerId,title).
//
// SAFETY (CRITICAL — see CLAUDE.md 2026-04-05/24 destructive-DB lessons):
// Two-layer production guard runs BEFORE PrismaClient instantiation:
//   1. process.env.NODE_ENV === "production" + ALLOW_PROD_SEED !== "1"  → exit 1
//   2. DATABASE_URL pointing at Neon prod-looking host (contains "neon.tech" but
//      not a dev/test/local marker) → exit 1
//
// Image strategy (21-RESEARCH §Placeholder images): picsum.photos seeded URLs
// avoid burning Vercel Blob quota and have zero CI dependency on remote upload.
// Schema accepts arbitrary URLs (DressImage.url: String).
//
// Six-dress fixture distribution (21-RESEARCH §Six-dress fixture distribution):
//   2x CLASSICAL (one Yura-owned pct=0, one consigned pct=15)
//   1x DRAMATIC (consigned)
//   1x THEMED (Yura-owned)
//   1x ICE_DANCE_PARTNER (Yura-owned)
//   1x ICE_DANCE_SINGLE (consigned)
// Size ranges vary to demonstrate fits-me filter behavior against the seeded
// student profile (heightCm=160, chestCm=86, waistCm=68, hipsCm=92).
//
// Run: `pnpm seed:wardrobe:dev`

// ── Layer 1: NODE_ENV guard (runs before PrismaClient import) ─────────────
if (process.env.NODE_ENV === "production" && process.env.ALLOW_PROD_SEED !== "1") {
  console.error(
    "[seed-wardrobe] REFUSING to run: NODE_ENV=production. Set ALLOW_PROD_SEED=1 to override (you almost certainly do not want to do this).",
  );
  process.exit(1);
}

// ── Layer 2: DATABASE_URL host substring guard ────────────────────────────
const dbUrl = process.env.DATABASE_URL ?? "";
const looksLikeProdNeon =
  dbUrl.includes("neon.tech") &&
  !dbUrl.includes("-dev-") &&
  !dbUrl.includes("-test-") &&
  !dbUrl.includes("localhost");
if (looksLikeProdNeon && process.env.ALLOW_PROD_SEED !== "1") {
  console.error(
    "[seed-wardrobe] REFUSING to run: DATABASE_URL looks like production Neon (contains 'neon.tech' without a -dev-/-test-/localhost marker). Set ALLOW_PROD_SEED=1 to override.",
  );
  process.exit(1);
}

// Guards passed — safe to import PrismaClient.
import { type DressCategory, type DressCondition, PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

type SeedDress = {
  title: string;
  ownerEmail: string;
  category: DressCategory;
  condition: DressCondition;
  color: string;
  secondaryColors: string[];
  themeTags: string[];
  description: string;
  sizeLabel: string;
  chestMinCm: number | null;
  chestMaxCm: number | null;
  waistMinCm: number | null;
  waistMaxCm: number | null;
  hipsMinCm: number | null;
  hipsMaxCm: number | null;
  lengthCm: number | null;
  alterableSmaller: boolean;
  alterableLarger: boolean;
  competitionPrice: number;
  seasonalPrice: number;
  purchasePrice: number | null;
  securityDeposit: number;
  cleaningFee: number;
  consignmentCommissionPct: number;
};

// 6-fixture spec. Owner emails MUST exist in the User table — fall back to the
// E2E-seeded admin (admin@test.com) for Yura-owned, and the E2E-seeded student
// (test.student@example.com) acting as a consigner for consigned dresses.
const FIXTURES: SeedDress[] = [
  {
    title: "Midnight Crystal Classical",
    ownerEmail: "admin@test.com",
    category: "CLASSICAL",
    condition: "LIKE_NEW",
    color: "Navy",
    secondaryColors: ["Silver"],
    themeTags: ["Tchaikovsky", "Ballroom"],
    description: "Floor-length classical dress with crystal bodice detailing. Yura's collection.",
    sizeLabel: "S",
    chestMinCm: 82,
    chestMaxCm: 88,
    waistMinCm: 64,
    waistMaxCm: 70,
    hipsMinCm: 88,
    hipsMaxCm: 94,
    lengthCm: 72,
    alterableSmaller: true,
    alterableLarger: false,
    competitionPrice: 5000,
    seasonalPrice: 37500,
    purchasePrice: 90000,
    securityDeposit: 20000,
    cleaningFee: 3000,
    consignmentCommissionPct: 0, // Yura-owned
  },
  {
    title: "Emerald Waltz Classical",
    ownerEmail: "test.student@example.com",
    category: "CLASSICAL",
    condition: "GENTLY_USED",
    color: "Emerald",
    secondaryColors: ["Gold"],
    themeTags: ["Waltz", "Vintage"],
    description: "Soft emerald classical with gold embroidery. Consigned from a former competitor.",
    sizeLabel: "M",
    chestMinCm: 86,
    chestMaxCm: 92,
    waistMinCm: 68,
    waistMaxCm: 74,
    hipsMinCm: 92,
    hipsMaxCm: 98,
    lengthCm: 70,
    alterableSmaller: false,
    alterableLarger: true,
    competitionPrice: 4500,
    seasonalPrice: 32000,
    purchasePrice: null,
    securityDeposit: 20000,
    cleaningFee: 3000,
    consignmentCommissionPct: 15, // consigned, default rate
  },
  {
    title: "Crimson Tango Dramatic",
    ownerEmail: "test.student@example.com",
    category: "DRAMATIC",
    condition: "NEW",
    color: "Crimson",
    secondaryColors: ["Black"],
    themeTags: ["Tango", "Carmen"],
    description: "Asymmetric crimson and black dramatic costume. Statement piece for free skate.",
    sizeLabel: "S",
    chestMinCm: 80,
    chestMaxCm: 86,
    waistMinCm: 62,
    waistMaxCm: 68,
    hipsMinCm: 86,
    hipsMaxCm: 92,
    lengthCm: 68,
    alterableSmaller: true,
    alterableLarger: false,
    competitionPrice: 6000,
    seasonalPrice: 42000,
    purchasePrice: 105000,
    securityDeposit: 25000,
    cleaningFee: 4000,
    consignmentCommissionPct: 15,
  },
  {
    title: "Constellation Themed",
    ownerEmail: "admin@test.com",
    category: "THEMED",
    condition: "LIKE_NEW",
    color: "Black",
    secondaryColors: ["Silver", "Blue"],
    themeTags: ["Galaxy", "Stars"],
    description:
      "Black themed dress with embroidered constellations and stardust mesh. Yura's collection.",
    sizeLabel: "M",
    chestMinCm: 84,
    chestMaxCm: 90,
    waistMinCm: 66,
    waistMaxCm: 72,
    hipsMinCm: 90,
    hipsMaxCm: 96,
    lengthCm: 74,
    alterableSmaller: false,
    alterableLarger: false,
    competitionPrice: 5500,
    seasonalPrice: 40000,
    purchasePrice: 95000,
    securityDeposit: 22000,
    cleaningFee: 3500,
    consignmentCommissionPct: 0,
  },
  {
    title: "Aurora Ice Dance Partner",
    ownerEmail: "admin@test.com",
    category: "ICE_DANCE_PARTNER",
    condition: "GENTLY_USED",
    color: "Lavender",
    secondaryColors: ["White"],
    themeTags: ["Lyrical", "Romantic"],
    description: "Flowing partner ice dance dress with full skirt and beaded mesh sleeves.",
    sizeLabel: "S",
    chestMinCm: 78,
    chestMaxCm: 84,
    waistMinCm: 60,
    waistMaxCm: 66,
    hipsMinCm: 84,
    hipsMaxCm: 90,
    lengthCm: 66,
    alterableSmaller: true,
    alterableLarger: true,
    competitionPrice: 5200,
    seasonalPrice: 38000,
    purchasePrice: 92000,
    securityDeposit: 20000,
    cleaningFee: 3000,
    consignmentCommissionPct: 0,
  },
  {
    title: "Solo Spotlight Ice Dance",
    ownerEmail: "test.student@example.com",
    category: "ICE_DANCE_SINGLE",
    condition: "USED",
    color: "Ruby",
    secondaryColors: ["Gold"],
    themeTags: ["Spanish", "Flamenco"],
    description:
      "Solo ice dance costume in ruby with gold trim. Has visible wear from competition use.",
    sizeLabel: "L",
    chestMinCm: 90,
    chestMaxCm: 96,
    waistMinCm: 72,
    waistMaxCm: 78,
    hipsMinCm: 96,
    hipsMaxCm: 102,
    lengthCm: 72,
    alterableSmaller: false,
    alterableLarger: false,
    competitionPrice: 3500,
    seasonalPrice: 25000,
    purchasePrice: null,
    securityDeposit: 15000,
    cleaningFee: 3000,
    consignmentCommissionPct: 15,
  },
];

async function main() {
  console.log("[seed-wardrobe] Starting (guards passed)");

  let createdCount = 0;
  let updatedCount = 0;

  for (const fx of FIXTURES) {
    const owner = await prisma.user.findUnique({ where: { email: fx.ownerEmail } });
    if (!owner) {
      console.warn(
        `[seed-wardrobe] SKIP "${fx.title}" — owner ${fx.ownerEmail} not found (run pnpm tsx tests/helpers/seed-test-data.ts first)`,
      );
      continue;
    }

    // Upsert by composite (ownerId, title) — there is no native compound unique
    // on Dress, so we findFirst + update OR create.
    const existing = await prisma.dress.findFirst({
      where: { ownerId: owner.id, title: fx.title },
      select: { id: true },
    });

    const dressData = {
      ownerId: owner.id,
      title: fx.title,
      description: fx.description,
      category: fx.category,
      themeTags: fx.themeTags,
      color: fx.color,
      secondaryColors: fx.secondaryColors,
      condition: fx.condition,
      sizeLabel: fx.sizeLabel,
      chestMinCm: fx.chestMinCm,
      chestMaxCm: fx.chestMaxCm,
      waistMinCm: fx.waistMinCm,
      waistMaxCm: fx.waistMaxCm,
      hipsMinCm: fx.hipsMinCm,
      hipsMaxCm: fx.hipsMaxCm,
      lengthCm: fx.lengthCm,
      alterableSmaller: fx.alterableSmaller,
      alterableLarger: fx.alterableLarger,
      competitionPrice: fx.competitionPrice,
      seasonalPrice: fx.seasonalPrice,
      purchasePrice: fx.purchasePrice,
      securityDeposit: fx.securityDeposit,
      cleaningFee: fx.cleaningFee,
      consignmentCommissionPct: fx.consignmentCommissionPct,
      status: "AVAILABLE" as const,
    };

    const dress = existing
      ? await prisma.dress.update({ where: { id: existing.id }, data: dressData })
      : await prisma.dress.create({ data: dressData });
    if (existing) {
      updatedCount++;
    } else {
      createdCount++;
    }

    // Idempotent image attachment — delete prior images for this dress, then re-add 3.
    // This is the ONLY delete in the script and it is tightly scoped by dressId.
    await prisma.dressImage.deleteMany({ where: { dressId: dress.id } });
    for (let i = 0; i < 3; i++) {
      await prisma.dressImage.create({
        data: {
          dressId: dress.id,
          url: `https://picsum.photos/seed/${dress.id}-${i}/600/800`,
          sortOrder: i,
          isPrimary: i === 0,
        },
      });
    }

    console.log(
      `[seed-wardrobe] ${existing ? "Updated" : "Created"} "${fx.title}" (${fx.category}, pct=${fx.consignmentCommissionPct}) + 3 images`,
    );
  }

  console.log(
    `[seed-wardrobe] Done. Created=${createdCount}, Updated=${updatedCount}, Total fixtures=${FIXTURES.length}`,
  );
}

main()
  .catch((e) => {
    console.error("[seed-wardrobe] FAILED:", e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
