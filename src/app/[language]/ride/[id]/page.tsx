import type { Metadata } from "next";
import { getServerTranslation } from "@/services/i18n";
import RideDetailPageContent from "./page-content";

type Props = {
  params: Promise<{ language: string; id: string }>;
};

export async function generateMetadata(props: Props): Promise<Metadata> {
  const params = await props.params;
  const { t } = await getServerTranslation(params.language, "ride-detail");

  return {
    title: t("title"),
  };
}

export default function RideDetailPage() {
  return <RideDetailPageContent />;
}
