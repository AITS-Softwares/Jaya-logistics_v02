import DriverMobileTabs from "./DriverMobileTabs";

export default async function DriverMobilePage({ searchParams }) {
  const { tab, create, loadingId } = await searchParams;
  return <DriverMobileTabs requestedTab={tab} openCreate={create === "1"} loadingId={typeof loadingId === "string" ? loadingId : ""} />;
}
