/** Conservative structural guard; punctuation cannot prove semantic completeness. */
export function isCompleteArticle(title, body) {
  if (typeof title !== "string" || typeof body !== "string" || !title.trim()) return false;
  const words = body.trim().split(/\s+/).filter(Boolean).length;
  return (
    words >= 600 &&
    words <= 1800 &&
    /[.!?][\s\u201d\u2019"')\]]*$/.test(body) &&
    !/(?:\.{3}|…)[\s\u201d\u2019"')\]]*$/.test(body)
  );
}
