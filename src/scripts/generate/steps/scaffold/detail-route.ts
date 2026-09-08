import { join } from "node:path";

import { pascalCase } from "./utils/names.ts";

const BASE_ROUTE_SEGMENTS = new Set(["api", "admin"]);

function camelCase(value: string): string {
  const pascal = pascalCase(value);
  return pascal.charAt(0).toLowerCase() + pascal.slice(1);
}

export function detailRoutePath(routePattern: string): string {
  const segments = routePattern.replace(/^\/+/, "").split("/");
  const staticSegments = segments.filter((segment) => !segment.startsWith(":"));
  return join("src/app/(frontend)", ...staticSegments, "[slug]", "page.tsx");
}

export function assertNoBaseRouteCollision(routePattern: string): void {
  const first = routePattern.replace(/^\/+/, "").split("/")[0];
  if (first !== undefined && BASE_ROUTE_SEGMENTS.has(first)) {
    throw new Error(
      `collection route pattern "${routePattern}" shadows the generated shell route "/${first}"; `
        + `rename the collection key so its detail route gets a free segment`,
    );
  }
}

export function emitDetailWrapper(opts: {
  collectionKey: string;
  collectionSlug: string;
  pageBinding: {
    slugField: string;
    meta: { title?: string | undefined; description?: string | undefined; ogImage?: string | undefined };
  };
  template: { sectionId: string; itemFields: string[] }[];
}): string {
  const imports = opts.template
    .map(
      (binding) =>
        `import ${pascalCase(binding.sectionId)} from "@/detail/${opts.collectionKey}/sections/${pascalCase(binding.sectionId)}";`,
    )
    .join("\n");

  const propsConsts = opts.template
    .map((binding) => {
      const varName = camelCase(binding.sectionId);
      return (
        `  const ${varName}Fields = collectionFields.filter((field) => (${JSON.stringify(binding.itemFields)} as string[]).includes(field.name));\n`
        + `  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- normalized props are checked at runtime, not against the component's static prop type\n`
        + `  const ${varName}Props: any = normalizeRecord(${varName}Fields, doc as unknown as Record<string, unknown>, ctx);`
      );
    })
    .join("\n");
  const sections = opts.template
    .map((binding) => `      <${pascalCase(binding.sectionId)} {...${camelCase(binding.sectionId)}Props} />`)
    .join("\n");

  const meta = opts.pageBinding.meta;
  const metaLine = (key: "title" | "description") =>
    meta[key] !== undefined ? `    ${key}: item?.[${JSON.stringify(meta[key])}] as string | undefined,` : "";
  const ogLine =
    meta.ogImage !== undefined ?
      `    openGraph: { images: item?.[${JSON.stringify(meta.ogImage)}] ? [String(item[${JSON.stringify(meta.ogImage)}])] : [] },`
    : "";
  const slugFieldKey = JSON.stringify(opts.pageBinding.slugField);

  return `import config from "@payload-config";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getPayload } from "payload";
import React from "react";

import { collectionFieldTypes } from "@/lib/collection-field-types";
import { normalizeRecord } from "@/lib/normalize-values";
import { normalizeCtx as ctx } from "@/lib/normalize-ctx";

${imports}

interface Args {
  params: Promise<{ slug: string }>;
}

async function loadDoc(slug: string) {
  const payload = await getPayload({ config });
  const result = await payload.find({
    collection: ${JSON.stringify(opts.collectionSlug)},
    where: { [${slugFieldKey}]: { equals: slug } },
    depth: 2,
    limit: 1,
  });
  return result.docs[0];
}

export async function generateStaticParams(): Promise<{ slug: string }[]> {
  const payload = await getPayload({ config });
  const result = await payload.find({
    collection: ${JSON.stringify(opts.collectionSlug)},
    limit: 1000,
    pagination: false,
  });
  return result.docs.map((entry) => ({ slug: String(entry[${slugFieldKey}]) }));
}

export async function generateMetadata({ params }: Args): Promise<Metadata> {
  const { slug } = await params;
  const item = await loadDoc(slug);
  return {
${[metaLine("title"), metaLine("description"), ogLine].filter(Boolean).join("\n")}
  };
}

export default async function DetailPage({ params }: Args) {
  const { slug } = await params;
  const doc = await loadDoc(slug);
  if (!doc) notFound();

  const collectionFields = collectionFieldTypes[${JSON.stringify(opts.collectionSlug)}] ?? [];
${propsConsts}

  return (
    <main>
${sections}
    </main>
  );
}
`;
}
