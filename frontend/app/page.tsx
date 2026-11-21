import { Suspense } from "react";

import CatalogFilters from "@/components/CatalogFilters";
import CatalogResults from "@/components/CatalogResults";
import CatalogSearch, {
  CatalogSearchSkeleton,
} from "@/components/CatalogSearch";
import CatalogSkeleton from "@/components/CatalogSkeleton";
import { FilterSidebarSkeleton } from "@/components/FilterSidebar";
import type { CatalogSearchParams } from "@/lib/api";

type CatalogPageProps = {
  searchParams: Promise<CatalogSearchParams>;
};

export default function CatalogPage({ searchParams }: CatalogPageProps) {
  return (
    <div className="w-full max-w-7xl mx-auto p-4 font-sans text-sm">
      {/* Heading and search */}
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <h2 className="text-lg font-bold">Каталог игр</h2>
        <Suspense fallback={<CatalogSearchSkeleton />}>
          <CatalogSearch searchParams={searchParams} />
        </Suspense>
      </div>

      {/* Main layout: game grid on the left, filters on the right */}
      <div className="flex flex-col lg:flex-row gap-6">
        {/* Left side - game grid */}
        <div className="flex-1 min-w-0">
          <Suspense fallback={<CatalogSkeleton />}>
            <CatalogResults searchParams={searchParams} />
          </Suspense>
        </div>

        {/* Right side - filters */}
        <aside className="w-full lg:w-64 flex-shrink-0">
          <Suspense fallback={<FilterSidebarSkeleton />}>
            <CatalogFilters searchParams={searchParams} />
          </Suspense>
        </aside>
      </div>
    </div>
  );
}
