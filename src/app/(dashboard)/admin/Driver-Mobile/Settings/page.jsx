import { redirect } from "next/navigation";

export default function DriverSettingsRedirect() {
  redirect("/admin/Driver-Mobile?tab=settings");
}
