import { useEffect } from "react";

export const usePageMeta = ({ title, description, ogImage, ogUrl }) => {
  useEffect(() => {
    // Update title
    if (title) {
      document.title = title;
      const titleTag = document.querySelector('meta[property="og:title"]');
      if (titleTag) {
        titleTag.setAttribute('content', title);
      } else {
        const newTitleTag = document.createElement('meta');
        newTitleTag.setAttribute('property', 'og:title');
        newTitleTag.setAttribute('content', title);
        document.head.appendChild(newTitleTag);
      }
    }

    // Update description
    if (description) {
      const metaDescription = document.querySelector('meta[name="description"]');
      if (metaDescription) {
        metaDescription.setAttribute('content', description);
      } else {
        const newMetaDescription = document.createElement('meta');
        newMetaDescription.setAttribute('name', 'description');
        newMetaDescription.setAttribute('content', description);
        document.head.appendChild(newMetaDescription);
      }

      const ogDescription = document.querySelector('meta[property="og:description"]');
      if (ogDescription) {
        ogDescription.setAttribute('content', description);
      } else {
        const newOgDescription = document.createElement('meta');
        newOgDescription.setAttribute('property', 'og:description');
        newOgDescription.setAttribute('content', description);
        document.head.appendChild(newOgDescription);
      }
    }

    // Update og:image
    if (ogImage) {
      const ogImageTag = document.querySelector('meta[property="og:image"]');
      if (ogImageTag) {
        ogImageTag.setAttribute('content', ogImage);
      } else {
        const newOgImageTag = document.createElement('meta');
        newOgImageTag.setAttribute('property', 'og:image');
        newOgImageTag.setAttribute('content', ogImage);
        document.head.appendChild(newOgImageTag);
      }
    }

    // Update og:url
    if (ogUrl) {
      const ogUrlTag = document.querySelector('meta[property="og:url"]');
      if (ogUrlTag) {
        ogUrlTag.setAttribute('content', ogUrl);
      } else {
        const newOgUrlTag = document.createElement('meta');
        newOgUrlTag.setAttribute('property', 'og:url');
        newOgUrlTag.setAttribute('content', ogUrl);
        document.head.appendChild(newOgUrlTag);
      }
    }
  }, [title, description, ogImage, ogUrl]);
};