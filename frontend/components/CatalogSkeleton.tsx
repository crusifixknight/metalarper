import { CATALOG_PAGE_SIZE } from "@/lib/api";

export default function CatalogSkeleton() {
  return (
    <div aria-hidden className="animate-pulse">
      <div className="mb-4 h-4 w-64 rounded bg-gray-200" />
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
        {Array.from({ length: CATALOG_PAGE_SIZE }, (_, index) => (
          <div key={index} className="flex flex-col">
            <div className="mb-2 aspect-[2/3] w-full rounded-sm bg-gray-200" />
            <div className="mb-1 h-3.5 w-4/5 rounded bg-gray-200" />
            <div className="h-3 w-1/2 rounded bg-gray-200" />
          </div>
        ))}
      </div>
    </div>
  );
}
