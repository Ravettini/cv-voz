import { useCallback, useState } from "react";
import Cropper, { type Area } from "react-easy-crop";
import { useNavigate } from "react-router-dom";
import { Camera, Loader2, Upload } from "lucide-react";
import { ProcessStepper } from "@/components/ProcessStepper";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { profileApi } from "@/services/profileApi";
import { useResumeBuilderStore } from "@/stores/resumeBuilderStore";
import { toast } from "@/stores/toastStore";

async function getCroppedBlob(imageSrc: string, crop: Area): Promise<Blob> {
  const image = await createImage(imageSrc);
  const canvas = document.createElement("canvas");
  const size = Math.min(crop.width, crop.height);
  canvas.width = 800;
  canvas.height = 800;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("No canvas");
  ctx.drawImage(image, crop.x, crop.y, size, size, 0, 0, 800, 800);
  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => (blob ? resolve(blob) : reject(new Error("No blob"))), "image/jpeg", 0.9);
  });
}

function createImage(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.addEventListener("load", () => resolve(img));
    img.addEventListener("error", reject);
    img.src = url;
  });
}

export function PhotoPage() {
  const navigate = useNavigate();
  const setPhotoUrl = useResumeBuilderStore((s) => s.setPhotoUrl);
  const [preview, setPreview] = useState<string | null>(null);
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedArea, setCroppedArea] = useState<Area | null>(null);
  const [uploading, setUploading] = useState(false);

  const onCropComplete = useCallback((_area: Area, croppedAreaPixels: Area) => {
    setCroppedArea(croppedAreaPixels);
  }, []);

  const onFile = (file: File | null) => {
    if (!file) return;
    if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) {
      toast({ title: "Usá JPG, PNG o WEBP", variant: "error" });
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast({ title: "La foto supera los 5 MB", variant: "error" });
      return;
    }
    setPreview(URL.createObjectURL(file));
  };

  const upload = async () => {
    if (!preview || !croppedArea) {
      navigate("/templates");
      return;
    }
    setUploading(true);
    try {
      const blob = await getCroppedBlob(preview, croppedArea);
      const { photoUrl } = await profileApi.uploadPhoto(blob);
      setPhotoUrl(photoUrl);
      toast({ title: "Foto guardada", variant: "success" });
      navigate("/templates");
    } catch (err) {
      toast({ title: "No pudimos subir la foto", description: err instanceof Error ? err.message : undefined, variant: "error" });
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="mx-auto max-w-3xl px-4 py-10">
      <ProcessStepper current={3} />
      <Card className="animate-fade-up">
        <CardContent className="space-y-6 p-8">
          <div>
            <h1 className="text-3xl font-extrabold tracking-tight sm:text-4xl">
              Sumá una <span className="text-gradient">foto</span>
            </h1>
            <p className="mt-2 text-muted">Es opcional. Algunas plantillas no utilizan fotografía.</p>
          </div>

          {!preview ? (
            <label className="group flex cursor-pointer flex-col items-center justify-center rounded-3xl border-2 border-dashed border-primary/30 bg-gradient-to-br from-primary-soft/60 via-white to-peach/40 px-6 py-16 text-center transition-all duration-300 hover:border-primary/60 hover:shadow-[var(--shadow-soft)]">
              <span className="mb-4 inline-flex h-16 w-16 items-center justify-center rounded-full bg-white text-primary shadow-[var(--shadow-soft)] transition-transform duration-300 group-hover:-translate-y-1 group-hover:scale-105">
                <Camera className="h-7 w-7" />
              </span>
              <span className="flex items-center gap-2 font-extrabold">
                <Upload className="h-4 w-4 text-primary" />
                Arrastrá una imagen acá
              </span>
              <span className="mt-1 text-sm text-muted">o seleccioná foto (JPG, PNG, WEBP · máx. 5 MB)</span>
              <input
                type="file"
                accept="image/jpeg,image/png,image/webp"
                className="hidden"
                onChange={(e) => onFile(e.target.files?.[0] ?? null)}
              />
            </label>
          ) : (
            <div className="animate-pop-in space-y-4">
              <div className="relative h-72 overflow-hidden rounded-3xl bg-[#2b2640]">
                <Cropper
                  image={preview}
                  crop={crop}
                  zoom={zoom}
                  aspect={1}
                  onCropChange={setCrop}
                  onZoomChange={setZoom}
                  onCropComplete={onCropComplete}
                />
              </div>
              <label className="block text-sm font-bold text-muted">
                Ampliar / reducir
                <input
                  className="mt-2 w-full accent-primary"
                  type="range"
                  min={1}
                  max={3}
                  step={0.05}
                  value={zoom}
                  onChange={(e) => setZoom(Number(e.target.value))}
                />
              </label>
            </div>
          )}

          <div className="flex flex-wrap gap-3">
            <Button onClick={() => void upload()} disabled={uploading}>
              {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              {uploading ? "Subiendo…" : preview ? "Guardar y continuar" : "Continuar sin foto"}
            </Button>
            {preview ? (
              <Button variant="secondary" onClick={() => setPreview(null)}>
                Elegir otra
              </Button>
            ) : null}
            <Button variant="ghost" onClick={() => navigate("/templates")}>
              Saltar
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
