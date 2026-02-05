import { useEffect } from "react";

interface SEOProps {
  title?: string;
  description?: string;
  keywords?: string;
  ogImage?: string;
  ogType?: string;
  canonical?: string;
}

const SEO = ({
  title,
  description,
  keywords,
  ogImage,
  ogType = "website",
  canonical,
}: SEOProps) => {
  const siteName = "MKARIM SOLUTION";
  const fullTitle = title ? `${title} | ${siteName}` : `${siteName} – PC & Gaming au Maroc`;

  useEffect(() => {
    // Update Title
    document.title = fullTitle;

    // Update Meta Description
    const metaDescription = document.querySelector('meta[name="description"]');
    if (metaDescription) {
      metaDescription.setAttribute("content", description || "MKARIM SOLUTION - Votre partenaire pour les PC, accessoires gaming et solutions IT au Maroc.");
    }

    // Update Meta Keywords
    const metaKeywords = document.querySelector('meta[name="keywords"]');
    if (metaKeywords) {
      metaKeywords.setAttribute("content", keywords || "PC Gamer Maroc, Gaming PC, PC portable Maroc, accessoires gaming, MKARIM SOLUTION");
    }

    // Update Open Graph Tags
    const ogTitle = document.querySelector('meta[property="og:title"]');
    if (ogTitle) ogTitle.setAttribute("content", fullTitle);

    const ogDesc = document.querySelector('meta[property="og:description"]');
    if (ogDesc) ogDesc.setAttribute("content", description || "PC haute performance & accessoires gaming au Maroc.");

    const ogT = document.querySelector('meta[property="og:type"]');
    if (ogT) ogT.setAttribute("content", ogType);

    if (ogImage) {
      const ogImg = document.querySelector('meta[property="og:image"]');
      if (ogImg) ogImg.setAttribute("content", ogImage);
    }

    // Update Canonical
    if (canonical) {
      const linkCanonical = document.querySelector('link[rel="canonical"]');
      if (linkCanonical) linkCanonical.setAttribute("href", canonical);
    }
  }, [fullTitle, description, keywords, ogImage, ogType, canonical]);

  return null;
};

export default SEO;
