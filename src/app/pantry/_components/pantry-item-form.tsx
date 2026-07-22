"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { useActionState } from "react";
import {
  addPantryItemAction,
  identifyPantryItemFromImageAction,
  type IdentifyPantryItemState,
} from "../actions";

export function PantryItemForm() {
  const [state, action, pending] = useActionState(addPantryItemAction, undefined);
  const [name, setName] = useState("");
  const [quantity, setQuantity] = useState("");
  const [identifyResult, setIdentifyResult] = useState<IdentifyPantryItemState>(undefined);
  const [identifying, startIdentifying] = useTransition();
  const [photoPreviewUrl, setPhotoPreviewUrl] = useState<string | null>(null);
  const photoInputRef = useRef<HTMLInputElement>(null);

  const wasPending = useRef(false);
  useEffect(() => {
    if (wasPending.current && !pending && !state?.errors) {
      setName("");
      setQuantity("");
      setIdentifyResult(undefined);
      clearPhoto();
    }
    wasPending.current = pending;
  }, [pending, state]);

  function clearPhoto() {
    setPhotoPreviewUrl((current) => {
      if (current) URL.revokeObjectURL(current);
      return null;
    });
    if (photoInputRef.current) photoInputRef.current.value = "";
  }

  function handlePhotoSelected(file: File | undefined) {
    if (!file) return;
    setPhotoPreviewUrl((current) => {
      if (current) URL.revokeObjectURL(current);
      return URL.createObjectURL(file);
    });

    startIdentifying(async () => {
      const formData = new FormData();
      formData.append("image", file);
      const result = await identifyPantryItemFromImageAction(formData);
      setIdentifyResult(result);
      if (result && "identification" in result) {
        setName(result.identification.name);
        setQuantity(result.identification.quantity ?? "");
      }
    });
  }

  return (
    <form
      action={action}
      className="flex flex-col gap-3 rounded-lg border border-border bg-card p-4"
    >
      <h2 className="text-sm font-semibold uppercase tracking-wide text-accent">Add pantry item</h2>

      <label className="flex flex-col gap-1 text-sm">
        Item
        <div className="flex gap-2">
          <input
            name="name"
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder="chicken breast"
            className="flex-1 rounded-md border border-border bg-background px-2 py-1 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30"
          />
          <input
            ref={photoInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp,image/gif"
            className="hidden"
            onChange={(event) => handlePhotoSelected(event.target.files?.[0])}
          />
          <button
            type="button"
            onClick={() => photoInputRef.current?.click()}
            title="Scan a photo of the item"
            disabled={identifying}
            className="rounded-md border border-border px-3 py-1 text-sm hover:border-accent hover:text-accent disabled:opacity-50"
          >
            {identifying ? "Scanning..." : "📷 Scan"}
          </button>
        </div>
        {state?.errors?.name && <span className="text-danger">{state.errors.name[0]}</span>}
        {identifyResult && "error" in identifyResult && (
          <span className="text-danger">{identifyResult.error}</span>
        )}
      </label>

      {photoPreviewUrl && (
        <div className="flex items-center gap-3">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={photoPreviewUrl}
            alt="Scanned pantry item"
            className="h-16 w-16 rounded-md border border-border object-cover"
          />
          <button
            type="button"
            onClick={clearPhoto}
            className="text-sm text-muted-foreground hover:text-danger"
          >
            Remove photo
          </button>
        </div>
      )}

      <label className="flex flex-col gap-1 text-sm">
        Quantity (optional)
        <input
          name="quantity"
          value={quantity}
          onChange={(event) => setQuantity(event.target.value)}
          placeholder="2 lbs, 1 can, half a bag..."
          className="rounded-md border border-border bg-background px-2 py-1 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30"
        />
      </label>

      <button
        disabled={pending}
        type="submit"
        className="retro-glow self-start rounded-full bg-primary px-4 py-1.5 text-sm text-primary-foreground hover:bg-primary-hover disabled:opacity-50"
      >
        {pending ? "Adding..." : "Add to pantry"}
      </button>
    </form>
  );
}
