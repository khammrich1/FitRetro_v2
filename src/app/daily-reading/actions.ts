"use server";

import { revalidatePath } from "next/cache";
import { verifySession, setUserReadingTopics } from "@/features/auth";
import { READING_TOPICS, readingTopicsToString, type ReadingTopicKey } from "@/lib/reading-topics";

function isReadingTopicKey(value: string): value is ReadingTopicKey {
  return (READING_TOPICS as readonly string[]).includes(value);
}

export async function setReadingTopicsAction(formData: FormData): Promise<void> {
  const { userId } = await verifySession();

  const topics = formData
    .getAll("topics")
    .filter((value): value is string => typeof value === "string");
  const validTopics = topics.filter(isReadingTopicKey);

  await setUserReadingTopics(userId, readingTopicsToString(validTopics));

  revalidatePath("/settings/daily-reading");
  revalidatePath("/today");
}
