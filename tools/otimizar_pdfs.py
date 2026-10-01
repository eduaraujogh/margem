"""Reduz o peso das imagens dentro dos PDFs (para abrir rápido no celular). Texto e páginas não mudam.
Uso: python3 tools/otimizar_pdfs.py origem/ pdfs/"""
import sys, os, io, zlib, pikepdf
from pikepdf import PdfImage, Name
from PIL import Image
src, dst = sys.argv[1], sys.argv[2]
for f in sorted(os.listdir(src)):
    if not f.endswith(".pdf"): continue
    pdf = pikepdf.open(os.path.join(src, f))
    vistos = set()
    for page in pdf.pages:
        for name, raw in list(page.images.items()):
            if raw.objgen in vistos: continue
            vistos.add(raw.objgen)
            try:
                if raw.get("/SMask") is not None or raw.get("/ImageMask"): continue
                im = PdfImage(raw).as_pil_image()
                if im.mode not in ("RGB", "L"): im = im.convert("RGB")
                im.thumbnail((1600, 1600))
                buf = io.BytesIO(); im.save(buf, "JPEG", quality=72, optimize=True)
                if buf.tell() < len(raw.read_raw_bytes()) * 0.9:
                    raw.write(buf.getvalue(), filter=Name.DCTDecode)
                    raw.Width, raw.Height = im.size
                    raw.ColorSpace = Name.DeviceRGB if im.mode == "RGB" else Name.DeviceGray
                    raw.BitsPerComponent = 8
                    for k in ("/DecodeParms", "/Decode"):
                        if k in raw: del raw[k]
            except Exception as e:
                pass
    pdf.save(os.path.join(dst, f), compress_streams=True, object_stream_mode=pikepdf.ObjectStreamMode.generate)
    print(f, os.path.getsize(os.path.join(src, f))//1024, "KB ->", os.path.getsize(os.path.join(dst, f))//1024, "KB")
