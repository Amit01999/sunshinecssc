import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowDown, ArrowUp, CheckCircle2, Image as ImageIcon, Pencil, Plus, Trash2, UploadCloud, User, X } from "lucide-react";
import { api, getErrorMessage } from "@/lib/api";
import { PageHeader } from "@/components/dashboard/PageHeader";
import { EmptyState } from "@/components/dashboard/EmptyState";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Slider } from "@/components/ui/slider";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";

const PRIMARY = "hsl(208,89%,40%)";

interface HeroSlide {
  imageUrl: string;
  mobileImageUrl?: string;
  heading?: string;
  subheading?: string;
  ctaLabel?: string;
  ctaHref?: string;
  overlayOpacity: number;
  focalPosition: string;
  order: number;
}

interface MessageCard {
  title: string;
  name: string;
  role: string;
  text: string;
  link: string;
  color: string;
  imageUrl?: string;
}

interface MessagesSectionData {
  sectionTitle: string;
  cards: MessageCard[];
}

const FOCAL_POSITIONS = [
  { value: "center", label: "Center" },
  { value: "top", label: "Top" },
  { value: "bottom", label: "Bottom" },
  { value: "left", label: "Left" },
  { value: "right", label: "Right" },
  { value: "left top", label: "Top Left" },
  { value: "right top", label: "Top Right" },
  { value: "left bottom", label: "Bottom Left" },
  { value: "right bottom", label: "Bottom Right" },
];

function SlidePreview({ slide, imagePreviewUrl }: { slide: Partial<HeroSlide>; imagePreviewUrl?: string }) {
  const src = imagePreviewUrl ?? slide.imageUrl;
  return (
    <div className="relative w-full aspect-video rounded-xl overflow-hidden bg-gray-100 border border-gray-200">
      {src ? (
        <img src={src} alt="" className="w-full h-full object-cover" style={{ objectPosition: slide.focalPosition ?? "center" }} />
      ) : (
        <div className="w-full h-full flex items-center justify-center text-gray-300">
          <ImageIcon className="w-8 h-8" />
        </div>
      )}
      {src && <div className="absolute inset-0" style={{ backgroundColor: `rgba(0,0,0,${slide.overlayOpacity ?? 0.1})` }} />}
      {(slide.heading || slide.subheading) && (
        <div className="absolute inset-0 flex items-center px-4">
          <div className="text-white drop-shadow-md max-w-[85%]">
            {slide.heading && <p className="font-bold text-sm md:text-base leading-tight">{slide.heading}</p>}
            {slide.subheading && <p className="text-[11px] md:text-xs text-white/90 mt-1 line-clamp-2">{slide.subheading}</p>}
            {slide.ctaLabel && (
              <span className="inline-block mt-2 px-2.5 py-1 rounded-md text-[10px] font-semibold" style={{ backgroundColor: PRIMARY }}>
                {slide.ctaLabel}
              </span>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

/* ---------------------------------------------------------------------- */
/* Add / Edit dialog                                                      */
/* ---------------------------------------------------------------------- */

function SlideDialog({
  open,
  onOpenChange,
  slide,
  index,
  onSaved,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  slide: HeroSlide | null;
  index: number | null;
  onSaved: () => void;
}) {
  const { toast } = useToast();
  const isEdit = slide !== null && index !== null;

  const [imageFile, setImageFile] = useState<File | null>(null);
  const [mobileImageFile, setMobileImageFile] = useState<File | null>(null);
  const [heading, setHeading] = useState("");
  const [subheading, setSubheading] = useState("");
  const [ctaLabel, setCtaLabel] = useState("");
  const [ctaHref, setCtaHref] = useState("");
  const [overlayOpacity, setOverlayOpacity] = useState(0.1);
  const [focalPosition, setFocalPosition] = useState("center");

  useEffect(() => {
    if (!open) return;
    setImageFile(null);
    setMobileImageFile(null);
    setHeading(slide?.heading ?? "");
    setSubheading(slide?.subheading ?? "");
    setCtaLabel(slide?.ctaLabel ?? "");
    setCtaHref(slide?.ctaHref ?? "");
    setOverlayOpacity(slide?.overlayOpacity ?? 0.1);
    setFocalPosition(slide?.focalPosition ?? "center");
  }, [open, slide]);

  const imagePreviewUrl = useMemo(() => (imageFile ? URL.createObjectURL(imageFile) : undefined), [imageFile]);
  useEffect(() => () => { if (imagePreviewUrl) URL.revokeObjectURL(imagePreviewUrl); }, [imagePreviewUrl]);

  const save = useMutation({
    mutationFn: async () => {
      const fields = {
        heading: heading || undefined,
        subheading: subheading || undefined,
        ctaLabel: ctaLabel || undefined,
        ctaHref: ctaHref || undefined,
        overlayOpacity,
        focalPosition,
      };

      if (!isEdit) {
        const form = new FormData();
        if (imageFile) form.append("image", imageFile);
        Object.entries(fields).forEach(([k, v]) => v !== undefined && form.append(k, String(v)));
        await api.post("/cms/homepage/draft/slides", form);
        return;
      }

      if (imageFile) {
        const form = new FormData();
        form.append("image", imageFile);
        await api.post(`/cms/homepage/draft/slides/${index}/image`, form);
      }
      if (mobileImageFile) {
        const form = new FormData();
        form.append("image", mobileImageFile);
        form.append("target", "mobile");
        await api.post(`/cms/homepage/draft/slides/${index}/image`, form);
      }
      await api.patch(`/cms/homepage/draft/slides/${index}`, fields);
    },
    onSuccess: () => {
      toast({ title: isEdit ? "Slide updated" : "Slide added to draft" });
      onOpenChange(false);
      onSaved();
    },
    onError: (err) => toast({ title: "Could not save slide", description: getErrorMessage(err), variant: "destructive" }),
  });

  const canSave = isEdit ? true : Boolean(imageFile);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[88vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Edit Hero Slide" : "Add Hero Slide"}</DialogTitle>
        </DialogHeader>

        <div className="grid md:grid-cols-2 gap-5">
          <div className="space-y-4">
            <SlidePreview
              slide={{ heading, subheading, ctaLabel, overlayOpacity, focalPosition, imageUrl: slide?.imageUrl }}
              imagePreviewUrl={imagePreviewUrl}
            />
            <div>
              <Label className="text-xs">{isEdit ? "Replace desktop image (optional)" : "Hero image"}</Label>
              <label className="mt-1 flex items-center justify-center gap-2 w-full py-2.5 rounded-lg border-2 border-dashed border-gray-200 text-xs text-gray-500 cursor-pointer hover:border-gray-300 hover:bg-gray-50 transition-colors">
                <UploadCloud className="w-3.5 h-3.5" />
                {imageFile ? imageFile.name : "Choose an image…"}
                <input type="file" accept="image/*" className="hidden" onChange={(e) => setImageFile(e.target.files?.[0] ?? null)} />
              </label>
            </div>
            {isEdit && (
              <div>
                <Label className="text-xs">Replace mobile image (optional)</Label>
                <label className="mt-1 flex items-center justify-center gap-2 w-full py-2.5 rounded-lg border-2 border-dashed border-gray-200 text-xs text-gray-500 cursor-pointer hover:border-gray-300 hover:bg-gray-50 transition-colors">
                  <UploadCloud className="w-3.5 h-3.5" />
                  {mobileImageFile ? mobileImageFile.name : slide?.mobileImageUrl ? "Change mobile image…" : "Optional, used on small screens"}
                  <input type="file" accept="image/*" className="hidden" onChange={(e) => setMobileImageFile(e.target.files?.[0] ?? null)} />
                </label>
              </div>
            )}
          </div>

          <div className="space-y-3">
            <div>
              <Label htmlFor="hero-heading">Heading (optional)</Label>
              <Input id="hero-heading" placeholder="e.g. Welcome to Sunshine CSSC" value={heading} onChange={(e) => setHeading(e.target.value)} />
            </div>
            <div>
              <Label htmlFor="hero-subheading">Subheading (optional)</Label>
              <Input id="hero-subheading" placeholder="A short supporting line" value={subheading} onChange={(e) => setSubheading(e.target.value)} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label htmlFor="hero-cta-label">Button text (optional)</Label>
                <Input id="hero-cta-label" placeholder="e.g. Apply Now" value={ctaLabel} onChange={(e) => setCtaLabel(e.target.value)} />
              </div>
              <div>
                <Label htmlFor="hero-cta-href">Button link</Label>
                <Input id="hero-cta-href" placeholder="/admissions" value={ctaHref} onChange={(e) => setCtaHref(e.target.value)} />
              </div>
            </div>
            <div>
              <Label>Image focus point</Label>
              <Select value={focalPosition} onValueChange={setFocalPosition}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {FOCAL_POSITIONS.map((f) => <SelectItem key={f.value} value={f.value}>{f.label}</SelectItem>)}
                </SelectContent>
              </Select>
              <p className="text-xs text-gray-400 mt-1">Keeps the important part of the photo visible when it's cropped to fit the banner.</p>
            </div>
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <Label>Dark overlay</Label>
                <span className="text-xs text-gray-400">{Math.round(overlayOpacity * 100)}%</span>
              </div>
              <Slider value={[overlayOpacity]} onValueChange={([v]) => setOverlayOpacity(v)} min={0} max={0.7} step={0.05} />
              <p className="text-xs text-gray-400 mt-1">A subtle dark layer over the photo so white text stays readable.</p>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={save.isPending}>
            Cancel
          </Button>
          <Button onClick={() => save.mutate()} disabled={!canSave || save.isPending}>
            {save.isPending ? "Saving…" : isEdit ? "Save Changes" : "Add Slide"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/* ---------------------------------------------------------------------- */
/* Leadership message card editor                                         */
/* ---------------------------------------------------------------------- */

function MessageCardEditor({ card, index, onChanged }: { card: MessageCard; index: number; onChanged: () => void }) {
  const { toast } = useToast();
  const [title, setTitle] = useState(card.title);
  const [name, setName] = useState(card.name);
  const [role, setRole] = useState(card.role);
  const [text, setText] = useState(card.text);

  useEffect(() => {
    setTitle(card.title);
    setName(card.name);
    setRole(card.role);
    setText(card.text);
  }, [card]);

  const isDirty = title !== card.title || name !== card.name || role !== card.role || text !== card.text;

  const saveText = useMutation({
    mutationFn: async () => api.patch(`/cms/homepage/draft/messages-section/cards/${index}`, { title, name, role, text }),
    onSuccess: () => {
      toast({ title: "Card updated" });
      onChanged();
    },
    onError: (err) => toast({ title: "Could not save card", description: getErrorMessage(err), variant: "destructive" }),
  });

  const uploadImage = useMutation({
    mutationFn: async (file: File) => {
      const form = new FormData();
      form.append("image", file);
      await api.post(`/cms/homepage/draft/messages-section/cards/${index}/image`, form);
    },
    onSuccess: () => {
      toast({ title: "Photo updated" });
      onChanged();
    },
    onError: (err) => toast({ title: "Could not upload photo", description: getErrorMessage(err), variant: "destructive" }),
  });

  const removeImage = useMutation({
    mutationFn: async () => api.delete(`/cms/homepage/draft/messages-section/cards/${index}/image`),
    onSuccess: () => {
      toast({ title: "Photo removed" });
      onChanged();
    },
    onError: (err) => toast({ title: "Could not remove photo", description: getErrorMessage(err), variant: "destructive" }),
  });

  return (
    <Card className="overflow-hidden">
      <CardContent className="p-4 space-y-3">
        <div className="flex items-center gap-3">
          <div className="relative w-16 h-16 rounded-full overflow-hidden shrink-0 border border-gray-200 bg-gray-50 flex items-center justify-center">
            {card.imageUrl ? (
              <img src={card.imageUrl} alt="" className="w-full h-full object-cover object-top" />
            ) : (
              <User className="w-6 h-6 text-gray-300" />
            )}
          </div>
          <div className="flex items-center gap-1.5">
            <label className="inline-flex">
              <Button size="sm" variant="outline" className="h-8 cursor-pointer" disabled={uploadImage.isPending} asChild>
                <span>
                  <UploadCloud className="w-3.5 h-3.5 mr-1.5" />
                  {card.imageUrl ? "Replace Photo" : "Add Photo"}
                </span>
              </Button>
              <input
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) uploadImage.mutate(file);
                  e.target.value = "";
                }}
              />
            </label>
            {card.imageUrl && (
              <Button size="sm" variant="ghost" className="h-8 px-2" onClick={() => removeImage.mutate()} disabled={removeImage.isPending}>
                <X className="w-3.5 h-3.5 text-red-500" />
              </Button>
            )}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2">
          <div>
            <Label className="text-xs">Full name</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} />
          </div>
          <div>
            <Label className="text-xs">Role / title</Label>
            <Input value={role} onChange={(e) => setRole(e.target.value)} />
          </div>
        </div>
        <div>
          <Label className="text-xs">Card heading</Label>
          <Input placeholder="e.g. Founder & Chairman's Message" value={title} onChange={(e) => setTitle(e.target.value)} />
        </div>
        <div>
          <Label className="text-xs">Message text</Label>
          <Textarea rows={4} value={text} onChange={(e) => setText(e.target.value)} />
        </div>
        <Button size="sm" className="w-full" onClick={() => saveText.mutate()} disabled={!isDirty || saveText.isPending}>
          {saveText.isPending ? "Saving…" : "Save Card"}
        </Button>
      </CardContent>
    </Card>
  );
}

/* ---------------------------------------------------------------------- */
/* Main page                                                               */
/* ---------------------------------------------------------------------- */

function buildSwapOrder(total: number, i: number, j: number): number[] {
  const order = Array.from({ length: total }, (_, k) => k);
  [order[i], order[j]] = [order[j], order[i]];
  return order;
}

interface HomepageContent {
  heroSlides: HeroSlide[];
  messagesSection: MessagesSectionData;
}

const BLANK_CARD: MessageCard = { title: "", name: "", role: "", text: "", link: "", color: "#3C76A6" };

export default function Homepage() {
  const { toast } = useToast();
  const qc = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [deleteIndex, setDeleteIndex] = useState<number | null>(null);
  const [sectionTitle, setSectionTitle] = useState("");

  const { data, isLoading } = useQuery({
    queryKey: ["homepage-settings"],
    queryFn: async () => (await api.get("/cms/homepage")).data.data as { draft: HomepageContent; published: HomepageContent },
  });

  useEffect(() => {
    if (data) setSectionTitle(data.draft.messagesSection?.sectionTitle ?? "");
  }, [data?.draft.messagesSection?.sectionTitle]);

  const refresh = () => qc.invalidateQueries({ queryKey: ["homepage-settings"] });

  const removeSlide = useMutation({
    mutationFn: async (index: number) => api.delete(`/cms/homepage/draft/slides/${index}`),
    onSuccess: () => {
      toast({ title: "Slide removed from draft" });
      refresh();
    },
    onError: (err) => toast({ title: "Could not remove slide", description: getErrorMessage(err), variant: "destructive" }),
  });

  const reorder = useMutation({
    mutationFn: async (order: number[]) => api.post("/cms/homepage/draft/slides/reorder", { order }),
    onSuccess: refresh,
    onError: (err) => toast({ title: "Could not reorder", description: getErrorMessage(err), variant: "destructive" }),
  });

  const publish = useMutation({
    mutationFn: async () => api.post("/cms/homepage/publish"),
    onSuccess: () => {
      toast({ title: "Published — now live on the public homepage" });
      refresh();
    },
    onError: (err) => toast({ title: "Could not publish", description: getErrorMessage(err), variant: "destructive" }),
  });

  const discard = useMutation({
    mutationFn: async () => api.post("/cms/homepage/discard-draft"),
    onSuccess: () => {
      toast({ title: "Draft reset to match the published version" });
      refresh();
    },
  });

  const saveSectionTitle = useMutation({
    mutationFn: async () => api.patch("/cms/homepage/draft/messages-section", { sectionTitle }),
    onSuccess: () => {
      toast({ title: "Section title updated" });
      refresh();
    },
    onError: (err) => toast({ title: "Could not save title", description: getErrorMessage(err), variant: "destructive" }),
  });

  const draftSlides = data?.draft.heroSlides ?? [];
  const publishedSlides = data?.published.heroSlides ?? [];
  const isDirty = JSON.stringify(data?.draft) !== JSON.stringify(data?.published);
  const draftCards = data?.draft.messagesSection?.cards ?? [];
  const cardsForDisplay = Array.from({ length: 3 }, (_, i) => draftCards[i] ?? BLANK_CARD);
  const publishedSectionTitle = data?.published.messagesSection?.sectionTitle;
  const publishedCards = data?.published.messagesSection?.cards ?? [];

  if (isLoading) {
    return (
      <div>
        <PageHeader title="Homepage Editor" description="Manage the hero banner and leadership messages on the public homepage." />
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="aspect-video rounded-xl" />)}
        </div>
      </div>
    );
  }

  return (
    <div>
      <PageHeader
        title="Homepage Editor"
        description="Manage the hero banner and leadership messages on the public homepage."
        actions={
          <>
            <Button variant="outline" onClick={() => discard.mutate()} disabled={!isDirty || discard.isPending}>
              Discard Draft
            </Button>
            <Button onClick={() => publish.mutate()} disabled={!isDirty || publish.isPending}>
              {publish.isPending ? "Publishing…" : "Publish"}
            </Button>
          </>
        }
      />

      <div
        className={`flex items-center gap-2 text-sm rounded-lg px-4 py-2.5 mb-5 ${
          isDirty ? "bg-amber-50 text-amber-700 border border-amber-200" : "bg-emerald-50 text-emerald-700 border border-emerald-200"
        }`}
      >
        <CheckCircle2 className="w-4 h-4 shrink-0" />
        {isDirty ? "You have unpublished changes — click Publish to make them live." : "Everything here matches what's live on the public site."}
      </div>

      <h2 className="text-base font-semibold text-gray-800 mb-1">Hero Banner</h2>
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold text-gray-700">Draft Slides ({draftSlides.length})</h3>
      </div>

      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-10">
        {draftSlides.map((slide, i) => (
          <Card key={i} className="overflow-hidden">
            <div className="relative">
              <SlidePreview slide={slide} />
              <Badge className="absolute top-2 left-2 text-[10px]">#{i + 1}</Badge>
            </div>
            <CardContent className="p-3 space-y-2">
              <p className="text-sm font-medium text-gray-800 truncate">{slide.heading || "(no heading)"}</p>
              <p className="text-xs text-gray-400 truncate">{slide.subheading || "No subheading"}</p>
              <div className="flex items-center gap-1 pt-1">
                <Button size="sm" variant="outline" className="h-7 px-2 text-xs" onClick={() => { setEditingIndex(i); setDialogOpen(true); }}>
                  <Pencil className="w-3 h-3 mr-1" /> Edit
                </Button>
                <Button size="sm" variant="ghost" className="h-7 w-7 p-0" disabled={i === 0} onClick={() => reorder.mutate(buildSwapOrder(draftSlides.length, i, i - 1))}>
                  <ArrowUp className="w-3.5 h-3.5" />
                </Button>
                <Button size="sm" variant="ghost" className="h-7 w-7 p-0" disabled={i === draftSlides.length - 1} onClick={() => reorder.mutate(buildSwapOrder(draftSlides.length, i, i + 1))}>
                  <ArrowDown className="w-3.5 h-3.5" />
                </Button>
                <Button size="sm" variant="ghost" className="h-7 w-7 p-0 ml-auto" onClick={() => setDeleteIndex(i)}>
                  <Trash2 className="w-3.5 h-3.5 text-red-500" />
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}

        <button
          onClick={() => { setEditingIndex(null); setDialogOpen(true); }}
          className="aspect-video rounded-xl border-2 border-dashed border-gray-200 flex flex-col items-center justify-center gap-2 text-gray-400 hover:border-gray-300 hover:text-gray-500 hover:bg-gray-50 transition-colors"
        >
          <Plus className="w-6 h-6" />
          <span className="text-sm font-medium">Add Slide</span>
        </button>
      </div>

      {draftSlides.length === 0 && (
        <EmptyState icon={ImageIcon} title="No draft slides yet" description="Add a slide above — the public site keeps showing its default images until you publish." />
      )}

      <div className="border-t pt-6">
        <h3 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
          Currently Live <Badge variant="outline" className="font-normal">read-only</Badge>
        </h3>
        {publishedSlides.length ? (
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {publishedSlides.map((slide, i) => (
              <div key={i} className="relative opacity-90">
                <SlidePreview slide={slide} />
                <Badge variant="outline" className="absolute top-2 left-2 text-[10px] bg-white/90">#{i + 1}</Badge>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-gray-400">Nothing published yet — the public homepage is showing its default built-in images.</p>
        )}
      </div>

      <div className="border-t pt-6 mt-10">
        <h2 className="text-base font-semibold text-gray-800 mb-1">Leadership Messages</h2>
        <p className="text-sm text-gray-400 mb-4">The three message cards shown below the hero banner on the public homepage.</p>

        <div className="max-w-md mb-5">
          <Label className="text-xs">Section title</Label>
          <div className="flex items-center gap-2 mt-1">
            <Input value={sectionTitle} onChange={(e) => setSectionTitle(e.target.value)} />
            <Button
              size="sm"
              onClick={() => saveSectionTitle.mutate()}
              disabled={saveSectionTitle.isPending || sectionTitle === (data?.draft.messagesSection?.sectionTitle ?? "")}
            >
              Save
            </Button>
          </div>
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
          {cardsForDisplay.map((card, i) => (
            <MessageCardEditor key={i} card={card} index={i} onChanged={refresh} />
          ))}
        </div>

        <h3 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
          Currently Live <Badge variant="outline" className="font-normal">read-only</Badge>
        </h3>
        {publishedCards.length ? (
          <div>
            <p className="text-sm font-medium text-gray-700 mb-3">{publishedSectionTitle}</p>
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {publishedCards.map((card, i) => (
                <div key={i} className="rounded-xl border border-gray-200 p-3 opacity-90 flex items-center gap-3">
                  <div className="w-12 h-12 rounded-full overflow-hidden shrink-0 border border-gray-200 bg-gray-50 flex items-center justify-center">
                    {card.imageUrl ? <img src={card.imageUrl} alt="" className="w-full h-full object-cover object-top" /> : <User className="w-5 h-5 text-gray-300" />}
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-gray-800 truncate">{card.name || "(no name)"}</p>
                    <p className="text-xs text-gray-400 truncate">{card.role || "No role"}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <p className="text-sm text-gray-400">Nothing published yet — the public homepage is showing its default built-in messages.</p>
        )}
      </div>

      <SlideDialog
        open={dialogOpen}
        onOpenChange={(v) => { setDialogOpen(v); if (!v) setEditingIndex(null); }}
        slide={editingIndex !== null ? draftSlides[editingIndex] : null}
        index={editingIndex}
        onSaved={refresh}
      />

      <AlertDialog open={deleteIndex !== null} onOpenChange={(v) => !v && setDeleteIndex(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove this slide?</AlertDialogTitle>
            <AlertDialogDescription>
              This deletes the image permanently and removes it from the draft. It won't affect the published site until you publish — but this
              removal itself cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (deleteIndex !== null) removeSlide.mutate(deleteIndex);
                setDeleteIndex(null);
              }}
            >
              Remove Slide
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
