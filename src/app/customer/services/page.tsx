import { Metadata } from "next";
import CustomerServicesClient from "./ServicesClient";

export const metadata: Metadata = {
  title: "Live Server | Customer Portal",
  description: "Explore FTP, Live TV, and other services provided by your ISP",
};

export default function CustomerServicesPage() {
  return <CustomerServicesClient />;
}
