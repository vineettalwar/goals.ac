import { useEffect } from "react";

interface SEOProps {
  title: string;
  description: string;
  ogImage?: string;
}

export function SEO({ title, description, ogImage = "/og-image.png" }: SEOProps) {
  useEffect(() => {
    document.title = title;

    let metaDescription = document.querySelector('meta[name="description"]');
    if (!metaDescription) {
      metaDescription = document.createElement("meta");
      metaDescription.setAttribute("name", "description");
      document.head.appendChild(metaDescription);
    }
    metaDescription.setAttribute("content", description);

    const ogTags: Record<string, string> = {
      "og:title": title,
      "og:description": description,
      "og:image": ogImage,
      "og:type": "website",
      "twitter:card": "summary_large_image",
      "twitter:title": title,
      "twitter:description": description,
      "twitter:image": ogImage,
    };

    for (const [property, content] of Object.entries(ogTags)) {
      const isTwitter = property.startsWith("twitter:");
      const attr = isTwitter ? "name" : "property";
      let tag = document.querySelector(`meta[${attr}="${property}"]`);
      if (!tag) {
        tag = document.createElement("meta");
        tag.setAttribute(attr, property);
        document.head.appendChild(tag);
      }
      tag.setAttribute("content", content);
    }
  }, [title, description, ogImage]);

  return null;
}
