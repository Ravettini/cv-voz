import type { ResumeContent, TemplateId } from "@cv-voz/shared";

function esc(value?: string): string {
  return (value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function location(content: ResumeContent): string {
  return [content.personal.city, content.personal.country].filter(Boolean).join(", ");
}

function contactLine(content: ResumeContent): string {
  return [content.personal.email, content.personal.phone, location(content), ...content.links.map((l) => l.url)]
    .filter(Boolean)
    .map(esc)
    .join(" · ");
}

function bullets(items: string[]): string {
  if (!items.length) return "";
  return `<ul>${items.map((b) => `<li>${esc(b)}</li>`).join("")}</ul>`;
}

function section(title: string, inner: string): string {
  if (!inner.trim()) return "";
  return `<section class="section"><h2>${esc(title)}</h2>${inner}</section>`;
}

function baseCss(): string {
  return `
    @page { size: A4; margin: 0; }
    * { box-sizing: border-box; }
    html, body { margin: 0; padding: 0; background: #fff; }
    body {
      width: 210mm;
      margin: 0;
      font-family: "Liberation Sans", Arial, Helvetica, sans-serif;
      color: #111827;
      font-size: 10pt;
      line-height: 1.3;
    }
    #cv-fit { padding: 8mm 10mm; }
    h1 { font-size: 18pt; margin: 0 0 2px; font-weight: 700; letter-spacing: -0.02em; }
    h2 { font-size: 12.5pt; text-transform: uppercase; letter-spacing: 0.08em; margin: 7px 0 3px; border-bottom: 1px solid #d1d5db; padding-bottom: 1px; color: #1f2937; font-weight: 700; }
    h3 { font-size: 11pt; margin: 0; }
    p { margin: 0 0 3px; }
    ul { margin: 1px 0 3px; padding-left: 14px; }
    li { margin: 0 0 1px; }
    .muted { color: #4b5563; font-size: 9.5pt; }
    .item { margin-bottom: 5px; }
    .row { display: flex; justify-content: space-between; gap: 8px; }
    .photo { width: 68px; height: 68px; object-fit: cover; border-radius: 8px; }
  `;
}

function wrap(body: string, extraCss = ""): string {
  return `<!doctype html><html lang="es"><head><meta charset="utf-8"><style>${baseCss()}${extraCss}</style></head><body><div id="cv-fit">${body}</div></body></html>`;
}

function experienceBlock(content: ResumeContent): string {
  return content.experiences
    .map(
      (e) => `<div class="item"><div class="row"><h3>${esc(e.role)}</h3><span class="muted">${esc(e.period)}</span></div>
      <div class="muted">${esc(e.company)}</div>${bullets(e.bullets)}</div>`,
    )
    .join("");
}

function educationBlock(content: ResumeContent): string {
  return content.education
    .map(
      (e) => `<div class="item"><div class="row"><h3>${esc(e.title)}</h3><span class="muted">${esc(e.period)}</span></div>
      <div class="muted">${esc(e.institution)}${e.detail ? ` · ${esc(e.detail)}` : ""}</div></div>`,
    )
    .join("");
}

function listBlock(items: { name: string; institution?: string; date?: string }[]): string {
  return items
    .map((i) => `<div class="item"><strong>${esc(i.name)}</strong>${i.institution ? ` · ${esc(i.institution)}` : ""}${i.date ? ` · ${esc(i.date)}` : ""}</div>`)
    .join("");
}

function ats(content: ResumeContent): string {
  const body = `
    <h1>${esc(content.personal.fullName)}</h1>
    <p class="muted">${esc(content.targetRole || "")}${content.targetRole ? " · " : ""}${contactLine(content)}</p>
    ${section("Perfil", `<p>${esc(content.professionalSummary)}</p>`)}
    ${section("Experiencia", experienceBlock(content))}
    ${section("Educación", educationBlock(content))}
    ${section("Cursos", listBlock(content.courses))}
    ${section("Certificaciones", listBlock(content.certifications))}
    ${section("Habilidades", content.skills.length ? `<p>${content.skills.map(esc).join(" · ")}</p>` : "")}
    ${section("Idiomas", content.languages.map((l) => `<div>${esc(l.language)} — ${esc(l.level)}</div>`).join(""))}
    ${section(
      "Enlaces",
      content.links.map((l) => `<div><strong>${esc(l.label)}:</strong> ${esc(l.url)}</div>`).join(""),
    )}
  `;
  return wrap(body);
}

function professional(content: ResumeContent): string {
  const photo = content.personal.photoUrl
    ? `<img class="photo" src="${esc(content.personal.photoUrl)}" alt="" />`
    : "";
  const extra = `
    .layout { display: grid; grid-template-columns: 58mm 1fr; gap: 6mm; }
    .side { background: #f3f4f6; padding: 5mm 4mm; }
    .main { padding: 0; }
    h2 { border-color: #c7d2fe; color: #312e81; }
  `;
  const body = `
    <div class="layout">
      <aside class="side">
        ${photo}
        <h1 style="font-size:18pt;margin-top:10px">${esc(content.personal.fullName)}</h1>
        <p class="muted">${esc(content.targetRole || "")}</p>
        <h2>Contacto</h2>
        <p class="muted">${[content.personal.email, content.personal.phone, location(content)].filter(Boolean).map(esc).join("<br/>")}</p>
        ${content.skills.length ? `<h2>Habilidades</h2><p>${content.skills.map(esc).join("<br/>")}</p>` : ""}
        ${content.languages.length ? `<h2>Idiomas</h2>${content.languages.map((l) => `<div>${esc(l.language)} — ${esc(l.level)}</div>`).join("")}` : ""}
        ${
          content.links.length
            ? `<h2>Enlaces</h2>${content.links
                .map((l) => `<div><strong>${esc(l.label)}</strong><br/><span class="muted">${esc(l.url)}</span></div>`)
                .join("")}`
            : ""
        }
      </aside>
      <main class="main">
        ${section("Perfil profesional", `<p>${esc(content.professionalSummary)}</p>`)}
        ${section("Experiencia", experienceBlock(content))}
        ${section("Educación", educationBlock(content))}
        ${section("Cursos", listBlock(content.courses))}
        ${section("Certificaciones", listBlock(content.certifications))}
      </main>
    </div>`;
  return wrap(body, extra);
}

function modern(content: ResumeContent): string {
  const photo = content.personal.photoUrl
    ? `<img class="photo" src="${esc(content.personal.photoUrl)}" alt="" style="border-radius:999px" />`
    : "";
  const extra = `
    h1 { font-size: 26pt; }
    h2 { letter-spacing: 0.16em; border-bottom: 2px solid #111827; }
    .skills span { display: inline-block; border: 1px solid #111827; padding: 3px 9px; margin: 0 6px 6px 0; font-size: 11pt; }
    .header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px; }
  `;
  const body = `
    <div class="header">
      <div>
        <h1>${esc(content.personal.fullName)}</h1>
        <p class="muted">${esc(content.targetRole || "")}</p>
        <p class="muted">${contactLine(content)}</p>
      </div>
      ${photo}
    </div>
    ${section("Perfil", `<p>${esc(content.professionalSummary)}</p>`)}
    ${section("Experiencia", experienceBlock(content))}
    ${section("Educación", educationBlock(content))}
    ${section("Habilidades", content.skills.length ? `<div class="skills">${content.skills.map((s) => `<span>${esc(s)}</span>`).join("")}</div>` : "")}
    ${section("Cursos", listBlock(content.courses))}
    ${section("Certificaciones", listBlock(content.certifications))}
    ${section(
      "Enlaces",
      content.links.map((l) => `<div><strong>${esc(l.label)}:</strong> ${esc(l.url)}</div>`).join(""),
    )}
  `;
  return wrap(body, extra);
}

function executive(content: ResumeContent): string {
  const extra = `
    h1 { font-size: 20pt; font-weight: 600; }
    h2 { border-bottom: 1px solid #111827; letter-spacing: 0.22em; font-weight: 600; }
    .rule { height: 1px; background: #111827; margin: 8px 0 18px; }
  `;
  const photo = content.personal.photoUrl
    ? `<img class="photo" src="${esc(content.personal.photoUrl)}" alt="" style="border-radius:2px" />`
    : "";
  const body = `
    <div class="row" style="align-items:flex-end;margin-bottom:8px">
      <div>
        <h1>${esc(content.personal.fullName)}</h1>
        <p class="muted">${esc(content.targetRole || "")}</p>
      </div>
      ${photo}
    </div>
    <p class="muted">${contactLine(content)}</p>
    <div class="rule"></div>
    ${section("Perfil", `<p>${esc(content.professionalSummary)}</p>`)}
    ${section("Experiencia profesional", experienceBlock(content))}
    ${section("Formación", educationBlock(content))}
    ${section("Cursos y certificaciones", listBlock([...content.courses, ...content.certifications]))}
    ${section("Competencias", content.skills.length ? `<p>${content.skills.map(esc).join("  ·  ")}</p>` : "")}
    ${section(
      "Enlaces",
      content.links.map((l) => `<div><strong>${esc(l.label)}:</strong> ${esc(l.url)}</div>`).join(""),
    )}
  `;
  return wrap(body, extra);
}

export function renderResumeHtml(content: ResumeContent, templateId: TemplateId): string {
  switch (templateId) {
    case "professional":
      return professional(content);
    case "modern":
      return modern(content);
    case "executive":
      return executive(content);
    default:
      return ats(content);
  }
}
