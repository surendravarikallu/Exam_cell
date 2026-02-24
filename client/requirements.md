## Packages
recharts | Beautiful, responsive charts for the analytics dashboard
framer-motion | Smooth animations and page transitions
lucide-react | High-quality icons
clsx | Utility for constructing className strings
tailwind-merge | Utility for merging tailwind classes without style conflicts

## Notes
- API uses JWT authentication. The token is returned on login and stored in localStorage.
- All authenticated API calls must include the header `Authorization: Bearer <token>`.
- File uploads use `multipart/form-data` and must NOT set the `Content-Type` header manually (let the browser set it with the correct boundary).
