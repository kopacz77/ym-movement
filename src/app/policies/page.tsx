import type { Metadata } from "next";
import { PoliciesContent } from "./content";

export const metadata: Metadata = {
  title: "Lesson Policies | YM Movement",
  description: "Cancellation, payment, and booking policies for YM Movement skating lessons",
};

export default function PoliciesPage() {
  return <PoliciesContent />;
}
