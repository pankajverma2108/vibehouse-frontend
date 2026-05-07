import { notFound, permanentRedirect } from "next/navigation";

type PolicyPageProps = {
  params: Promise<{ type: string }>;
};

const legacyPolicyAnchorMap: Record<string, string> = {
  guest: "general-policy",
  privacy: "privacy-policy",
  refund: "cancellation-refund-policy",
  terms: "terms-liability-governing-law",
};

export function generateStaticParams() {
  return Object.keys(legacyPolicyAnchorMap).map((type) => ({ type }));
}

export default async function PolicyPage({ params }: PolicyPageProps) {
  const { type } = await params;
  const anchor = legacyPolicyAnchorMap[type];

  if (!anchor) {
    notFound();
  }

  permanentRedirect(`/policies#${anchor}`);
}
