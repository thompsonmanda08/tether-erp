import { getCategories } from "@/app/_actions/categories";
import { requireAdminRole } from "@/lib/admin-guard";
import { CategoriesClient } from "../_components/categories-client";

export const dynamic = "force-dynamic";

type PageProps = {
  params: Promise<{ [key: string]: string }>;
  searchParams: Promise<{ [key: string]: string }>;
};

export default async function CategoriesPage({ searchParams }: PageProps) {
  await requireAdminRole();

  const urlParams = await searchParams;
  const page = urlParams.page ? Number(urlParams.page) : 1;
  const limit = urlParams.limit ? Number(urlParams.limit) : 10;
  const activeOnly = urlParams.active !== "false";

  const categoriesResponse = await getCategories(page, limit, activeOnly);
  const categories =
    categoriesResponse.success &&
    categoriesResponse.data &&
    Array.isArray(categoriesResponse.data.data)
      ? categoriesResponse.data.data
      : [];
  const apiPagination =
    categoriesResponse.success && categoriesResponse.data
      ? categoriesResponse.data.pagination
      : null;

  const pagination = {
    page: apiPagination?.page ?? page,
    page_size: apiPagination?.pageSize ?? limit,
    total: apiPagination?.total ?? 0,
    total_pages: apiPagination?.totalPages ?? 1,
    has_next: apiPagination?.hasNext ?? false,
    has_prev: apiPagination?.hasPrev ?? false,
  };

  return (
    <div className="container mx-auto p-6 px-4">
      <CategoriesClient
        initialCategories={categories}
        pagination={pagination}
      />
    </div>
  );
}
