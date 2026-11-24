import { useEffect } from 'react';

interface PageMetaOptions {
  title: string;
  description?: string;
  image?: string;
  jsonLd?: Record<string, unknown> | null;
}

const DEFAULT_DESCRIPTION =
  "Don't buy it. Rent cameras, projectors, formal wear, cycles, and campus essentials from verified classmates on your campus.";

function setMetaTag(attr: 'name' | 'property', key: string, content: string) {
  let el = document.head.querySelector<HTMLMetaElement>(`meta[${attr}="${key}"]`);
  if (!el) {
    el = document.createElement('meta');
    el.setAttribute(attr, key);
    document.head.appendChild(el);
  }
  el.content = content;
}

export function usePageMeta({ title, description = DEFAULT_DESCRIPTION, image, jsonLd }: PageMetaOptions) {
  useEffect(() => {
    document.title = title;
    setMetaTag('name', 'description', description);
    setMetaTag('property', 'og:title', title);
    setMetaTag('property', 'og:description', description);
    setMetaTag('name', 'twitter:title', title);
    setMetaTag('name', 'twitter:description', description);

    if (image) {
      const absolute = image.startsWith('http') ? image : `${window.location.origin}${image}`;
      setMetaTag('property', 'og:image', absolute);
      setMetaTag('name', 'twitter:image', absolute);
    }

    const existingLd = document.getElementById('rentigo-dynamic-jsonld');
    if (jsonLd) {
      const script = existingLd ?? document.createElement('script');
      script.id = 'rentigo-dynamic-jsonld';
      script.setAttribute('type', 'application/ld+json');
      script.textContent = JSON.stringify(jsonLd);
      if (!existingLd) document.head.appendChild(script);
    } else if (existingLd) {
      existingLd.remove();
    }

    return () => {
      document.getElementById('rentigo-dynamic-jsonld')?.remove();
    };
  }, [title, description, image, jsonLd]);
}
