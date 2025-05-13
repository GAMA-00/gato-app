// Re-export the toast hook and toast function from the hooks directory
import { useToast as useToastHook } from "@/hooks/use-toast";
export { toast } from "@/hooks/use-toast";
export const useToast = useToastHook;
