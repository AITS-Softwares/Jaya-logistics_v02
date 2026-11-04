import { redirect } from "next/navigation";

export default async function DriverAccessRedirect({ searchParams }) {
  const { create, loadingId } = await searchParams;
  const params = new URLSearchParams({ tab: "drivers" });
  if (create === "1") params.set("create", create);
  if (typeof loadingId === "string" && loadingId) params.set("loadingId", loadingId);
  redirect(`/admin/Driver-Mobile?${params}`);
}
