const stringField = { type: "string" };

export const candidateProfileJsonSchema = {
  type: "object",
  additionalProperties: false,
  properties: {
    personal: {
      type: "object",
      additionalProperties: false,
      properties: {
        fullName: stringField,
        city: stringField,
        country: stringField,
        email: stringField,
        phone: stringField,
      },
      required: ["fullName"],
    },
    target: {
      type: "object",
      additionalProperties: false,
      properties: {
        desiredRole: stringField,
        industry: stringField,
        seniority: stringField,
        jobType: stringField,
      },
    },
    professionalSummary: stringField,
    experiences: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        properties: {
          id: stringField,
          company: stringField,
          role: stringField,
          startDate: stringField,
          endDate: stringField,
          current: { type: "boolean" },
          responsibilities: { type: "array", items: stringField },
          achievements: { type: "array", items: stringField },
          tools: { type: "array", items: stringField },
        },
        required: ["company", "role"],
      },
    },
    education: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        properties: {
          id: stringField,
          institution: stringField,
          field: stringField,
          degree: stringField,
          status: { type: "string", enum: ["completed", "in_progress", "incomplete"] },
          startDate: stringField,
          endDate: stringField,
          estimatedEndDate: stringField,
        },
        required: ["institution"],
      },
    },
    courses: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        properties: {
          id: stringField,
          name: stringField,
          institution: stringField,
          date: stringField,
          status: stringField,
        },
        required: ["name"],
      },
    },
    certifications: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        properties: {
          id: stringField,
          name: stringField,
          institution: stringField,
          date: stringField,
          credentialId: stringField,
        },
        required: ["name"],
      },
    },
    skills: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        properties: {
          id: stringField,
          name: stringField,
          category: stringField,
        },
        required: ["name"],
      },
    },
    languages: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        properties: {
          id: stringField,
          language: stringField,
          level: { type: "string", enum: ["basico", "intermedio", "avanzado", "bilingue", "nativo"] },
          certification: stringField,
        },
        required: ["language", "level"],
      },
    },
    links: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        properties: {
          id: stringField,
          label: stringField,
          url: stringField,
        },
        required: ["label", "url"],
      },
    },
    missingInformation: { type: "array", items: stringField },
    warnings: { type: "array", items: stringField },
  },
  required: [
    "personal",
    "target",
    "experiences",
    "education",
    "courses",
    "certifications",
    "skills",
    "languages",
    "links",
    "missingInformation",
    "warnings",
  ],
};

export const resumeContentJsonSchema = {
  type: "object",
  additionalProperties: false,
  properties: {
    personal: {
      type: "object",
      additionalProperties: false,
      properties: {
        fullName: stringField,
        city: stringField,
        country: stringField,
        email: stringField,
        phone: stringField,
        photoUrl: stringField,
      },
      required: ["fullName"],
    },
    targetRole: stringField,
    professionalSummary: stringField,
    experiences: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        properties: {
          company: stringField,
          role: stringField,
          period: stringField,
          bullets: { type: "array", items: stringField },
        },
        required: ["company", "role", "period", "bullets"],
      },
    },
    education: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        properties: {
          institution: stringField,
          title: stringField,
          period: stringField,
          detail: stringField,
        },
        required: ["institution", "title"],
      },
    },
    courses: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        properties: {
          name: stringField,
          institution: stringField,
          date: stringField,
        },
        required: ["name"],
      },
    },
    certifications: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        properties: {
          name: stringField,
          institution: stringField,
          date: stringField,
        },
        required: ["name"],
      },
    },
    skills: { type: "array", items: stringField },
    languages: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        properties: {
          language: stringField,
          level: stringField,
        },
        required: ["language", "level"],
      },
    },
    links: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        properties: {
          label: stringField,
          url: stringField,
        },
        required: ["label", "url"],
      },
    },
    missingInformation: { type: "array", items: stringField },
    warnings: { type: "array", items: stringField },
  },
  required: [
    "personal",
    "professionalSummary",
    "experiences",
    "education",
    "courses",
    "certifications",
    "skills",
    "languages",
    "links",
    "missingInformation",
    "warnings",
  ],
};
