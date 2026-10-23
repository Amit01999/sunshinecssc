import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Image as ImageIcon, Trash2, Star } from "lucide-react";
import { api, getErrorMessage } from "@/lib/api";
import { PageHeader } from "@/components/dashboard/PageHeader";
import { EmptyState } from "@/components/dashboard/EmptyState";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";

export default function Gallery() {
  const { toast } = useToast();
  const qc = useQueryClient();
  const [files, setFiles] = useState<FileList | null>(null);

  const { data: images, isLoading } = useQuery({
    queryKey: ["admin-gallery-images"],
    queryFn: async () => (await api.get("/gallery/images")).data.data,
  });

  const upload = useMutation({
    mutationFn: async () => {
      const form = new FormData();
      Array.from(files ?? []).forEach((f) => form.append("images", f));
      await api.post("/gallery/images", form);
    },
    onSuccess: () => {
      toast({ title: "Images uploaded" });
      setFiles(null);
      qc.invalidateQueries({ queryKey: ["admin-gallery-images"] });
    },
    onError: (err) => toast({ title: "Upload failed", description: getErrorMessage(err), variant: "destructive" }),
  });

  const toggleFeatured = useMutation({
    mutationFn: async ({ id, isFeatured }: { id: string; isFeatured: boolean }) => api.patch(`/gallery/images/${id}`, { isFeatured }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin-gallery-images"] }),
  });

  const remove = useMutation({
    mutationFn: async (id: string) => api.delete(`/gallery/images/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin-gallery-images"] }),
  });

  return (
    <div>
      <PageHeader title="Gallery" description="Upload and manage photos shown on the public gallery page." />

      <Card className="mb-6">
        <CardContent className="p-4 flex items-center gap-3">
          <input type="file" multiple accept="image/*" onChange={(e) => setFiles(e.target.files)} className="text-sm" />
          <Button onClick={() => upload.mutate()} disabled={!files?.length || upload.isPending}>
            {upload.isPending ? "Uploading…" : "Upload"}
          </Button>
        </CardContent>
      </Card>

      {isLoading ? (
        <p className="text-sm text-gray-400">Loading…</p>
      ) : images?.length ? (
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-3">
          {images.map((img: any) => (
            <div key={img._id} className="relative group rounded-lg overflow-hidden aspect-square bg-gray-100">
              <img src={img.url} alt={img.altText ?? ""} className="w-full h-full object-cover" />
              <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-colors flex items-center justify-center gap-2 opacity-0 group-hover:opacity-100">
                <button
                  onClick={() => toggleFeatured.mutate({ id: img._id, isFeatured: !img.isFeatured })}
                  className="p-1.5 rounded-full bg-white/90"
                  title="Toggle featured"
                >
                  <Star className={`w-3.5 h-3.5 ${img.isFeatured ? "fill-amber-400 text-amber-400" : "text-gray-600"}`} />
                </button>
                <button onClick={() => remove.mutate(img._id)} className="p-1.5 rounded-full bg-white/90" title="Delete">
                  <Trash2 className="w-3.5 h-3.5 text-red-500" />
                </button>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <EmptyState icon={ImageIcon} title="No images uploaded yet" />
      )}
    </div>
  );
}
