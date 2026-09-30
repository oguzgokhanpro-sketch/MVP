-- CreateTable
CREATE TABLE "companies" (
    "id" UUID NOT NULL,
    "organization_id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "domain" TEXT,
    "mrr" DECIMAL(14,2),
    "arr" DECIMAL(14,2),
    "active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "companies_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "contacts" (
    "id" UUID NOT NULL,
    "organization_id" UUID NOT NULL,
    "company_id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT,
    "phone" TEXT,
    "role" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "contacts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "categories" (
    "id" UUID NOT NULL,
    "organization_id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "is_default" BOOLEAN NOT NULL DEFAULT false,
    "sort_order" INTEGER NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "categories_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "themes" (
    "id" UUID NOT NULL,
    "organization_id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "is_default" BOOLEAN NOT NULL DEFAULT false,
    "sort_order" INTEGER NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "themes_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "companies_organization_id_active_idx" ON "companies"("organization_id", "active");

-- CreateIndex
CREATE INDEX "companies_organization_id_name_idx" ON "companies"("organization_id", "name");

-- CreateIndex
CREATE INDEX "contacts_organization_id_company_id_active_idx" ON "contacts"("organization_id", "company_id", "active");

-- CreateIndex
CREATE INDEX "categories_organization_id_sort_order_idx" ON "categories"("organization_id", "sort_order");

-- CreateIndex
CREATE INDEX "themes_organization_id_sort_order_idx" ON "themes"("organization_id", "sort_order");

-- AddForeignKey
ALTER TABLE "companies" ADD CONSTRAINT "companies_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "contacts" ADD CONSTRAINT "contacts_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "contacts" ADD CONSTRAINT "contacts_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "categories" ADD CONSTRAINT "categories_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "themes" ADD CONSTRAINT "themes_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Name uniqueness within an organization, case-insensitive.
CREATE UNIQUE INDEX "categories_organization_id_lower_name_key" ON "categories" ("organization_id", lower("name"));
CREATE UNIQUE INDEX "themes_organization_id_lower_name_key" ON "themes" ("organization_id", lower("name"));

-- Amounts cannot be negative.
ALTER TABLE "companies" ADD CONSTRAINT "companies_mrr_non_negative" CHECK ("mrr" IS NULL OR "mrr" >= 0);
ALTER TABLE "companies" ADD CONSTRAINT "companies_arr_non_negative" CHECK ("arr" IS NULL OR "arr" >= 0);

-- Default categories and themes for organizations that already exist.
-- Keep in sync with DEFAULT_CATEGORIES / DEFAULT_THEMES in lib/db/defaults.ts.
INSERT INTO "categories" ("id", "organization_id", "name", "is_default", "sort_order", "updated_at")
SELECT gen_random_uuid(), o."id", v."name", true, v."sort_order", CURRENT_TIMESTAMP
FROM "organizations" o
CROSS JOIN (VALUES ('Feature', 0), ('Bug', 1), ('Amélioration', 2), ('Question', 3), ('Autre', 4)) AS v("name", "sort_order");

INSERT INTO "themes" ("id", "organization_id", "name", "is_default", "sort_order", "updated_at")
SELECT gen_random_uuid(), o."id", v."name", true, v."sort_order", CURRENT_TIMESTAMP
FROM "organizations" o
CROSS JOIN (VALUES ('Reporting', 0), ('API', 1), ('Authentification', 2), ('Interface', 3), ('Performance', 4), ('Intégration', 5)) AS v("name", "sort_order");
