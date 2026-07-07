import { Metadata } from "next";
import AdminServicesClient from "./ServicesClient";

export const metadata: Metadata = {
  title: "Service Links | Admin",
  description: "Manage FTP, Live TV, App Download and other service links for customers",
};

export default function AdminServicesPage() {
  return <AdminServicesClient />;
}
