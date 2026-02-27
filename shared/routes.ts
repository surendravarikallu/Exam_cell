import { z } from 'zod';
import { insertAdminSchema, insertStudentSchema, insertSubjectSchema, insertResultSchema } from './schema';

export const errorSchemas = {
  validation: z.object({
    message: z.string(),
    field: z.string().optional(),
  }),
  unauthorized: z.object({
    message: z.string(),
  }),
  notFound: z.object({
    message: z.string(),
  }),
  internal: z.object({
    message: z.string(),
  }),
};

export const api = {
  auth: {
    login: {
      method: 'POST' as const,
      path: '/api/auth/login' as const,
      input: z.object({
        username: z.string(),
        password: z.string(),
      }),
      responses: {
        200: z.object({
          user: z.object({ id: z.number(), username: z.string() }),
          token: z.string(),
        }),
        401: errorSchemas.unauthorized,
      },
    },
    me: {
      method: 'GET' as const,
      path: '/api/auth/me' as const,
      responses: {
        200: z.object({
          user: z.object({ id: z.number(), username: z.string() }),
        }),
        401: errorSchemas.unauthorized,
      },
    },
    logout: {
      method: 'POST' as const,
      path: '/api/auth/logout' as const,
      responses: {
        200: z.object({ message: z.string() }),
      }
    }
  },
  upload: {
    results: {
      method: 'POST' as const,
      path: '/api/upload/results' as const,
      // Input is multipart/form-data
      responses: {
        200: z.object({
          message: z.string(),
          processed: z.number(),
          skipped: z.number(),
          errors: z.array(z.string()).optional(),
        }),
        400: errorSchemas.validation,
      },
    },
    preview: {
      method: 'POST' as const,
      path: '/api/upload/preview' as const,
      // Input is multipart/form-data
      responses: {
        200: z.object({
          totalParsed: z.number(),
          matchedCount: z.number(),
          skippedCount: z.number(),
          previewRows: z.array(z.any()),
        }),
        400: errorSchemas.validation,
      },
    },
    students: {
      method: 'POST' as const,
      path: '/api/upload/students' as const,
      responses: {
        200: z.object({
          message: z.string(),
          processed: z.number(),
          errors: z.array(z.string()).optional(),
        }),
        400: errorSchemas.validation,
      },
    },
    search: {
      method: 'GET' as const,
      path: '/api/students' as const,
      input: z.object({
        query: z.string(), // Roll number or name
      }).optional(),
      responses: {
        200: z.object({
          data: z.array(z.any()),
          total: z.number(),
          page: z.number(),
          totalPages: z.number()
        }),
      },
    },
    get: {
      method: 'GET' as const,
      path: '/api/students/:id' as const,
      responses: {
        200: z.any(), // StudentDetails
        404: errorSchemas.notFound,
      },
    },
  },
  reports: {
    backlog: {
      method: 'GET' as const,
      path: '/api/reports/backlogs' as const,
      input: z.object({
        branch: z.string().optional(),
        semester: z.string().optional(),
        academicYear: z.string().optional(),
      }).optional(),
      responses: {
        200: z.array(z.any()), // Backlog student details
      },
    },
    cumulative: {
      method: 'GET' as const,
      path: '/api/reports/cumulative-backlogs' as const,
      input: z.object({
        branch: z.string().optional(),
        batch: z.string().optional(),
      }).optional(),
      responses: {
        200: z.array(z.any()), // Cumulative backlog student details
      },
    },
    cumulativeResults: {
      method: 'GET' as const,
      path: '/api/reports/cumulative-results' as const,
      input: z.object({
        branch: z.string().optional(),
        batch: z.string().optional(),
        year: z.string().optional(),
      }).optional(),
      responses: {
        200: z.any(), // Summary, Passed List, Failed List
      },
    },
    toppers: {
      method: 'GET' as const,
      path: '/api/reports/toppers' as const,
      input: z.object({
        branch: z.string().optional(),
        batch: z.string().optional(),
        type: z.string(), // "Semester" | "Year"
        semester: z.string().optional(),
        year: z.string().optional(),
        topN: z.number().optional(),
      }).optional(),
      responses: {
        200: z.array(z.any()), // Top students ranking list
      },
    },
    analytics: {
      method: 'GET' as const,
      path: '/api/reports/analytics' as const,
      responses: {
        200: z.object({
          branchWiseBacklogs: z.array(z.object({ name: z.string(), value: z.number() })),
          passPercentage: z.number(),
          mostFailedSubjects: z.array(z.object({ name: z.string(), count: z.number() })),
        }),
      },
    },
  },
  admins: {
    list: {
      method: 'GET' as const,
      path: '/api/admins' as const,
      responses: {
        200: z.array(z.object({ id: z.number(), username: z.string() })),
      },
    },
    create: {
      method: 'POST' as const,
      path: '/api/admins' as const,
      input: z.object({
        username: z.string().min(3),
        password: z.string().min(6),
      }),
      responses: {
        200: z.object({ id: z.number(), username: z.string() }),
        400: errorSchemas.validation,
      },
    },
    update: {
      method: 'PUT' as const,
      path: '/api/admins/:id' as const,
      input: z.object({
        username: z.string().min(3),
        password: z.string().min(6).optional(),
      }),
      responses: {
        200: z.object({ id: z.number(), username: z.string() }),
        400: errorSchemas.validation,
        404: errorSchemas.notFound,
      },
    },
    delete: {
      method: 'DELETE' as const,
      path: '/api/admins/:id' as const,
      responses: {
        200: z.object({ success: z.boolean() }),
        404: errorSchemas.notFound,
      },
    },
  },
};

export function buildUrl(path: string, params?: Record<string, string | number>): string {
  let url = path;
  if (params) {
    Object.entries(params).forEach(([key, value]) => {
      if (url.includes(`:${key}`)) {
        url = url.replace(`:${key}`, String(value));
      }
    });
  }
  return url;
}
