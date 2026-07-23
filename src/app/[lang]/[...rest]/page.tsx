import { notFound } from "next/navigation";

// Any URL under a valid locale that no real route matches lands here and
// triggers the [lang]/not-found boundary with a proper 404 status. Without
// this segment those paths would fall through to Next's default 404 page.
export default function CatchAll() {
  notFound();
}
