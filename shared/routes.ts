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
        email: z.string().email(),
        password: z.string(),
      }),
      responses: {
        200: z.object({
          user: z.object({ id: z.number(), email: z.string() }),
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
          user: z.object({ id: z.number(), email: z.string() }),
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
          errors: z.array(z.string()).optional(),
        }),
        400: errorSchemas.validation,
      },
    },
  },
  students: {
    search: {
      method: 'GET' as const,
      path: '/api/students' as const,
      input: z.object({
        query: z.string(), // Roll number or name
      }).optional(),
      responses: {
        200: z.array(z.any()), // Student list
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
  }
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
