import type { Href } from "expo-router";

type RouterLike = {
  back: () => void;
  canGoBack: () => boolean;
  replace: (href: Href) => void;
};

export function goBackOrReplace(router: RouterLike, fallbackHref: Href = "/home") {
  try {
    if (router.canGoBack()) {
      router.back();
      return;
    }
  } catch {
    // Some web-only router surfaces cannot answer canGoBack imperatively.
  }

  router.replace(fallbackHref);
}
