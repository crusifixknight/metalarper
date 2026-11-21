import FilterSidebar from "@/components/FilterSidebar";
import {
  getFacets,
  parseCatalogFilters,
  type CatalogFacets,
  type CatalogSearchParams,
} from "@/lib/api";

type CatalogFiltersProps = {
  searchParams: Promise<CatalogSearchParams>;
};

/**
 * Server part of the filters: reads parameters from the URL and loads the
 * genre and developer directories. While the API is unavailable, the sidebar
 * shows an explanation instead of the form.
 */
export default async function CatalogFilters({
  searchParams,
}: CatalogFiltersProps) {
  const filters = parseCatalogFilters(await searchParams);

  let facets: CatalogFacets | null = null;

  try {
    facets = await getFacets();
  } catch {
    facets = null;
  }

  return <FilterSidebar filters={filters} facets={facets} />;
}
