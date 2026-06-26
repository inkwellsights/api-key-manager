"use server";
import { revalidatePath } from "next/cache";
import { supabaseAdmin } from "@/lib/supabase-admin";
import type { Application } from "@/lib/types";

export async function listApplications(): Promise<Application[]> {
  const { data, error } = await supabaseAdmin
    .from("applications")
    .select("*")
    .order("created_at", { ascending: true });
  if (error) throw new Error(error.message);
  return (data ?? []) as Application[];
}

export async function createApplication(input: { name: string; url?: string }): Promise<Application> {
  const { data, error } = await supabaseAdmin
    .from("applications")
    .insert({ name: input.name, url: input.url ?? null })
    .select("*")
    .single();
  if (error) throw new Error(error.message);
  revalidatePath("/");
  return data as Application;
}

export async function deleteApplication(id: string): Promise<void> {
  const { error } = await supabaseAdmin
    .from("applications")
    .delete()
    .eq("id", id);
  if (error) throw new Error(error.message);
  revalidatePath("/");
}
