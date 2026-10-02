import React, { useEffect } from 'react';
import type { PDFTool } from '../registry/tools';

interface MetaTagsProps {
  title: string;
  description: string;
  canonicalUrl?: string;
  tool?: PDFTool;
  faqs?: { question: string; answer: string }[];
}

export const MetaTags: React.FC<MetaTagsProps> = ({
  title,
  description,
  canonicalUrl = window.location.href,
  tool,
  faqs
}) => {
  useEffect(() => {
    document.title = `${title} | PDFCraft`;

    const setMetaTag = (selector: string, attrName: string, attrVal: string, content: string) => {
      let element = document.querySelector(selector);
      if (!element) {
        element = document.createElement('meta');
        element.setAttribute(attrName, attrVal);
        document.head.appendChild(element);
      }
      element.setAttribute('content', content);
    };

    setMetaTag('meta[name="description"]', 'name', 'description', description);
    setMetaTag('meta[property="og:title"]', 'property', 'og:title', title);
    setMetaTag('meta[property="og:description"]', 'property', 'og:description', description);
    setMetaTag('meta[property="og:url"]', 'property', 'og:url', canonicalUrl);
    setMetaTag('meta[property="og:type"]', 'property', 'og:type', 'website');
    setMetaTag('meta[property="og:site_name"]', 'property', 'og:site_name', 'PDFCraft');

    let canonical = document.querySelector('link[rel="canonical"]');
    if (!canonical) {
      canonical = document.createElement('link');
      canonical.setAttribute('rel', 'canonical');
      document.head.appendChild(canonical);
    }
    canonical.setAttribute('href', canonicalUrl);

    const jsonLdData: any = {
      '@context': 'https://schema.org',
      '@graph': [
        {
          '@type': 'WebApplication',
          '@id': canonicalUrl + '#webapp',
          name: title,
          description: description,
          url: canonicalUrl,
          applicationCategory: 'UtilitiesApplication',
          operatingSystem: 'All',
          browserRequirements: 'Requires JavaScript. Requires HTML5.',
          offers: {
            '@type': 'Offer',
            price: '0.00',
            priceCurrency: 'USD'
          }
        },
        {
          '@type': 'BreadcrumbList',
          '@id': canonicalUrl + '#breadcrumb',
          itemListElement: [
            {
              '@type': 'ListItem',
              position: 1,
              name: 'Home',
              item: window.location.origin
            },
            ...(tool
              ? [
                  {
                    '@type': 'ListItem',
                    position: 2,
                    name: tool.categoryName,
                    item: `${window.location.origin}/category/${tool.category}`
                  },
                  {
                    '@type': 'ListItem',
                    position: 3,
                    name: tool.name,
                    item: canonicalUrl
                  }
                ]
              : [])
          ]
        }
      ]
    };

    if (faqs && faqs.length > 0) {
      jsonLdData['@graph'].push({
        '@type': 'FAQPage',
        '@id': canonicalUrl + '#faq',
        mainEntity: faqs.map((faq) => ({
          '@type': 'Question',
          name: faq.question,
          acceptedAnswer: {
            '@type': 'Answer',
            text: faq.answer
          }
        }))
      });
    }

    let scriptTag = document.querySelector('#jsonld-structured-data');
    if (!scriptTag) {
      scriptTag = document.createElement('script');
      scriptTag.id = 'jsonld-structured-data';
      scriptTag.setAttribute('type', 'application/ld+json');
      document.head.appendChild(scriptTag);
    }
    scriptTag.textContent = JSON.stringify(jsonLdData);
  }, [title, description, canonicalUrl, tool, faqs]);

  return null;
};
