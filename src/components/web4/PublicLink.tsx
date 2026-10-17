"use client";

import NextLink from "next/link";
import type { ComponentProps } from "react";

// Informational static hosting uses document navigation: it must not request
// RSC responses from an exhausted dynamic Worker quota. QA keeps Next routing.
export default function PublicLink(props: ComponentProps<typeof NextLink>) {
  if (process.env.NEXT_PUBLIC_VECTOR_STATIC_NAVIGATION !== "true") return <NextLink {...props} />;
  const { href, as: _as, replace: _replace, scroll: _scroll, shallow: _shallow,
    passHref: _passHref, prefetch: _prefetch, locale: _locale,
    onNavigate: _onNavigate, legacyBehavior: _legacyBehavior, ...anchor } = props;
  if (typeof href !== "string") throw new Error("STATIC_PUBLIC_LINK_REQUIRES_STRING_HREF");
  return <a {...anchor} href={href} />;
}
