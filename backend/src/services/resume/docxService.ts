import {
  AlignmentType,
  Document,
  HeadingLevel,
  Packer,
  Paragraph,
  TextRun,
} from "docx";
import type { ResumeContent } from "@cv-voz/shared";

function heading(text: string): Paragraph {
  return new Paragraph({
    text: text.toUpperCase(),
    heading: HeadingLevel.HEADING_2,
    spacing: { before: 280, after: 120 },
    border: { bottom: { color: "CCCCCC", space: 1, style: "single", size: 6 } },
  });
}

export async function renderResumeDocx(content: ResumeContent): Promise<Buffer> {
  const children: Paragraph[] = [
    new Paragraph({
      alignment: AlignmentType.LEFT,
      children: [new TextRun({ text: content.personal.fullName, bold: true, size: 40 })],
    }),
  ];

  if (content.targetRole) {
    children.push(new Paragraph({ children: [new TextRun({ text: content.targetRole, italics: true, size: 24 })] }));
  }

  const contact = [
    content.personal.email,
    content.personal.phone,
    [content.personal.city, content.personal.country].filter(Boolean).join(", "),
    ...content.links.map((l) => l.url),
  ]
    .filter(Boolean)
    .join("  ·  ");
  if (contact) children.push(new Paragraph({ children: [new TextRun({ text: contact, size: 22, color: "4B5563" })] }));

  children.push(heading("Perfil"));
  children.push(new Paragraph({ text: content.professionalSummary }));

  if (content.experiences.length) {
    children.push(heading("Experiencia"));
    for (const exp of content.experiences) {
      children.push(
        new Paragraph({
          children: [
            new TextRun({ text: exp.role, bold: true }),
            new TextRun({ text: exp.period ? `  ·  ${exp.period}` : "", color: "4B5563" }),
          ],
        }),
      );
      children.push(new Paragraph({ children: [new TextRun({ text: exp.company, italics: true })] }));
      for (const bullet of exp.bullets) {
        children.push(new Paragraph({ text: bullet, bullet: { level: 0 } }));
      }
    }
  }

  if (content.education.length) {
    children.push(heading("Educación"));
    for (const edu of content.education) {
      children.push(new Paragraph({ children: [new TextRun({ text: edu.title, bold: true })] }));
      children.push(
        new Paragraph({
          text: [edu.institution, edu.period, edu.detail].filter(Boolean).join(" · "),
        }),
      );
    }
  }

  if (content.courses.length) {
    children.push(heading("Cursos"));
    for (const course of content.courses) {
      children.push(new Paragraph({ text: [course.name, course.institution, course.date].filter(Boolean).join(" · ") }));
    }
  }

  if (content.certifications.length) {
    children.push(heading("Certificaciones"));
    for (const cert of content.certifications) {
      children.push(new Paragraph({ text: [cert.name, cert.institution, cert.date].filter(Boolean).join(" · ") }));
    }
  }

  if (content.skills.length) {
    children.push(heading("Habilidades"));
    children.push(new Paragraph({ text: content.skills.join(" · ") }));
  }

  if (content.languages.length) {
    children.push(heading("Idiomas"));
    for (const lang of content.languages) {
      children.push(new Paragraph({ text: `${lang.language} — ${lang.level}` }));
    }
  }

  if (content.links.length) {
    children.push(heading("Enlaces"));
    for (const link of content.links) {
      children.push(
        new Paragraph({
          children: [
            new TextRun({ text: `${link.label}: `, bold: true }),
            new TextRun({ text: link.url }),
          ],
        }),
      );
    }
  }

  const doc = new Document({
    sections: [{ properties: { page: { size: { width: 11906, height: 16838 } } }, children }],
  });
  return Buffer.from(await Packer.toBuffer(doc));
}
