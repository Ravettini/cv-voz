import { useLayoutEffect, useRef, useState } from "react";
import type { ResumeContent } from "@cv-voz/shared";
import { cn } from "@/lib/utils";

const MIN_FIT = 0.6;
const MAX_FIT = 2.05;
const FILL = 0.97;

function Contact({ content, includeLinks = true }: { content: ResumeContent; includeLinks?: boolean }) {
  const location = [content.personal.city, content.personal.country].filter(Boolean).join(", ");
  const parts = [
    content.personal.email,
    content.personal.phone,
    location,
    ...(includeLinks ? content.links.map((l) => (l.label ? `${l.label}: ${l.url}` : l.url)) : []),
  ].filter(Boolean);

  return <p className="text-[12px] leading-relaxed text-slate-500">{parts.join(" · ")}</p>;
}

function LinksSection({ content }: { content: ResumeContent }) {
  if (!content.links.length) return null;
  return (
    <Section title="Enlaces">
      {content.links.map((l) => (
        <div key={`${l.label}-${l.url}`} className="text-[12px]">
          <span className="font-semibold">{l.label}: </span>
          <span className="break-all text-slate-600">{l.url}</span>
        </div>
      ))}
    </Section>
  );
}

export function AtsTemplate({ content, className }: { content: ResumeContent; className?: string }) {
  return (
    <article className={cn("bg-white text-slate-900", className)}>
      <h1 className="text-2xl font-bold tracking-tight">{content.personal.fullName}</h1>
      {content.targetRole ? <p className="text-sm text-slate-600">{content.targetRole}</p> : null}
      <Contact content={content} />
      <Section title="Perfil">
        <p className="text-[12px] leading-relaxed">{content.professionalSummary}</p>
      </Section>
      <Section title="Experiencia">
        {content.experiences.map((e) => (
          <div key={`${e.company}-${e.role}`} className="mb-3">
            <div className="flex justify-between gap-2 text-[14px] font-semibold">
              <span>{e.role}</span>
              <span className="text-[12px] font-normal text-slate-500">{e.period}</span>
            </div>
            <div className="text-[12px] text-slate-600">{e.company}</div>
            <ul className="mt-1 list-disc space-y-0.5 pl-4 text-[12px]">
              {e.bullets.map((b) => (
                <li key={b}>{b}</li>
              ))}
            </ul>
          </div>
        ))}
      </Section>
      <Section title="Educación">
        {content.education.map((e) => (
          <div key={`${e.institution}-${e.title}`} className="mb-2 text-[12px]">
            <div className="font-semibold">{e.title}</div>
            <div className="text-slate-600">
              {e.institution}
              {e.period ? ` · ${e.period}` : ""}
            </div>
          </div>
        ))}
      </Section>
      {content.skills.length ? (
        <Section title="Habilidades">
          <p className="text-[12px]">{content.skills.join(" · ")}</p>
        </Section>
      ) : null}
      {content.languages.length ? (
        <Section title="Idiomas">
          {content.languages.map((l) => (
            <div key={l.language} className="text-[12px]">
              {l.language} — {l.level}
            </div>
          ))}
        </Section>
      ) : null}
      <LinksSection content={content} />
    </article>
  );
}

export function ProfessionalTemplate({ content, className }: { content: ResumeContent; className?: string }) {
  return (
    <article className={cn("grid grid-cols-[32%_1fr] bg-white text-slate-900", className)}>
      <aside className="bg-slate-100 p-4">
        {content.personal.photoUrl ? (
          <img src={content.personal.photoUrl} alt="" className="mb-3 h-20 w-20 rounded-xl object-cover" />
        ) : null}
        <h1 className="text-lg font-bold">{content.personal.fullName}</h1>
        <p className="text-[12px] text-slate-600">{content.targetRole}</p>
        <h2 className="mt-4 text-[16px] font-bold uppercase tracking-wider text-indigo-900">Contacto</h2>
        <Contact content={content} includeLinks={false} />
        <h2 className="mt-4 text-[16px] font-bold uppercase tracking-wider text-indigo-900">Habilidades</h2>
        <div className="space-y-1 text-[12px]">
          {content.skills.map((s) => (
            <div key={s}>{s}</div>
          ))}
        </div>
        <h2 className="mt-4 text-[16px] font-bold uppercase tracking-wider text-indigo-900">Idiomas</h2>
        {content.languages.map((l) => (
          <div key={l.language} className="text-[12px]">
            {l.language} — {l.level}
          </div>
        ))}
        {content.links.length ? (
          <>
            <h2 className="mt-4 text-[16px] font-bold uppercase tracking-wider text-indigo-900">Enlaces</h2>
            {content.links.map((l) => (
              <div key={`${l.label}-${l.url}`} className="break-all text-[12px]">
                <div className="font-semibold">{l.label}</div>
                <div className="text-slate-600">{l.url}</div>
              </div>
            ))}
          </>
        ) : null}
      </aside>
      <main className="p-4">
        <Section title="Perfil profesional">
          <p className="text-[12px] leading-relaxed">{content.professionalSummary}</p>
        </Section>
        <Section title="Experiencia">
          {content.experiences.map((e) => (
            <div key={`${e.company}-${e.role}`} className="mb-3">
              <div className="flex justify-between text-[14px] font-semibold">
                <span>{e.role}</span>
                <span className="text-[12px] font-normal text-slate-500">{e.period}</span>
              </div>
              <div className="text-[12px] text-slate-600">{e.company}</div>
              <ul className="mt-1 list-disc space-y-0.5 pl-4 text-[12px]">
                {e.bullets.map((b) => (
                  <li key={b}>{b}</li>
                ))}
              </ul>
            </div>
          ))}
        </Section>
        <Section title="Educación">
          {content.education.map((e) => (
            <div key={`${e.institution}-${e.title}`} className="mb-2 text-[12px]">
              <div className="font-semibold">{e.title}</div>
              <div className="text-slate-600">{e.institution}</div>
            </div>
          ))}
        </Section>
      </main>
    </article>
  );
}

export function ModernTemplate({ content, className }: { content: ResumeContent; className?: string }) {
  return (
    <article className={cn("bg-white p-5 text-slate-900", className)}>
      <div className="mb-4 flex items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">{content.personal.fullName}</h1>
          <p className="text-sm text-slate-600">{content.targetRole}</p>
          <Contact content={content} />
        </div>
        {content.personal.photoUrl ? (
          <img src={content.personal.photoUrl} alt="" className="h-20 w-20 rounded-full object-cover" />
        ) : null}
      </div>
      <Section title="Perfil">
        <p className="text-[12px] leading-relaxed">{content.professionalSummary}</p>
      </Section>
      <Section title="Experiencia">
        {content.experiences.map((e) => (
          <div key={`${e.company}-${e.role}`} className="mb-3">
            <div className="text-[14px] font-semibold">
              {e.role} · {e.company}
            </div>
            <div className="text-[12px] text-slate-500">{e.period}</div>
            <ul className="mt-1 list-disc space-y-0.5 pl-4 text-[12px]">
              {e.bullets.map((b) => (
                <li key={b}>{b}</li>
              ))}
            </ul>
          </div>
        ))}
      </Section>
      <Section title="Habilidades">
        <div className="flex flex-wrap gap-1.5">
          {content.skills.map((s) => (
            <span key={s} className="rounded-md border border-slate-900 px-2 py-0.5 text-[12px]">
              {s}
            </span>
          ))}
        </div>
      </Section>
      {content.courses.length || content.certifications.length ? (
        <Section title="Cursos y certificaciones">
          {[...content.courses, ...content.certifications].map((c) => (
            <div key={`${c.name}-${c.institution ?? ""}`} className="mb-1 text-[12px]">
              <strong>{c.name}</strong>
              {c.institution ? ` · ${c.institution}` : ""}
              {c.date ? ` · ${c.date}` : ""}
            </div>
          ))}
        </Section>
      ) : null}
      <LinksSection content={content} />
    </article>
  );
}

export function ExecutiveTemplate({ content, className }: { content: ResumeContent; className?: string }) {
  return (
    <article className={cn("bg-white p-6 text-slate-900", className)}>
      <div className="mb-2 flex items-end justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">{content.personal.fullName}</h1>
          <p className="text-sm text-slate-600">{content.targetRole}</p>
        </div>
        {content.personal.photoUrl ? (
          <img src={content.personal.photoUrl} alt="" className="h-16 w-16 rounded object-cover" />
        ) : null}
      </div>
      <Contact content={content} />
      <div className="my-4 h-px bg-slate-900" />
      <Section title="Perfil">
        <p className="text-[12px] leading-relaxed">{content.professionalSummary}</p>
      </Section>
      <Section title="Experiencia profesional">
        {content.experiences.map((e) => (
          <div key={`${e.company}-${e.role}`} className="mb-4">
            <div className="flex justify-between text-[14px] font-semibold">
              <span>
                {e.role}, {e.company}
              </span>
              <span className="text-[12px] font-normal text-slate-500">{e.period}</span>
            </div>
            <ul className="mt-1 list-disc space-y-0.5 pl-4 text-[12px]">
              {e.bullets.map((b) => (
                <li key={b}>{b}</li>
              ))}
            </ul>
          </div>
        ))}
      </Section>
      <Section title="Formación">
        {content.education.map((e) => (
          <div key={`${e.institution}-${e.title}`} className="mb-2 text-[12px]">
            <div className="font-semibold">{e.title}</div>
            <div className="text-slate-600">{e.institution}</div>
          </div>
        ))}
      </Section>
      {(content.courses.length || content.certifications.length) ? (
        <Section title="Cursos y certificaciones">
          {[...content.courses, ...content.certifications].map((c) => (
            <div key={`${c.name}-${c.institution ?? ""}`} className="mb-1 text-[12px]">
              <strong>{c.name}</strong>
              {c.institution ? ` · ${c.institution}` : ""}
              {c.date ? ` · ${c.date}` : ""}
            </div>
          ))}
        </Section>
      ) : null}
      {content.skills.length ? (
        <Section title="Competencias">
          <p className="text-[12px]">{content.skills.join("  ·  ")}</p>
        </Section>
      ) : null}
      <LinksSection content={content} />
    </article>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mt-3.5">
      <h2 className="mb-1.5 border-b border-slate-300 pb-0.5 text-[16px] font-bold uppercase tracking-[0.12em] text-slate-800">
        {title}
      </h2>
      {children}
    </section>
  );
}

export function ResumePreview({
  content,
  templateId,
  scale = 0.72,
}: {
  content: ResumeContent;
  templateId: string;
  scale?: number;
}) {
  const Template =
    templateId === "professional"
      ? ProfessionalTemplate
      : templateId === "modern"
        ? ModernTemplate
        : templateId === "executive"
          ? ExecutiveTemplate
          : AtsTemplate;
  const sheetRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const [zoom, setZoom] = useState(1);

  useLayoutEffect(() => {
    const sheet = sheetRef.current;
    const inner = contentRef.current;
    if (!sheet || !inner) return;
    const pageHeight = sheet.clientHeight;
    if (!pageHeight) return;

    const apply = (next: number) => {
      inner.style.width = `${210 / next}mm`;
      inner.style.transform = `scale(${next})`;
      inner.style.transformOrigin = "top left";
      return (inner.scrollHeight * next) / pageHeight;
    };

    let low = MIN_FIT;
    let high = MAX_FIT;
    for (let i = 0; i < 10; i++) {
      const mid = (low + high) / 2;
      if (apply(mid) > FILL) high = mid;
      else low = mid;
    }
    apply(low);

    setZoom((current) => (Math.abs(current - low) < 0.015 ? current : low));
  }, [content, templateId]);

  return (
    <div className="mx-auto w-full overflow-auto rounded-3xl border border-border bg-gradient-to-br from-primary-soft/70 via-[#f6f3ff] to-mint/40 p-4">
      <div
        className="relative mx-auto"
        style={{ width: `calc(210mm * ${scale})`, height: `calc(297mm * ${scale})` }}
      >
      <div
        ref={sheetRef}
        className="absolute left-0 top-0 overflow-hidden bg-white shadow-sm"
        style={{
          width: "210mm",
          height: "297mm",
          transform: `scale(${scale})`,
          transformOrigin: "top left",
        }}
      >
        <div
          ref={contentRef}
          style={{
            width: `${210 / zoom}mm`,
            transform: `scale(${zoom})`,
            transformOrigin: "top left",
          }}
        >
          <Template content={content} className="p-6" />
        </div>
      </div>
      </div>
    </div>
  );
}
