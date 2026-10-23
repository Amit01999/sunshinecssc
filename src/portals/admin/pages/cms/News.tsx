import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Image as ImageIcon, Newspaper, Trash2, UploadCloud, X } from "lucide-react";
import { api, getErrorMessage } from "@/lib/api";
import { PageHeader } from "@/components/dashboard/PageHeader";
import { EmptyState } from "@/components/dashboard/EmptyState";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";

interface Article {
  _id: string;
  title: string;
  status: "draft" | "published";
  featuredImage?: { url: string; publicId: string };
}

export default function News() {
  const { toast } = useToast();
  const qc = useQueryClient();
  const [title, setTitle] = useState("");
  const [summary, setSummary] = useState("");
  const [body, setBody] = useState("");
  const [status, setStatus] = useState("draft");
  const [imageFile, setImageFile] = useState<File | null>(null);

  const { data: articles } = useQuery({
    queryKey: ["admin-news"],
    queryFn: async () => (await api.get("/news")).data.data as Article[],
  });

  const refresh = () => qc.invalidateQueries({ queryKey: ["admin-news"] });

  const create = useMutation({
    mutationFn: async () => {
      const res = await api.post("/news", { title, summary, body, status });
      const created: Article = res.data.data;
      if (imageFile) {
        const form = new FormData();
        form.append("image", imageFile);
        await api.post(`/news/${created._id}/image`, form);
      }
    },
    onSuccess: () => {
      toast({ title: "Article saved" });
      setTitle("");
      setSummary("");
      setBody("");
      setImageFile(null);
      refresh();
    },
    onError: (err) => toast({ title: "Failed", description: getErrorMessage(err), variant: "destructive" }),
  });

  const togglePublish = useMutation({
    mutationFn: async ({ id, next }: { id: string; next: string }) => api.patch(`/news/${id}`, { status: next }),
    onSuccess: refresh,
  });

  const remove = useMutation({
    mutationFn: async (id: string) => api.delete(`/news/${id}`),
    onSuccess: refresh,
  });

  const uploadImage = useMutation({
    mutationFn: async ({ id, file }: { id: string; file: File }) => {
      const form = new FormData();
      form.append("image", file);
      await api.post(`/news/${id}/image`, form);
    },
    onSuccess: () => {
      toast({ title: "Image updated" });
      refresh();
    },
    onError: (err) => toast({ title: "Could not upload image", description: getErrorMessage(err), variant: "destructive" }),
  });

  const removeImage = useMutation({
    mutationFn: async (id: string) => api.delete(`/news/${id}/image`),
    onSuccess: () => {
      toast({ title: "Image removed" });
      refresh();
    },
    onError: (err) => toast({ title: "Could not remove image", description: getErrorMessage(err), variant: "destructive" }),
  });

  return (
    <div>
      <PageHeader title="News & Media" description="Write articles for press coverage and school news." />
      <div className="grid lg:grid-cols-2 gap-4">
        <Card>
          <CardHeader><CardTitle className="text-base">New Article</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <Input placeholder="Title" value={title} onChange={(e) => setTitle(e.target.value)} />
            <Input placeholder="Short summary" value={summary} onChange={(e) => setSummary(e.target.value)} />
            <Textarea placeholder="Body (Markdown supported)" value={body} onChange={(e) => setBody(e.target.value)} rows={6} />

            <div>
              <Label className="text-xs">Featured image (optional)</Label>
              {imageFile ? (
                <div className="mt-1 flex items-center gap-2">
                  <img src={URL.createObjectURL(imageFile)} alt="" className="w-14 h-14 rounded-lg object-cover border" />
                  <span className="text-xs text-gray-500 truncate flex-1">{imageFile.name}</span>
                  <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => setImageFile(null)}>
                    <X className="w-3.5 h-3.5" />
                  </Button>
                </div>
              ) : (
                <label className="mt-1 flex items-center justify-center gap-2 w-full py-2.5 rounded-lg border-2 border-dashed border-gray-200 text-xs text-gray-500 cursor-pointer hover:border-gray-300 hover:bg-gray-50 transition-colors">
                  <UploadCloud className="w-3.5 h-3.5" />
                  Choose an image…
                  <input type="file" accept="image/*" className="hidden" onChange={(e) => setImageFile(e.target.files?.[0] ?? null)} />
                </label>
              )}
            </div>

            <Select value={status} onValueChange={setStatus}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="draft">Draft</SelectItem>
                <SelectItem value="published">Published</SelectItem>
              </SelectContent>
            </Select>
            <Button className="w-full" onClick={() => create.mutate()} disabled={!title || !body || create.isPending}>
              {create.isPending ? "Saving…" : "Save"}
            </Button>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-0">
            {articles?.length ? (
              <div className="divide-y">
                {articles.map((a) => (
                  <div key={a._id} className="flex items-center gap-3 p-3">
                    {a.featuredImage?.url ? (
                      <img src={a.featuredImage.url} alt="" className="w-12 h-12 rounded-lg object-cover border shrink-0" />
                    ) : (
                      <div className="w-12 h-12 rounded-lg border border-dashed flex items-center justify-center text-gray-300 shrink-0">
                        <ImageIcon className="w-4 h-4" />
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{a.title}</p>
                      <Badge variant={a.status === "published" ? "default" : "secondary"} className="mt-1 text-[10px] capitalize">{a.status}</Badge>
                    </div>
                    <div className="flex gap-1 shrink-0">
                      <label className="inline-flex">
                        <Button size="sm" variant="outline" className="h-8 cursor-pointer" asChild>
                          <span>{a.featuredImage?.url ? "Replace" : "Add"} Image</span>
                        </Button>
                        <input
                          type="file"
                          accept="image/*"
                          className="hidden"
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file) uploadImage.mutate({ id: a._id, file });
                            e.target.value = "";
                          }}
                        />
                      </label>
                      {a.featuredImage?.url && (
                        <Button size="sm" variant="ghost" className="h-8 px-2" onClick={() => removeImage.mutate(a._id)}>
                          <Trash2 className="w-3.5 h-3.5 text-red-500" />
                        </Button>
                      )}
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => togglePublish.mutate({ id: a._id, next: a.status === "published" ? "draft" : "published" })}
                      >
                        {a.status === "published" ? "Unpublish" : "Publish"}
                      </Button>
                      <Button variant="ghost" size="icon" onClick={() => remove.mutate(a._id)}>
                        <Trash2 className="w-4 h-4 text-red-500" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            ) : <EmptyState icon={Newspaper} title="No articles yet" />}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
